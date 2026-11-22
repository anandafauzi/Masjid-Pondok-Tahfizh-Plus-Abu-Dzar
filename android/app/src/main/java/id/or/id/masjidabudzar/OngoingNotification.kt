package id.or.id.masjidabudzar

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat

object OngoingNotification {
    private const val GROUP = "id.or.id.masjidabudzar.PRAYER"

    private data class NotificationPalette(
        val primary: Int,
        val secondary: Int,
        val accent: Int,
        val urgent: Int,
    )

    /**
     * Warna teks notifikasi diambil dari mode tema sistem saat RemoteViews dibuat.
     * Sengaja tidak memakai atribut `?android:attr/...` di XML karena versi sebelumnya
     * memicu crash saat SystemUI meng-inflate layout RemoteViews.
     */
    private fun notificationPalette(context: Context): NotificationPalette {
        val dark = context.resources.configuration.uiMode and
            Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        return if (dark) {
            NotificationPalette(
                primary = Color.parseColor("#F7F3EA"),
                secondary = Color.parseColor("#C9D6CD"),
                accent = Color.parseColor("#E7D09A"),
                urgent = Color.parseColor("#FF8A80"),
            )
        } else {
            NotificationPalette(
                primary = Color.parseColor("#14231D"),
                secondary = Color.parseColor("#52645A"),
                accent = Color.parseColor("#8A6E33"),
                urgent = Color.parseColor("#C8453B"),
            )
        }
    }

    fun createChannels(context: Context) {
        ReminderConfig.cancelStaleNotifications(context)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        val ongoing = NotificationChannel(
            ReminderConfig.CHANNEL_ID,
            "Jadwal Shalat Berjalan",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Countdown adzan dan iqamah Masjid Abu Dzar"
            setSound(null, null)
            enableVibration(false)
            setShowBadge(false)
        }

        val adhan = NotificationChannel(
            ReminderConfig.ADHAN_CHANNEL_ID,
            "Pengingat Adzan",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Pengingat waktu shalat dan iqamah"
            // Adzan diputar aplikasi lewat MediaPlayer yang mengikuti pengaturan
            // suara/volume pengguna. Channel harus tetap senyap agar tidak dobel.
            setSound(null, null)
            enableVibration(false)
            enableLights(false)
        }

        manager.createNotificationChannel(ongoing)
        manager.createNotificationChannel(adhan)
    }

    private fun openIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_tab", "home")
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        return PendingIntent.getActivity(context, 21, intent, flags)
    }

    private fun dateLine(state: CountdownState?): String {
        if (state == null) return "Menyiapkan data…"
        val parts = state.gregorian.split(", ")
        val weekday = parts.getOrNull(0).orEmpty()
        val dayMonth = parts.getOrNull(1)
            ?.split(" ")
            ?.take(2)
            ?.joinToString(" ") { if (it.length > 3) it.take(3) else it }
            .orEmpty()
        val shortDate = listOf(weekday, dayMonth)
            .filter { it.isNotBlank() }
            .joinToString(", ")
        return listOf(shortDate, state.hijri)
            .filter { it.isNotBlank() }
            .joinToString(" · ")
    }

    fun build(context: Context, state: CountdownState?): Notification {
        val line1 = dateLine(state)
        val label = state?.prayerLabel ?: "Jadwal"
        val time = state?.displayTime ?: "--:--"
        val countdown = state?.countdown ?: "--:--:--"
        val staff = if (state == null) {
            "Imam: - | Muadzin: -"
        } else {
            "Imam: ${state.imamName} | Muadzin: ${state.muadzinName}"
        }
        val urgent = state?.isUrgent == true
        val palette = notificationPalette(context)
        val countdownColor = if (urgent) palette.urgent else palette.accent

        val compact = RemoteViews(context.packageName, R.layout.notification_compact).apply {
            setTextViewText(R.id.notif_line1, line1)
            setTextViewText(R.id.notif_prayer, "$label :")
            setTextViewText(R.id.notif_time, "$time |")
            setTextViewText(R.id.notif_countdown, countdown)
            setTextViewText(R.id.notif_staff, staff)
            setInt(R.id.notif_compact_root, "setBackgroundColor", Color.TRANSPARENT)
            setInt(R.id.notif_line1, "setTextColor", palette.secondary)
            setInt(R.id.notif_prayer, "setTextColor", palette.primary)
            setInt(R.id.notif_time, "setTextColor", palette.primary)
            setInt(R.id.notif_countdown, "setTextColor", countdownColor)
            setInt(R.id.notif_countdown, "setBackgroundColor", Color.TRANSPARENT)
            setInt(R.id.notif_staff, "setTextColor", palette.secondary)
        }

        val expanded = RemoteViews(context.packageName, R.layout.notification_expanded).apply {
            setTextViewText(R.id.notif_line1, line1)
            setTextViewText(R.id.notif_prayer, "$label :")
            setTextViewText(R.id.notif_time, "$time |")
            setTextViewText(R.id.notif_countdown, countdown)
            setTextViewText(R.id.notif_staff, staff)
            setInt(R.id.notif_expanded_root, "setBackgroundColor", Color.TRANSPARENT)
            setInt(R.id.notif_line1, "setTextColor", palette.secondary)
            setInt(R.id.notif_prayer, "setTextColor", palette.primary)
            setInt(R.id.notif_time, "setTextColor", palette.primary)
            setInt(R.id.notif_countdown, "setTextColor", countdownColor)
            setInt(R.id.notif_countdown, "setBackgroundColor", Color.TRANSPARENT)
            setInt(R.id.notif_staff, "setTextColor", palette.secondary)
            setTextViewText(R.id.notif_action_open, context.getString(R.string.notif_action_open))
            setInt(R.id.notif_action_open, "setTextColor", palette.primary)
            setInt(R.id.notif_action_open, "setBackgroundColor", Color.TRANSPARENT)
            setOnClickPendingIntent(R.id.notif_action_open, openIntent(context))
        }

        return NotificationCompat.Builder(context, ReminderConfig.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_mosque_notification)
            .setContentTitle("Jadwal Shalat")
            .setContentText(state?.infoLine ?: "Menyiapkan jadwal shalat")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openIntent(context))
            .setCustomContentView(compact)
            .setCustomBigContentView(expanded)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setGroup(GROUP)
            .build()
    }

    fun show(context: Context, state: CountdownState?) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.notify(ReminderConfig.notificationId(context), build(context, state))
    }
}
