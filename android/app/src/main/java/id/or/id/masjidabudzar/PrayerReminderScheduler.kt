package id.or.id.masjidabudzar

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

object PrayerReminderScheduler {
    private val mutex = Mutex()
    private const val REQUEST_ADHAN = 100
    private const val REQUEST_IQAMAH = 300
    private const val REQUEST_SHOW = 24
    private const val REQUEST_WATCHDOG = 500
    private const val MAX_EVENTS = 30
    private const val WATCHDOG_INTERVAL_MS = 5 * 60 * 1000L

    // Watchdog bisa ditunda Doze sampai ~9 menit. Jendela pemulihan dibuat
    // lebih lebar supaya alarm yang terlewat tetap sempat dikirim ulang.
    private const val CATCH_UP_WINDOW_MS = 15 * 60 * 1000L
    private const val FIRE_SETTLE_MS = 5_000L

    private const val KIND_ADHAN = "A"
    private const val KIND_IQAMAH = "I"

    internal data class ScheduledId(
        val raw: String,
        val kind: String,
        val key: String,
        val trigger: Long,
    )

    private fun flags(): Int = PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

    private fun pending(
        context: Context,
        action: String,
        requestCode: Int,
        moment: PrayerMoment? = null,
        scheduledId: String? = null,
    ): PendingIntent {
        val intent = Intent(context, AdhanAlarmReceiver::class.java).apply {
            this.action = action
            if (moment != null) {
                putExtra(ReminderConfig.EXTRA_EVENT_KEY, moment.key)
                putExtra(ReminderConfig.EXTRA_EVENT_LABEL, moment.label)
                putExtra(ReminderConfig.EXTRA_ADHAN_TARGET, moment.adhanTarget)
                putExtra(ReminderConfig.EXTRA_IQAMAH_TARGET, moment.iqamahTarget)
                putExtra(ReminderConfig.EXTRA_IMAM_NAME, moment.imamName)
                putExtra(ReminderConfig.EXTRA_MUADZIN_NAME, moment.muadzinName)
            }
            if (scheduledId != null) {
                putExtra(ReminderConfig.EXTRA_SCHEDULED_ID, scheduledId)
            }
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags())
    }

    private fun watchdogPending(context: Context): PendingIntent {
        val intent = Intent(context, ReminderWatchdogReceiver::class.java).apply {
            action = ReminderConfig.ACTION_WATCHDOG_ALARM
        }
        return PendingIntent.getBroadcast(context, REQUEST_WATCHDOG, intent, flags())
    }

    /** Dipakai saat ikon jam di status bar diketuk, tidak memicu shalat palsu. */
    private fun showIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_tab", "home")
        }
        return PendingIntent.getActivity(context, REQUEST_SHOW, intent, flags())
    }

    internal fun scheduledId(kind: String, key: String, triggerDevice: Long): String =
        "$kind|$key|$triggerDevice"

    internal fun parseScheduledId(raw: String): ScheduledId? {
        val parts = raw.split('|')
        if (parts.size != 3) return null
        val kind = parts[0]
        if (kind != KIND_ADHAN && kind != KIND_IQAMAH) return null
        val trigger = parts[2].toLongOrNull() ?: return null
        return ScheduledId(raw, kind, parts[1], trigger)
    }

    suspend fun scheduleNext(context: Context, repository: PrayerRepository) = mutex.withLock {
        // Pulihkan alarm yang terlewat SEBELUM daftar ID ditulis ulang.
        // Boot, sync, service restart, dan pembukaan aplikasi bisa terjadi lebih
        // cepat dari watchdog berikutnya; tanpa ini ID lama hilang sia-sia.
        recoverMissedLocked(context, repository)
        val prefs = repository.settings.prefsAfterMigration()
        val snapshots = listOfNotNull(
            prefs.todayJson.takeIf { it.isNotBlank() }?.let { ApiParser.parse(it) },
            prefs.tomorrowJson.takeIf { it.isNotBlank() }?.let { ApiParser.parse(it) },
        )
        val moments = snapshots
            .flatMap { PrayerEngine.weeklyMoments(it) }
            .distinctBy { "${it.key}|${it.adhanTime}|${ApiParser.ymd(it.adhanTarget)}" }
            .sortedBy { it.adhanTarget }

        // clockOffset = waktu server - waktu perangkat saat data diambil.
        // Momen dari API memakai waktu server, jadi bandingkan dengan "now"
        // server dan konversi ke waktu perangkat hanya saat memanggil AlarmManager.
        val offset = prefs.clockOffset
        val nowServer = System.currentTimeMillis() + offset
        val upcoming = moments.filter { it.iqamahTarget > nowServer }.take(MAX_EVENTS)

        val manager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            ?: return@withLock

        // Watchdog dijadwalkan ulang tiap siklus. Sengaja memakai alarm inexact
        // yang masih izin saat idle: tidak memakai kuota exact alarm dan tidak
        // menyalakan ikon jam permanen seperti setAlarmClock.
        scheduleWatchdog(manager, context)

        // Batalkan jadwal lama pada rentang request code yang sama, lalu pasang
        // ulang semuanya. Request code yang identik mencegah alarm ganda.
        repeat(MAX_EVENTS) { index ->
            manager.cancel(pending(context, ReminderConfig.ACTION_ADHAN_ALARM, REQUEST_ADHAN + index))
            manager.cancel(pending(context, ReminderConfig.ACTION_IQAMAH_ALARM, REQUEST_IQAMAH + index))
        }

        val show = showIntent(context)
        val scheduledIds = mutableSetOf<String>()
        val enabled = prefs.notificationsEnabled

        if (enabled) {
            var adhanIndex = 0
            var iqamahIndex = 0
            upcoming.forEach { moment ->
                if (moment.adhanTarget > nowServer) {
                    val atDevice = moment.adhanTarget - offset
                    val id = scheduledId(KIND_ADHAN, moment.key, atDevice)
                    setAlarm(
                        manager,
                        atDevice,
                        pending(
                            context,
                            ReminderConfig.ACTION_ADHAN_ALARM,
                            REQUEST_ADHAN + adhanIndex,
                            moment,
                            id,
                        ),
                        show,
                    )
                    scheduledIds += id
                    adhanIndex++
                }
                if (moment.iqamahTarget > nowServer) {
                    val atDevice = moment.iqamahTarget - offset
                    val id = scheduledId(KIND_IQAMAH, moment.key, atDevice)
                    setAlarm(
                        manager,
                        atDevice,
                        pending(
                            context,
                            ReminderConfig.ACTION_IQAMAH_ALARM,
                            REQUEST_IQAMAH + iqamahIndex,
                            moment,
                            id,
                        ),
                        show,
                    )
                    scheduledIds += id
                    iqamahIndex++
                }
            }
        }

        // Disimpan untuk deteksi alarm terlewat oleh watchdog. Saat notifikasi
        // dimatikan, daftar dikosongkan supaya tidak ada pemulihan "shalat palsu".
        ReminderSettings.setScheduledEventIds(context, scheduledIds)
    }

    /**
     * Watchdog memeriksa alarm yang waktunya sudah lewat tetapi belum sempat
     * difire (misalnya karena Doze atau proses sistem dihentikan). ID dihapus
     * oleh receiver begitu alarm terkirim, sehingga yang masih tersisa benar-
     * benar alarm yang terlewat.
     */
    suspend fun recoverMissed(context: Context, repository: PrayerRepository) = mutex.withLock {
        recoverMissedLocked(context, repository)
    }

    /** Dipanggil dari dalam [mutex]; jangan dipanggil langsung tanpa lock. */
    private suspend fun recoverMissedLocked(context: Context, repository: PrayerRepository) {
        val prefs = repository.settings.prefsAfterMigration()
        if (!prefs.notificationsEnabled) return

        val stored = ReminderSettings.getScheduledEventIds(context)
        if (stored.isEmpty()) return

        val nowDevice = System.currentTimeMillis()
        val due = stored.mapNotNull(::parseScheduledId).filter { item ->
            // Beri jeda singkat agar receiver normal sempat menghapus ID lebih
            // dulu. Mencegah watchdog mengirim notifikasi yang sama dua kali.
            item.trigger <= nowDevice - FIRE_SETTLE_MS &&
                nowDevice - item.trigger <= CATCH_UP_WINDOW_MS
        }
        if (due.isEmpty()) return

        val snapshots = listOfNotNull(
            prefs.todayJson.takeIf { it.isNotBlank() }?.let { ApiParser.parse(it) },
            prefs.tomorrowJson.takeIf { it.isNotBlank() }?.let { ApiParser.parse(it) },
        )
        val moments = snapshots.flatMap { PrayerEngine.weeklyMoments(it) }
        val offset = prefs.clockOffset

        due.forEach { item ->
            val action = if (item.kind == KIND_ADHAN) {
                ReminderConfig.ACTION_ADHAN_ALARM
            } else {
                ReminderConfig.ACTION_IQAMAH_ALARM
            }
            val moment = moments.firstOrNull { m ->
                val target = if (item.kind == KIND_ADHAN) m.adhanTarget else m.iqamahTarget
                m.key == item.key && target - offset == item.trigger
            } ?: return@forEach

            runCatching {
                AdhanAlarmReceiver.deliverMissed(
                    context = context,
                    action = action,
                    moment = moment,
                    prefs = prefs,
                    scheduledTriggerDevice = item.trigger,
                )
            }
        }

        ReminderSettings.removeScheduledEventIds(context, due.map { it.raw }.toSet())
    }

    private fun scheduleWatchdog(manager: AlarmManager, context: Context) {
        val operation = watchdogPending(context)
        manager.cancel(operation)
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                manager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + WATCHDOG_INTERVAL_MS,
                    operation,
                )
            } else {
                manager.set(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + WATCHDOG_INTERVAL_MS,
                    operation,
                )
            }
        }
    }

    /**
     * Exact alarm dipakai untuk adzan/iqamah. Bila izin exact belum diberikan,
     * setAlarmClock tetap tepat dan tetap berjalan saat idle.
     */
    private fun setAlarm(
        manager: AlarmManager,
        atDevice: Long,
        operation: PendingIntent,
        showIntent: PendingIntent,
    ) {
        val exactAllowed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            manager.canScheduleExactAlarms()
        } else {
            true
        }
        try {
            if (exactAllowed) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atDevice, operation)
                } else {
                    manager.setExact(AlarmManager.RTC_WAKEUP, atDevice, operation)
                }
            } else {
                manager.setAlarmClock(AlarmManager.AlarmClockInfo(atDevice, showIntent), operation)
            }
        } catch (_: SecurityException) {
            try {
                manager.setAlarmClock(AlarmManager.AlarmClockInfo(atDevice, showIntent), operation)
            } catch (_: SecurityException) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atDevice, operation)
                    } else {
                        manager.set(AlarmManager.RTC_WAKEUP, atDevice, operation)
                    }
                } catch (_: SecurityException) {
                    manager.setWindow(AlarmManager.RTC_WAKEUP, atDevice, 60_000L, operation)
                }
            }
        }
    }
}
