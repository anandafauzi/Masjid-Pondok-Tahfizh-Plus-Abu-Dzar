package id.or.id.masjidabudzar

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.MediaPlayer
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max

class PrayerReminderService : Service() {

    private lateinit var notificationManager: NotificationManager
    private lateinit var mediaSession: MediaSession
    private lateinit var tickHandler: Handler

    private var handlerThread: HandlerThread? = null
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val refreshing = AtomicBoolean(false)

    private var snapshot: ReminderSnapshot? = null
    private var currentAdhan: PrayerEvent? = null
    private var adhanSkippedReason: String? = null

    private var mediaPlayer: MediaPlayer? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var audioFocusGranted = false

    private val audioFocusListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS) releaseAudio()
    }

    private val ticker = object : Runnable {
        override fun run() {
            updateNotifications()
            scheduleTicker()
        }
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(NotificationManager::class.java)
        createChannels()

        handlerThread = HandlerThread("prayer-reminder-ticker").also { thread ->
            thread.start()
            tickHandler = Handler(thread.looper)
        }

        mediaSession = MediaSession(this, "MasjidAbuDzarAdzan").apply {
            isActive = true
            setMetadata(
                MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, "Adzan Masjid Abu Dzar")
                    .build()
            )
        }

        updateNotifications()
        scheduleTicker()
        refreshData()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ReminderConfig.ACTION_PLAY_ADHAN -> {
                val event = PrayerEvent.fromIntent(intent)
                if (event != null) playAdhan(event) else refreshData()
            }

            else -> refreshData()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        releaseAudio()
        if (::tickHandler.isInitialized) tickHandler.removeCallbacks(ticker)
        handlerThread?.quitSafely()
        executor.shutdown()
        if (::mediaSession.isInitialized) {
            mediaSession.isActive = false
            mediaSession.release()
        }
        super.onDestroy()
    }

    private fun refreshData() {
        if (!refreshing.compareAndSet(false, true)) return

        executor.execute {
            val fresh = PrayerReminderRepository.fetch(applicationContext)
            mainHandler.post {
                refreshing.set(false)
                if (fresh.events.isNotEmpty()) {
                    snapshot = fresh
                    PrayerReminderScheduler.scheduleFrom(applicationContext, fresh)
                }
                updateNotifications()
                scheduleTicker()
            }
        }
    }

    private fun playAdhan(event: PrayerEvent) {
        currentAdhan = event
        adhanSkippedReason = null
        snapshot = snapshot?.let { current ->
            ReminderSnapshot.merge(
                current,
                ReminderSnapshot(current.fetchedAt, listOf(event)),
            )
        } ?: ReminderSnapshot(System.currentTimeMillis(), listOf(event))

        updateNotifications()
        scheduleTicker()

        val settings = ReminderSettings.getAdzanSettings(this)
        if (!settings.soundEnabled) {
            adhanSkippedReason = "Suara adzan dimatikan di pengaturan."
            updateNotifications()
            return
        }
        if (isSilentOrDnd()) {
            adhanSkippedReason = "HP dalam mode silent/DND — audio dilewati."
            updateNotifications()
            return
        }

        playAdhanAudio(event, settings)
    }

    private fun isSilentOrDnd(): Boolean {
        val audioManager = getSystemService(AudioManager::class.java)
        if (audioManager.ringerMode != AudioManager.RINGER_MODE_NORMAL) return true
        return notificationManager.currentInterruptionFilter !=
            NotificationManager.INTERRUPTION_FILTER_ALL
    }

    private fun playAdhanAudio(
        event: PrayerEvent,
        settings: ReminderSettings.AdzanSettings,
    ) {
        releaseAudio()

        try {
            val player = MediaPlayer(this)
            mediaPlayer = player
            player.setAudioAttributes(adhanAudioAttributes())
            player.setDataSource(
                ReminderConfig.AUDIO_BASE_URL + resolveReciter(event.key, settings.selectedMuadzinId) + ".mp3"
            )
            player.isLooping = false
            val volume = settings.volume.coerceIn(0f, 1f)
            player.setVolume(volume, volume)
            player.setOnPreparedListener { prepared ->
                if (requestAudioFocus()) {
                    prepared.start()
                    setPlaybackState(PlaybackState.STATE_PLAYING)
                } else {
                    adhanSkippedReason = "Audio tidak tersedia saat ini."
                    updateNotifications()
                }
            }
            player.setOnCompletionListener { finishAdhanAudio() }
            player.setOnErrorListener { _, _, _ ->
                adhanSkippedReason = "Gagal memutar audio adzan."
                finishAdhanAudio()
                true
            }
            player.prepareAsync()
        } catch (_: Exception) {
            adhanSkippedReason = "Gagal memutar audio adzan."
            releaseAudio()
            updateNotifications()
        }
    }

    private fun resolveReciter(prayerKey: String, selectedId: String): String {
        val supported = setOf(
            "makkah",
            "madinah",
            "alaqsa",
            "turkey",
            "egypt",
            "indonesia",
            "fajr-makkah",
        )
        val id = selectedId.trim().ifBlank { "makkah" }
        if (id !in supported) return "makkah"
        if (id == "fajr-makkah" && prayerKey != "fajr") return "makkah"
        return id
    }

    private fun adhanAudioAttributes(): AudioAttributes =
        AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()

    private fun requestAudioFocus(): Boolean {
        val audioManager = getSystemService(AudioManager::class.java)
        audioFocusGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(adhanAudioAttributes())
                .setOnAudioFocusChangeListener(audioFocusListener)
                .build()
            audioFocusRequest = request
            audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                audioFocusListener,
                AudioManager.STREAM_ALARM,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
        return audioFocusGranted
    }

    private fun finishAdhanAudio() {
        // Timer iqamah tetap ditampilkan sampai iqamah terlewat.
        releaseAudio()
        updateNotifications()
        scheduleTicker()
    }

    private fun releaseAudio() {
        mediaPlayer?.let { player ->
            try {
                if (player.isPlaying) player.stop()
            } catch (_: IllegalStateException) {
                // Pemutar sudah tidak aktif.
            }
            try {
                player.release()
            } catch (_: Exception) {
                // Abaikan.
            }
        }
        mediaPlayer = null

        if (audioFocusGranted) {
            val audioManager = getSystemService(AudioManager::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest!!)
                } else {
                    @Suppress("DEPRECATION")
                    audioManager.abandonAudioFocus(audioFocusListener)
                }
            } catch (_: Exception) {
                // Abaikan.
            }
            audioFocusGranted = false
        }
        audioFocusRequest = null
        setPlaybackState(PlaybackState.STATE_STOPPED)
    }

    private fun setPlaybackState(state: Int) {
        if (!::mediaSession.isInitialized) return
        mediaSession.setPlaybackState(
            PlaybackState.Builder()
                .setState(state, 0L, 1f)
                .build()
        )
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val ongoing = NotificationChannel(
            ONGOING_CHANNEL_ID,
            "Jadwal Shalat (Selalu Aktif)",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Menampilkan waktu shalat berikutnya dan nama petugas di status bar."
            setSound(null, null)
            enableVibration(false)
        }

        val adhan = NotificationChannel(
            ADHAN_CHANNEL_ID,
            "Pengingat Adzan",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Notifikasi saat adzan dan hitung mundur menuju iqamah."
            setSound(null, null)
            enableVibration(false)
            enableLights(false)
        }

        notificationManager.createNotificationChannel(ongoing)
        notificationManager.createNotificationChannel(adhan)
    }

    private fun updateNotifications() {
        val now = System.currentTimeMillis()
        val active = currentAdhan
        if (active != null && now >= active.iqamahTarget) {
            currentAdhan = null
            adhanSkippedReason = null
            notificationManager.cancel(ADHAN_NOTIFICATION_ID)
        }

        val ongoing = buildOngoingNotification(now)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                ONGOING_NOTIFICATION_ID,
                ongoing,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
            )
        } else {
            startForeground(ONGOING_NOTIFICATION_ID, ongoing)
        }

        currentAdhan?.let { event ->
            notificationManager.notify(ADHAN_NOTIFICATION_ID, buildAdhanNotification(event, now))
        }
    }

    private fun buildOngoingNotification(now: Long): android.app.Notification {
        val active = snapshot?.active(now)
        val title: String
        val body: String

        if (active == null) {
            title = "Jadwal shalat"
            body = "Menunggu jadwal terbaru dari masjid."
        } else if (active.isAdhanWindow) {
            val remain = max(0L, active.event.iqamahTarget - now)
            title = "Adzan ${active.event.label} berkumandang"
            body = "Menuju iqamah ${active.event.iqamahTime} · ${formatDuration(remain)} lagi\n" +
                petugasLine(active.event)
        } else {
            title = "${active.event.label} pukul ${active.event.adhanTime}"
            body = petugasLine(active.event) + "\nIqamah ${active.event.iqamahTime}"
        }

        val refreshIntent = Intent(this, PrayerReminderService::class.java)
            .setAction(ReminderConfig.ACTION_REFRESH_DATA)
        val refreshPendingIntent = PendingIntent.getService(
            this,
            2,
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, ONGOING_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_prayer_notification)
            .setContentTitle(title)
            .setContentText(body.replace("\n", " · "))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(openAppPendingIntent("/"))
            .addAction(android.R.drawable.ic_popup_sync, "Perbarui", refreshPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false)
            .build()
    }

    private fun buildAdhanNotification(
        event: PrayerEvent,
        now: Long,
    ): android.app.Notification {
        val remain = max(0L, event.iqamahTarget - now)
        val body = buildString {
            append("Iqamah ").append(event.iqamahTime).append(" · ")
            append(formatDuration(remain)).append(" lagi")
            adhanSkippedReason?.let { reason ->
                append('\n').append(reason)
            }
            append('\n').append(petugasLine(event))
        }

        return NotificationCompat.Builder(this, ADHAN_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_prayer_notification)
            .setContentTitle(
                if (adhanSkippedReason == null) "🕌 Adzan ${event.label}"
                else "Adzan ${event.label} · notifikasi"
            )
            .setContentText(body.replace("\n", " · "))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(openAppPendingIntent("/adzan-iqamah"))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setSound(null)
            .setVibrate(longArrayOf(0))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun openAppPendingIntent(path: String): PendingIntent {
        val safePath = if (path.startsWith("/")) path else "/$path"
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(ReminderConfig.EXTRA_OPEN_PATH, safePath)
        }
        return PendingIntent.getActivity(
            this,
            safePath.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun petugasLine(event: PrayerEvent): String {
        val imam = event.imamName?.takeIf { it.isNotBlank() }
        val muadzin = event.muadzinName?.takeIf { it.isNotBlank() }
        return when {
            imam != null && muadzin != null -> "Imam: $imam • Muadzin: $muadzin"
            imam != null -> "Imam: $imam"
            muadzin != null -> "Muadzin: $muadzin"
            else -> "Petugas belum diatur"
        }
    }

    private fun formatDuration(millis: Long): String {
        val totalSeconds = max(0L, millis / 1000L)
        val hours = totalSeconds / 3600L
        val minutes = (totalSeconds % 3600L) / 60L
        val seconds = totalSeconds % 60L
        val ss = seconds.toString().padStart(2, '0')
        return when {
            hours > 0 -> "$hours" + "j " + minutes.toString().padStart(2, '0') + "m " + ss + "d"
            else -> "${minutes}m ${ss}d"
        }
    }

    private fun scheduleTicker() {
        if (!::tickHandler.isInitialized) return
        tickHandler.removeCallbacks(ticker)
        val delay = if (currentAdhan != null) 10_000L else 30_000L
        tickHandler.postDelayed(ticker, delay)
    }

    private companion object {
        const val ONGOING_CHANNEL_ID = "prayer_ongoing"
        const val ADHAN_CHANNEL_ID = "adhan_alert"
        const val ONGOING_NOTIFICATION_ID = 1001
        const val ADHAN_NOTIFICATION_ID = 1002
    }
}
