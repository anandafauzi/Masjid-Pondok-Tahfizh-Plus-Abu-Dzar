package id.or.id.masjidabudzar

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat

private const val REQUEST_CODE_REFRESH = 99001

object PrayerReminderLauncher {
    fun start(context: Context, action: String) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

        val intent = Intent(context, PrayerReminderService::class.java).setAction(action)
        start(context, intent)
    }

    fun start(context: Context, intent: Intent) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }
}

object PrayerReminderScheduler {
    fun scheduleFrom(context: Context, snapshot: ReminderSnapshot) {
        if (snapshot.events.isEmpty()) {
            ensureRefreshAlarm(context)
            return
        }

        cancelAll(context)

        val now = snapshot.now()
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val scheduledIds = LinkedHashSet<String>()

        for (event in snapshot.events) {
            if (event.adhanTarget <= now) continue
            scheduledIds.add(event.id)
            alarmManager.setAdhanAlarm(context, event)
        }

        ReminderSettings.setScheduledEventIds(context, scheduledIds)
        alarmManager.setRefreshAlarm(context)
    }

    /** Tetap pasang alarm refresh walau fetch gagal/empty, agar aplikasi bisa pulih sendiri. */
    fun ensureRefreshAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.setRefreshAlarm(context)
    }

    fun cancelAll(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val ids = ReminderSettings.getScheduledEventIds(context)

        ids.forEach { id ->
            alarmManager.cancel(adhanPendingIntent(context, id))
        }
        alarmManager.cancel(refreshPendingIntent(context))
        ReminderSettings.setScheduledEventIds(context, emptySet())
    }

    private fun AlarmManager.setAdhanAlarm(context: Context, event: PrayerEvent) {
        val pendingIntent = adhanPendingIntent(context, event.id, event)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms()) {
            // Fallback bila pengguna belum memberi izin alarms & reminders.
            setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.adhanTarget, pendingIntent)
        } else {
            setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.adhanTarget, pendingIntent)
        }
    }

    private fun AlarmManager.setRefreshAlarm(context: Context) {
        val triggerAt = System.currentTimeMillis() + 15L * 60L * 1000L
        setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            triggerAt,
            AlarmManager.INTERVAL_FIFTEEN_MINUTES,
            refreshPendingIntent(context),
        )
    }

    private fun adhanPendingIntent(
        context: Context,
        eventId: String,
        event: PrayerEvent? = null,
    ): PendingIntent {
        val intent = Intent(ReminderConfig.ACTION_ADHAN_ALARM)
            .setPackage(context.packageName)
            .putExtra(ReminderConfig.EXTRA_EVENT_ID, eventId)
        if (event != null) intent.putExtras(event.toBundle())
        return PendingIntent.getBroadcast(
            context,
            eventId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun refreshPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, ReminderRefreshReceiver::class.java)
            .setAction(ReminderConfig.ACTION_REFRESH_REMINDERS)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE_REFRESH,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
