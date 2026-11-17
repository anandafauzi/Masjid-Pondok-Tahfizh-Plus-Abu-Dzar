package id.or.id.masjidabudzar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val shouldRefresh = when (intent.action) {
            ReminderConfig.ACTION_REFRESH_REMINDERS,
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> true

            else -> false
        }

        if (shouldRefresh) {
            PrayerReminderLauncher.start(context, ReminderConfig.ACTION_REFRESH_DATA)
        }
    }
}
