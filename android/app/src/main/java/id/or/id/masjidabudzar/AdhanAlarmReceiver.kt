package id.or.id.masjidabudzar

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.max

class AdhanAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val appContext = context.applicationContext

        if (action == ReminderConfig.ACTION_DISMISS_ALERT) {
            stopAdhan()
            val alertId = intent.getIntExtra(
                ReminderConfig.EXTRA_ALERT_NOTIFICATION_ID,
                ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID,
            )
            runCatching {
                NotificationManagerCompat.from(appContext).cancel(alertId)
            }
            return
        }

        val pending = goAsync()

        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            try {
                val repository = PrayerRepository(appContext)
                val prefs = repository.settings.prefsAfterMigration()
                val scheduledId = intent.getStringExtra(ReminderConfig.EXTRA_SCHEDULED_ID)

                if (!prefs.notificationsEnabled) {
                    NotificationManagerCompat.from(appContext)
                        .cancel(ReminderConfig.notificationId(appContext))
                    appContext.stopService(Intent(appContext, PrayerReminderService::class.java))
                    if (scheduledId != null) {
                        ReminderSettings.removeScheduledEventIds(appContext, setOf(scheduledId))
                    }
                    PrayerReminderScheduler.scheduleNext(appContext, repository)
                    return@launch
                }

                when (action) {
                    ReminderConfig.ACTION_ADHAN_ALARM,
                    ReminderConfig.ACTION_IQAMAH_ALARM,
                    -> {
                        val moment = PrayerMoment(
                            key = intent.getStringExtra(ReminderConfig.EXTRA_EVENT_KEY).orEmpty(),
                            label = intent.getStringExtra(ReminderConfig.EXTRA_EVENT_LABEL)
                                ?.takeIf { it.isNotBlank() } ?: "Shalat",
                            adhanTime = "",
                            iqamahTime = "",
                            adhanTarget = intent.getLongExtra(ReminderConfig.EXTRA_ADHAN_TARGET, 0L),
                            iqamahTarget = intent.getLongExtra(ReminderConfig.EXTRA_IQAMAH_TARGET, 0L),
                            imamName = intent.getStringExtra(ReminderConfig.EXTRA_IMAM_NAME).orEmpty(),
                            muadzinName = intent.getStringExtra(ReminderConfig.EXTRA_MUADZIN_NAME).orEmpty(),
                        )
                        runCatching {
                            deliver(
                                context = appContext,
                                action = action,
                                moment = moment,
                                prefs = prefs,
                                scheduledTriggerDevice = null,
                            )
                        }
                        if (scheduledId != null) {
                            ReminderSettings.removeScheduledEventIds(appContext, setOf(scheduledId))
                        }
                        PrayerReminderScheduler.scheduleNext(appContext, repository)
                    }
                    ReminderConfig.ACTION_REFRESH_REMINDERS ->
                        PrayerReminderScheduler.scheduleNext(appContext, repository)
                }
            } finally {
                pending.finish()
            }
        }
    }

    private fun deliver(
        context: Context,
        action: String,
        moment: PrayerMoment,
        prefs: AppPrefs,
        scheduledTriggerDevice: Long?,
    ) {
        OngoingNotification.createChannels(context)

        val isAdhan = action == ReminderConfig.ACTION_ADHAN_ALARM
        val label = moment.label.takeIf { it.isNotBlank() } ?: "Shalat"
        val alertId = if (isAdhan) {
            ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID
        } else {
            ReminderConfig.IQAMAH_FALLBACK_NOTIFICATION_ID
        }

        // EXTRA_* target memakai waktu server. Tanpa konversi ini timeout adzan
        // ikut bergeser ketika clockOffset != 0 dan bisa menimpa alert iqamah.
        val iqamahDevice = moment.iqamahTarget - prefs.clockOffset
        val timeout = if (isAdhan) {
            max(1_000L, iqamahDevice - System.currentTimeMillis())
        } else {
            10 * 60 * 1000L
        }

        val title = if (isAdhan) "Adzan $label" else "Iqamah $label"
        val text = if (isAdhan) {
            "Waktu shalat telah tiba"
        } else {
            "Segera berdiri untuk shalat berjamaah"
        }
        // Tampilkan alert lebih dulu. Start service bisa memakan waktu dan
        // dilarang di latar pada beberapa versi Android; jangan sampai itu
        // menunda notifikasi yang sudah jatuh tepat pada waktunya.
        showAlert(context, title, text, timeout, alertId)
        PrayerReminderService.start(context)

        if (isAdhan) {
            val lateness = scheduledTriggerDevice?.let { System.currentTimeMillis() - it } ?: 0L
            // Notifikasi tetap tampil bila alarm dipulihkan terlambat, tetapi
            // suara adzan tidak diputar agar tidak terdengar di luar jadwal.
            if (lateness <= MAX_AUDIO_LATENESS_MS) {
                playAdhan(context, prefs, moment.key)
            }
        }
    }

    private fun canPlay(context: Context): Boolean {
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
        if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val manager = context.getSystemService(android.app.NotificationManager::class.java)
            if (manager?.currentInterruptionFilter != android.app.NotificationManager.INTERRUPTION_FILTER_ALL) {
                return false
            }
        }
        return true
    }

    private fun playAdhan(context: Context, prefs: AppPrefs, eventKey: String?) {
        if (!prefs.adhanSoundEnabled || !canPlay(context)) return
        val token = audioDismissGuard.beginPlayback()
        val player = MediaPlayer()

        // MediaPlayer tidak thread-safe: seluruh siklus hidupnya dijalankan
        // pada satu HandlerThread yang memiliki Looper.
        audioHandler.post {
            if (!audioDismissGuard.isCurrent(token)) {
                runCatching { player.release() }
                return@post
            }
            releasePlayer()
            mediaPlayer = player
            runCatching {
                player.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build(),
                )
                player.setVolume(prefs.adhanVolume, prefs.adhanVolume)
                player.setDataSource(
                    "${ReminderConfig.AUDIO_BASE_URL}${audioFileFor(prefs.muadzinId, eventKey)}",
                )
                player.setOnPreparedListener {
                    // Tutup bisa datang saat prepareAsync masih berjalan.
                    // Jangan mulai ulang suara yang sudah dibatalkan.
                    if (!audioDismissGuard.isCurrent(token)) {
                        releaseIfCurrent(player)
                        return@setOnPreparedListener
                    }
                    it.start()
                }
                player.setOnErrorListener { _, _, _ ->
                    releaseIfCurrent(player)
                    true
                }
                player.setOnCompletionListener { releaseIfCurrent(player) }
                player.prepareAsync()
            }.onFailure { releaseIfCurrent(player) }
        }

        audioHandler.postDelayed({
            if (audioDismissGuard.isCurrent(token)) releaseIfCurrent(player)
        }, 5 * 60 * 1000L)
    }

    private fun showAlert(
        context: Context,
        title: String,
        text: String,
        timeoutAfterMs: Long,
        notificationId: Int,
    ) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.POST_NOTIFICATIONS,
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!granted) return
        }
        val dismissIntent = Intent(context, AdhanAlarmReceiver::class.java).apply {
            action = ReminderConfig.ACTION_DISMISS_ALERT
            putExtra(ReminderConfig.EXTRA_ALERT_NOTIFICATION_ID, notificationId)
        }
        val dismissFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            if (notificationId == ReminderConfig.IQAMAH_FALLBACK_NOTIFICATION_ID) 25 else 23,
            dismissIntent,
            dismissFlags,
        )

        val notification = NotificationCompat.Builder(context, ReminderConfig.ADHAN_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_mosque_notification)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            // Suara/vibrasi ditangani oleh MediaPlayer, bukan channel notifikasi.
            // Tanpa ini pengguna mendengar dua adzan bersamaan.
            .setSound(null)
            .setVibrate(longArrayOf(0))
            .setTimeoutAfter(max(1_000L, timeoutAfterMs))
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .addAction(R.drawable.ic_close, "Tutup", dismissPendingIntent)
            // Geser notifikasi juga mematikan suara, bukan sekadar menyembunyikan UI.
            .setDeleteIntent(dismissPendingIntent)
            .build()
        runCatching {
            NotificationManagerCompat.from(context)
                .notify(notificationId, notification)
        }
    }

    companion object {
        private const val MAX_AUDIO_LATENESS_MS = 60_000L

        /** Dipanggil watchdog untuk alarm yang terlewat saat Doze / proses mati. */
        fun deliverMissed(
            context: Context,
            action: String,
            moment: PrayerMoment,
            prefs: AppPrefs,
            scheduledTriggerDevice: Long,
        ) {
            val receiver = AdhanAlarmReceiver()
            receiver.deliver(
                context = context.applicationContext,
                action = action,
                moment = moment,
                prefs = prefs,
                scheduledTriggerDevice = scheduledTriggerDevice,
            )
        }

        private var mediaPlayer: MediaPlayer? = null
        private val audioDismissGuard = AudioGenerationGuard()
        private val audioThread: HandlerThread by lazy {
            HandlerThread("AdhanAudio").apply { start() }
        }
        private val audioHandler: Handler by lazy { Handler(audioThread.looper) }

        /** Batasi nama file ke daftar resmi agar nilai prefs tidak jadi URL bebas. */
        private fun audioFileFor(muadzinId: String, eventKey: String?): String {
            val allowed = setOf(
                "makkah", "madinah", "alaqsa", "turkey",
                "egypt", "indonesia", "fajr-makkah",
            )
            val selected = muadzinId.takeIf { it in allowed } ?: "makkah"
            // Varian khusus Shubuh hanya dipakai untuk adzan Shubuh; untuk shalat
            // lain turun ke versi Makkah biasa seperti di web.
            if (selected == "fajr-makkah" && eventKey != "fajr") return "makkah.mp3"
            return "$selected.mp3"
        }

        @Synchronized
        private fun releasePlayer() {
            mediaPlayer?.release()
            mediaPlayer = null
        }

        private fun releaseIfCurrent(player: MediaPlayer) {
            if (mediaPlayer === player) {
                releasePlayer()
            } else {
                runCatching { player.release() }
            }
        }

        private fun stopAdhan() {
            // Batalkan lebih dulu supaya prepared callback yang sedang antre
            // tidak menyalakan lagi player yang baru saja dilepas.
            audioDismissGuard.dismiss()
            audioHandler.post { releasePlayer() }
        }
    }
}
