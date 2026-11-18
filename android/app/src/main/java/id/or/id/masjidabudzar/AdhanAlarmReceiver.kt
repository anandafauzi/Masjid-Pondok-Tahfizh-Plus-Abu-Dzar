package id.or.id.masjidabudzar

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

class AdhanAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ReminderConfig.ACTION_ADHAN_ALARM) return

        val event = PrayerEvent.fromIntent(intent) ?: return
        val serviceIntent = Intent(context, PrayerReminderService::class.java)
            .setAction(ReminderConfig.ACTION_PLAY_ADHAN)
            .putExtras(event.toBundle())

        try {
            PrayerReminderLauncher.start(context, serviceIntent)
        } catch (_: Exception) {
            // Android 12+ melarang start foreground service dari alarm inexact.
            // Tetap tampilkan notifikasi adzan walaupun audio tidak bisa diputar.
            showFallbackNotification(context, event)
        }
    }

    private fun showFallbackNotification(context: Context, event: PrayerEvent) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ADHAN_CHANNEL_ID,
                "Pengingat Adzan",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Notifikasi saat adzan dan hitung mundur menuju iqamah."
                setSound(null, null)
                enableVibration(false)
                enableLights(false)
            }
            manager.createNotificationChannel(channel)
        }

        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(ReminderConfig.EXTRA_OPEN_PATH, "/adzan-iqamah")
        }
        val openPendingIntent = PendingIntent.getActivity(
            context,
            event.id.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val petugas = listOfNotNull(
            event.imamName?.let { "Imam: $it" },
            event.muadzinName?.let { "Muadzin: $it" },
        ).joinToString(" • ").ifBlank { "Petugas belum diatur" }

        val notification = NotificationCompat.Builder(context, ADHAN_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_prayer_notification)
            .setContentTitle("🕌 Adzan ${event.label}")
            .setContentText("Iqamah ${event.iqamahTime} · $petugas")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Iqamah ${event.iqamahTime}\n$petugas")
            )
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSound(null)
            .setVibrate(longArrayOf(0))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        try {
            manager.notify(event.id.hashCode() and Int.MAX_VALUE, notification)
        } catch (_: Exception) {
            // Abaikan bila notifikasi tidak bisa ditampilkan.
        }
    }

    private companion object {
        const val ADHAN_CHANNEL_ID = "adhan_alert"
    }
}
