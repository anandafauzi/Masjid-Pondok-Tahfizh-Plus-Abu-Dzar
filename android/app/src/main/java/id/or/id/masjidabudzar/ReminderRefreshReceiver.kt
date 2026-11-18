package id.or.id.masjidabudzar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Refresh jadwal tanpa menyalakan foreground service dari broadcast inexact.
 * Alarm yang sudah lewat tetap dipertahankan bila fetch gagal.
 */
class ReminderRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ReminderConfig.ACTION_REFRESH_REMINDERS) return

        val pendingResult = goAsync()
        Thread {
            try {
                val snapshot = PrayerReminderRepository.fetch(
                    context.applicationContext,
                    ReminderSettings.getClockOffset(context),
                )
                ReminderSettings.setClockOffset(context, snapshot.clockOffset)
                if (snapshot.events.isNotEmpty()) {
                    PrayerReminderScheduler.scheduleFrom(context.applicationContext, snapshot)
                } else {
                    PrayerReminderScheduler.ensureRefreshAlarm(context.applicationContext)
                }
            } catch (_: Exception) {
                PrayerReminderScheduler.ensureRefreshAlarm(context.applicationContext)
            } finally {
                pendingResult.finish()
            }
        }.start()
    }
}
