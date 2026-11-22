package id.or.id.masjidabudzar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Dijalankan tiap beberapa menit oleh AlarmManager. Tugasnya menghidupkan
 * kembali foreground service yang mati, menyusun ulang alarm shalat, dan
 * mencoba menyegarkan data tanpa menunggu pengguna membuka aplikasi.
 */
class ReminderWatchdogReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ReminderConfig.ACTION_WATCHDOG_ALARM) return
        val appContext = context.applicationContext
        val pending = goAsync()

        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            try {
                val repository = PrayerRepository(appContext)
                val prefs = repository.settings.prefsAfterMigration()

                if (prefs.notificationsEnabled) {
                    OngoingNotification.createChannels(appContext)
                    PrayerReminderService.start(appContext)
                }

                // Pulihkan dulu alarm yang terlewat saat Doze/proses mati.
                // Karena scheduleNext menulis ulang daftar ID, urutannya penting.
                PrayerReminderScheduler.recoverMissed(appContext, repository)
                // scheduleNext juga menjadwalkan watchdog berikutnya.
                PrayerReminderScheduler.scheduleNext(appContext, repository)
                SyncWorker.enqueueNow(appContext)
            } finally {
                pending.finish()
            }
        }
    }
}
