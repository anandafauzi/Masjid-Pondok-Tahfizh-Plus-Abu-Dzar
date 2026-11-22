package id.or.id.masjidabudzar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ReminderBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action !in RESTORE_ACTIONS) return

        val appContext = context.applicationContext
        OngoingNotification.createChannels(appContext)

        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            try {
                val repository = PrayerRepository(appContext)
                val prefs = repository.settings.prefsAfterMigration()

                // Jangan nyalakan FGS saat notifikasi aplikasi dimatikan:
                // notifikasi "Menyiapkan data…" akan berkedip setelah reboot.
                if (prefs.notificationsEnabled) {
                    PrayerReminderService.start(appContext)
                }
                PrayerReminderScheduler.scheduleNext(appContext, repository)
                SyncWorker.enqueueNow(appContext)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private val RESTORE_ACTIONS = setOf(
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.TIME_SET",
            Intent.ACTION_DATE_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
        )
    }
}
