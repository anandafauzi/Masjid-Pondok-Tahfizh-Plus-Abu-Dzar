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
    private const val KEY_CLOCK_OFFSET = "server_clock_offset_ms"
    private const val KEY_LAST_GOOD_PETUGAS = "last_good_petugas"

    data class AdzanSettings(
        val soundEnabled: Boolean = true,
        val notificationsEnabled: Boolean = false,
        val selectedMuadzinId: String = "makkah",
        val volume: Float = 0.8f,
    )

    /**
     * Pengaturan lama disimpan di SharedPreferences. Kembalikan null bila use
     * belum pernah mengubahnya supaya nilai default baru tidak tertimpa.
     */
    fun getLegacySettingsForMigration(context: Context): Pair<AdzanSettings, Boolean>? {
        val p = prefs(context)
        val knownKeys = listOf(
            KEY_SOUND_ENABLED,
            KEY_NOTIFICATIONS_ENABLED,
            KEY_MUADZIN_ID,
            KEY_VOLUME,
        )
        if (knownKeys.none { p.contains(it) }) return null
        return getAdzanSettings(context) to p.contains(KEY_NOTIFICATIONS_ENABLED)
    }

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

            // Bridge JS memanggil sync tiap 5 detik; jangan tulis ulang prefs
            // bila tidak ada perubahan.
            if (updated == current) return
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

    fun getClockOffset(context: Context): Long =
        prefs(context).getLong(KEY_CLOCK_OFFSET, 0L)

    fun setClockOffset(context: Context, offsetMs: Long) {
        prefs(context).edit().putLong(KEY_CLOCK_OFFSET, offsetMs).apply()
    }

    /** Nama petugas terakhir yang valid, dipakai saat API sesekali mengirim kosong. */
    fun getLastGoodPetugas(context: Context, eventKey: String): Pair<String?, String?>? {
        val raw = prefs(context).getString(KEY_LAST_GOOD_PETUGAS, null) ?: return null
        val item = try {
            JSONObject(raw).optJSONObject(eventKey)
        } catch (_: Exception) {
            null
        } ?: return null

        val imam = item.optString("imamName").trim().takeIf { it.isNotEmpty() }
        val muadzin = item.optString("muadzinName").trim().takeIf { it.isNotEmpty() }
        return if (imam == null && muadzin == null) null else imam to muadzin
    }

    fun saveLastGoodPetugas(
        context: Context,
        eventKey: String,
        imamName: String?,
        muadzinName: String?,
    ) {
        if (imamName.isNullOrBlank() && muadzinName.isNullOrBlank()) return
        val preferences = prefs(context)
        val root = try {
            JSONObject(preferences.getString(KEY_LAST_GOOD_PETUGAS, null) ?: "{}")
        } catch (_: Exception) {
            JSONObject()
        }
        root.put(
            eventKey,
            JSONObject().apply {
                put("imamName", imamName.orEmpty())
                put("muadzinName", muadzinName.orEmpty())
            },
        )
        preferences.edit().putString(KEY_LAST_GOOD_PETUGAS, root.toString()).apply()
    }

    fun getScheduledEventIds(context: Context): Set<String> =
        prefs(context).getStringSet(KEY_SCHEDULED_IDS, emptySet()) ?: emptySet()

    fun setScheduledEventIds(context: Context, ids: Set<String>) {
        // commit() memastikan pembacaan berikutnya (mis. dari receiver lain)
        // melihat daftar ID terbaru sebelum alarm dijadwalkan ulang.
        prefs(context).edit().putStringSet(KEY_SCHEDULED_IDS, ids).commit()
    }

    fun wasExactAlarmPrompted(context: Context): Boolean =
        prefs(context).getBoolean(KEY_EXACT_ALARM_PROMPTED, false)

    fun markExactAlarmPrompted(context: Context) {
        prefs(context).edit().putBoolean(KEY_EXACT_ALARM_PROMPTED, true).apply()
    }
}
