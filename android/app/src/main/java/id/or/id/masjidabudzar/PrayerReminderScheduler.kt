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

    private fun flags(): Int = PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

    private fun pending(
        context: Context,
        action: String,
        requestCode: Int,
        moment: PrayerMoment? = null,
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

    suspend fun scheduleNext(context: Context, repository: PrayerRepository) = mutex.withLock {
        val prefs = repository.settings.prefsAfterMigration()
        val snapshots = listOfNotNull(
            prefs.todayJson.takeIf { it.isNotBlank() }?.let { ApiParser.parse(it) },
            prefs.tomorrowJson.takeIf { it.isNotBlank() }?.let { ApiParser.parse(it) },
        )
        val moments = snapshots
            .flatMap { PrayerEngine.weeklyMoments(it) }
            .distinctBy { "${it.key}|${it.adhanTime}|${ApiParser.ymd(it.adhanTarget)}" }
            .sortedBy { it.adhanTarget }

        val offset = prefs.clockOffset
        val now = System.currentTimeMillis() + offset
        val upcoming = moments.filter { it.iqamahTarget > now }.take(MAX_EVENTS)

        val manager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return@withLock

        // Batalkan jadwal lama pada rentang request code yang sama.
        repeat(MAX_EVENTS) { index ->
            manager.cancel(pending(context, ReminderConfig.ACTION_ADHAN_ALARM, REQUEST_ADHAN + index))
            manager.cancel(pending(context, ReminderConfig.ACTION_IQAMAH_ALARM, REQUEST_IQAMAH + index))
        }

        // Watchdog tetap dijadwalkan walau notifikasi mati, supaya bisa mendeteksi
        // saat pengguna mengaktifkannya kembali tanpa membuka aplikasi.
        val show = showIntent(context)
        manager.cancel(watchdogPending(context))
        setAlarm(
            manager,
            System.currentTimeMillis() + WATCHDOG_INTERVAL_MS,
            watchdogPending(context),
            show,
        )

        if (!prefs.notificationsEnabled) return@withLock

        // AlarmManager memakai RTC perangkat, sedangkan target API memakai waktu server.
        upcoming.forEachIndexed { index, moment ->
            if (moment.adhanTarget > now) {
                setAlarm(
                    manager,
                    moment.adhanTarget - offset,
                    pending(context, ReminderConfig.ACTION_ADHAN_ALARM, REQUEST_ADHAN + index, moment),
                    show,
                )
            }
            if (moment.iqamahTarget > now) {
                setAlarm(
                    manager,
                    moment.iqamahTarget - offset,
                    pending(context, ReminderConfig.ACTION_IQAMAH_ALARM, REQUEST_IQAMAH + index, moment),
                    show,
                )
            }
        }
    }

    /**
     * Pakai exact alarm bila diizinkan. Bila belum, setAlarmClock tetap tepat dan
     * tidak ditunda Doze tanpa perlu membuka aplikasi lebih dulu.
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
                manager.setWindow(AlarmManager.RTC_WAKEUP, atDevice, 60_000L, operation)
            }
        }
    }
}
