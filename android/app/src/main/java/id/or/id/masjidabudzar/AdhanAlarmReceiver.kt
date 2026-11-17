package id.or.id.masjidabudzar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AdhanAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ReminderConfig.ACTION_ADHAN_ALARM) return

        val event = PrayerEvent.fromIntent(intent) ?: return
        val serviceIntent = Intent(context, PrayerReminderService::class.java)
            .setAction(ReminderConfig.ACTION_PLAY_ADHAN)
            .putExtras(event.toBundle())
        PrayerReminderLauncher.start(context, serviceIntent)
    }
}
