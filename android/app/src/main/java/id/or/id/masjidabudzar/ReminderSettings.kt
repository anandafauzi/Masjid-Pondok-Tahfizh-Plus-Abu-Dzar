package id.or.id.masjidabudzar

import android.content.Context
import org.json.JSONObject

object ReminderSettings {
    private const val PREFS_NAME = "prayer_reminder_prefs"
    private const val KEY_SOUND_ENABLED = "adzan_sound_enabled"
    private const val KEY_NOTIFICATIONS_ENABLED = "adzan_notifications_enabled"
    private const val KEY_MUADZIN_ID = "adzan_selected_muadzin_id"
    private const val KEY_VOLUME = "adzan_volume"
    private const val KEY_SCHEDULED_IDS = "scheduled_event_ids"
    private const val KEY_EXACT_ALARM_PROMPTED = "exact_alarm_prompted"

    data class AdzanSettings(
        val soundEnabled: Boolean = true,
        val notificationsEnabled: Boolean = false,
        val selectedMuadzinId: String = "makkah",
        val volume: Float = 0.8f,
    )

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getAdzanSettings(context: Context): AdzanSettings {
        val p = prefs(context)
        return AdzanSettings(
            soundEnabled = p.getBoolean(KEY_SOUND_ENABLED, true),
            notificationsEnabled = p.getBoolean(KEY_NOTIFICATIONS_ENABLED, false),
            selectedMuadzinId = p.getString(KEY_MUADZIN_ID, "makkah") ?: "makkah",
            volume = p.getFloat(KEY_VOLUME, 0.8f).coerceIn(0f, 1f),
        )
    }

    /** Menyimpan pengaturan adzan yang sudah ada di localStorage WebView. */
    fun saveAdzanSettingsFromJson(context: Context, raw: String) {
        try {
            val json = JSONObject(raw)
            val current = getAdzanSettings(context)
            val updated = AdzanSettings(
                soundEnabled = json.optBoolean("soundEnabled", current.soundEnabled),
                notificationsEnabled = json.optBoolean(
                    "notificationsEnabled",
                    current.notificationsEnabled
                ),
                selectedMuadzinId = json.optString("selectedMuadzinId", current.selectedMuadzinId)
                    .ifBlank { current.selectedMuadzinId },
                volume = json.optDouble("volume", current.volume.toDouble()).toFloat()
                    .coerceIn(0f, 1f),
            )

            prefs(context).edit()
                .putBoolean(KEY_SOUND_ENABLED, updated.soundEnabled)
                .putBoolean(KEY_NOTIFICATIONS_ENABLED, updated.notificationsEnabled)
                .putString(KEY_MUADZIN_ID, updated.selectedMuadzinId)
                .putFloat(KEY_VOLUME, updated.volume)
                .apply()
        } catch (_: Exception) {
            // Abaikan payload yang bukan JSON pengaturan.
        }
    }

    fun getScheduledEventIds(context: Context): Set<String> =
        prefs(context).getStringSet(KEY_SCHEDULED_IDS, emptySet()) ?: emptySet()

    fun setScheduledEventIds(context: Context, ids: Set<String>) {
        prefs(context).edit().putStringSet(KEY_SCHEDULED_IDS, ids).apply()
    }

    fun wasExactAlarmPrompted(context: Context): Boolean =
        prefs(context).getBoolean(KEY_EXACT_ALARM_PROMPTED, false)

    fun markExactAlarmPrompted(context: Context) {
        prefs(context).edit().putBoolean(KEY_EXACT_ALARM_PROMPTED, true).apply()
    }
}
