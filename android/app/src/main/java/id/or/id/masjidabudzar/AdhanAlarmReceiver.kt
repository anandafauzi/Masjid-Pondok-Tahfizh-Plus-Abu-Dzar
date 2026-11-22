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
            runCatching {
                NotificationManagerCompat.from(appContext)
                    .cancel(ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID)
            }
            return
        }

        val pending = goAsync()

        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            try {
                val repository = PrayerRepository(appContext)
                val prefs = repository.settings.prefsAfterMigration()

                if (!prefs.notificationsEnabled) {
                    NotificationManagerCompat.from(appContext)
                        .cancel(ReminderConfig.notificationId(appContext))
                    appContext.stopService(Intent(appContext, PrayerReminderService::class.java))
                    PrayerReminderScheduler.scheduleNext(appContext, repository)
                    return@launch
                }

                OngoingNotification.createChannels(appContext)
                PrayerReminderService.start(appContext)

                val iqamahTarget = intent.getLongExtra(ReminderConfig.EXTRA_IQAMAH_TARGET, 0L)
                when (action) {
                    ReminderConfig.ACTION_ADHAN_ALARM -> {
                        val label = intent.getStringExtra(ReminderConfig.EXTRA_EVENT_LABEL) ?: "Shalat"
                        val timeout = if (iqamahTarget > 0L) {
                            max(1_000L, iqamahTarget - System.currentTimeMillis() + 60_000L)
                        } else {
                            10 * 60 * 1000L
                        }
                        showAlert(appContext, "Adzan $label", "Waktu shalat telah tiba", timeout)
                        playAdhan(appContext, prefs, intent.getStringExtra(ReminderConfig.EXTRA_EVENT_KEY))
                        PrayerReminderScheduler.scheduleNext(appContext, repository)
                    }
                    ReminderConfig.ACTION_IQAMAH_ALARM -> {
                        val label = intent.getStringExtra(ReminderConfig.EXTRA_EVENT_LABEL) ?: "Shalat"
                        showAlert(
                            appContext,
                            "Iqamah $label",
                            "Segera berdiri untuk shalat berjamaah",
                            10 * 60 * 1000L,
                        )
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
        val player = MediaPlayer()

        // MediaPlayer tidak thread-safe: seluruh siklus hidupnya dijalankan
        // pada satu HandlerThread yang memiliki Looper.
        audioHandler.post {
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
                player.setOnPreparedListener { it.start() }
                player.setOnErrorListener { _, _, _ ->
                    releasePlayer()
                    true
                }
                player.setOnCompletionListener { releasePlayer() }
                player.prepareAsync()
            }.onFailure { releasePlayer() }
        }

        audioHandler.postDelayed({
            if (mediaPlayer === player) releasePlayer()
        }, 5 * 60 * 1000L)
    }

    private fun showAlert(context: Context, title: String, text: String, timeoutAfterMs: Long) {
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
        }
        val dismissFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            23,
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
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .addAction(R.drawable.ic_close, "Tutup", dismissPendingIntent)
            .build()
        runCatching {
            NotificationManagerCompat.from(context)
                .notify(ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID, notification)
        }
    }

    companion object {
        private var mediaPlayer: MediaPlayer? = null
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
            // Varian khusus Subuh hanya dipakai untuk adzan Subuh; untuk shalat
            // lain turun ke versi Makkah biasa seperti di web.
            if (selected == "fajr-makkah" && eventKey != "fajr") return "makkah.mp3"
            return "$selected.mp3"
        }

        @Synchronized
        private fun releasePlayer() {
            mediaPlayer?.release()
            mediaPlayer = null
        }

        private fun stopAdhan() {
            audioHandler.post { releasePlayer() }
        }
    }
}
