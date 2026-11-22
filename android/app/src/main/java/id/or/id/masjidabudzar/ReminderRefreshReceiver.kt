package id.or.id.masjidabudzar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ReminderRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            try {
                val repository = PrayerRepository(context)
                PrayerReminderScheduler.scheduleNext(context, repository)
                SyncWorker.enqueueNow(context)
                PrayerReminderService.start(context)
            } finally {
                pending.finish()
            }
        }
    }
}
