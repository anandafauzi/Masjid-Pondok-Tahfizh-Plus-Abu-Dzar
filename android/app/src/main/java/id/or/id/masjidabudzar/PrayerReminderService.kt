package id.or.id.masjidabudzar

import android.Manifest
import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

class PrayerReminderService : Service() {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.Main.immediate + job)
    private lateinit var repository: PrayerRepository

    override fun onCreate() {
        super.onCreate()
        if (!notificationsGranted(this)) {
            stopSelf()
            return
        }
        OngoingNotification.createChannels(this)
        repository = PrayerRepository(this)

        // Penjelasan singkat: startForegroundService bisa dipanggil oleh watchdog,
        // WorkManager, atau alarm sebelum preferensi pengguna diperiksa. Hentikan
        // service lebih awal bila notifikasi aplikasi sedang dimatikan agar
        // notifikasi "Menyiapkan data…" tidak berkedip.
        if (!remindersEnabled()) {
            stopSelf()
            return
        }

        // Tanpa foreground notification yang valid, service bisa dibunuh
        // sistem kapan saja. Jangan lanjutkan kerja diam-diam.
        if (!startAsForeground(OngoingNotification.build(this, null))) {
            stopSelf()
            return
        }

        scope.launch {
            repository.bundle.collectLatest { bundle ->
                if (!bundle.notificationsEnabled) {
                    stopAsForeground()
                    stopSelf()
                    return@collectLatest
                }

                while (isActive) {
                    val state = withContext(Dispatchers.Default) {
                        PrayerEngine.state(
                            snapshots = bundle.snapshots,
                            now = bundle.now(),
                            correction = bundle.hijriCorrection,
                            offline = bundle.offline,
                        )
                    }
                    runCatching {
                        OngoingNotification.show(this@PrayerReminderService, state)
                    }
                    delay(1_000L)
                }
            }
        }

        scope.launch {
            while (isActive) {
                if (repository.settings.prefsAfterMigration().notificationsEnabled) {
                    repository.refresh()
                }
                delay(15L * 60 * 1000)
            }
        }

        scope.launch {
            PrayerReminderScheduler.scheduleNext(this@PrayerReminderService, repository)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        OngoingNotification.createChannels(this)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // Saat aplikasi diusap dari recents, Android bisa menghentikan service.
        // Nyalakan lagi segera dan susun ulang alarm.
        if (notificationsGranted(this) && remindersEnabled()) {
            start(this)
            scope.launch { PrayerReminderScheduler.scheduleNext(this@PrayerReminderService, repository) }
        }
    }

    override fun onDestroy() {
        job.cancel()
        super.onDestroy()
    }

    private fun startAsForeground(notification: Notification): Boolean = runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(
                this,
                ReminderConfig.notificationId(this),
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
            )
        } else {
            startForeground(ReminderConfig.notificationId(this), notification)
        }
        true
    }.getOrElse { error ->
        Log.e(TAG, "Gagal menjalankan service sebagai foreground", error)
        false
    }

    private fun stopAsForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    /**
     * DataStore hanya bisa dibaca suspend, sedangkan pengecekan ini harus
     * selesai sebelum startForeground. Fallback ke `true` bila bacaan gagal
     * supaya pengingat tidak mati karena masalah I/O sesaat.
     */
    private fun remindersEnabled(): Boolean = runCatching {
        runBlocking(Dispatchers.IO) {
            withTimeoutOrNull(1_500L) {
                repository.settings.prefsAfterMigration().notificationsEnabled
            } ?: true
        }
    }.getOrDefault(true)

    companion object {
        private const val TAG = "PrayerReminderService"

        private fun notificationsGranted(context: Context): Boolean {
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        }

        fun start(context: Context) {
            if (!notificationsGranted(context)) return
            val intent = Intent(context.applicationContext, PrayerReminderService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.applicationContext.startForegroundService(intent)
                } else {
                    context.applicationContext.startService(intent)
                }
            } catch (_: IllegalStateException) {
                // Android 12+ melarang start foreground service dari background.
                // WorkManager/alarm akan mencoba lagi saat aplikasi dibuka.
            } catch (_: SecurityException) {
                // Izin notifikasi bisa dicabut kapan saja.
            }
        }
    }
}
