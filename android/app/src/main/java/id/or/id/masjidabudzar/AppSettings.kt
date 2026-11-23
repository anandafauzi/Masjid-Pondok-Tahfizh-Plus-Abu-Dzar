package id.or.id.masjidabudzar

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.abuDzarDataStore by preferencesDataStore(name = "masjid_abu_dzar_v2")

data class AppPrefs(
    val hijriCorrection: Int = 0,
    val notificationsEnabled: Boolean = true,
    val todayJson: String = "",
    val tomorrowJson: String = "",
    val donationJson: String = "",
    val fetchedAt: Long = 0L,
    val clockOffset: Long = 0L,
    val adhanSoundEnabled: Boolean = true,
    val adhanVolume: Float = 0.8f,
    val muadzinId: String = "makkah",
)

class AppSettings(private val context: Context) {
    companion object {
        private val KEY_HIJRI = intPreferencesKey("hijri_correction")
        private val KEY_NOTIFICATIONS = booleanPreferencesKey("notifications_enabled")
        private val KEY_TODAY = stringPreferencesKey("today_json")
        private val KEY_TOMORROW = stringPreferencesKey("tomorrow_json")
        private val KEY_DONATION = stringPreferencesKey("donation_json")
        private val KEY_FETCHED = longPreferencesKey("fetched_at")
        private val KEY_OFFSET = longPreferencesKey("clock_offset")
        private val KEY_ADZAN_SOUND = booleanPreferencesKey("adzan_sound_enabled")
        private val KEY_ADZAN_VOLUME = floatPreferencesKey("adzan_volume")
        private val KEY_MUADZIN_ID = stringPreferencesKey("muadzin_id")
        private val KEY_LEGACY_MIGRATED = booleanPreferencesKey("legacy_reminder_settings_migrated")
    }

    val prefs: Flow<AppPrefs> = context.abuDzarDataStore.data.map { p ->
        AppPrefs(
            hijriCorrection = (p[KEY_HIJRI] ?: 0).coerceIn(-1, 1),
            notificationsEnabled = p[KEY_NOTIFICATIONS] ?: true,
            todayJson = p[KEY_TODAY] ?: "",
            tomorrowJson = p[KEY_TOMORROW] ?: "",
            donationJson = p[KEY_DONATION] ?: "",
            fetchedAt = p[KEY_FETCHED] ?: 0L,
            clockOffset = p[KEY_OFFSET] ?: 0L,
            adhanSoundEnabled = p[KEY_ADZAN_SOUND] ?: true,
            adhanVolume = (p[KEY_ADZAN_VOLUME] ?: 0.8f).coerceIn(0f, 1f),
            muadzinId = p[KEY_MUADZIN_ID]?.takeIf { it.isNotBlank() } ?: "makkah",
        )
    }

    /**
     * Sekali pakai: pindahkan pengaturan adzan dari SharedPreferences lama ke
     * DataStore. Hanya menulis kunci yang memang belum ada agar perubahan baru
     * pengguna tidak tertimpa.
     */
    suspend fun migrateLegacySettings() {
        val legacy = ReminderSettings.getLegacySettingsForMigration(context) ?: return
        context.abuDzarDataStore.edit { p ->
            if (p[KEY_LEGACY_MIGRATED] == true) return@edit
            p[KEY_ADZAN_SOUND] = p[KEY_ADZAN_SOUND] ?: legacy.first.soundEnabled
            p[KEY_ADZAN_VOLUME] = p[KEY_ADZAN_VOLUME] ?: legacy.first.volume
            p[KEY_MUADZIN_ID] = p[KEY_MUADZIN_ID] ?: legacy.first.selectedMuadzinId
            if (legacy.second) {
                p[KEY_NOTIFICATIONS] = p[KEY_NOTIFICATIONS] ?: legacy.first.notificationsEnabled
            }
            p[KEY_LEGACY_MIGRATED] = true
        }
    }

    /** Bacaan settings yang selalu melalui migrasi, dipakai oleh receiver/service. */
    suspend fun prefsAfterMigration(): AppPrefs {
        migrateLegacySettings()
        return prefs.first()
    }

    suspend fun setAdhanSoundEnabled(value: Boolean) {
        context.abuDzarDataStore.edit { it[KEY_ADZAN_SOUND] = value }
    }

    suspend fun setAdhanVolume(value: Float) {
        context.abuDzarDataStore.edit { it[KEY_ADZAN_VOLUME] = value.coerceIn(0f, 1f) }
    }

    suspend fun setMuadzinId(value: String) {
        context.abuDzarDataStore.edit { it[KEY_MUADZIN_ID] = value }
    }

    suspend fun setHijriCorrection(value: Int) {
        context.abuDzarDataStore.edit { it[KEY_HIJRI] = value.coerceIn(-1, 1) }
    }

    suspend fun setNotificationsEnabled(value: Boolean) {
        context.abuDzarDataStore.edit { it[KEY_NOTIFICATIONS] = value }
    }

    suspend fun saveSnapshot(
        todayJson: String,
        tomorrowJson: String,
        fetchedAt: Long,
        clockOffset: Long,
    ) {
        context.abuDzarDataStore.edit { p ->
            p[KEY_TODAY] = todayJson
            p[KEY_TOMORROW] = tomorrowJson
            p[KEY_FETCHED] = fetchedAt
            p[KEY_OFFSET] = clockOffset
        }
    }

    /** Donasi punya endpoint sendiri; gagal fetch tidak boleh menghapus snapshot lama. */
    suspend fun saveDonationSnapshot(donationJson: String) {
        context.abuDzarDataStore.edit { it[KEY_DONATION] = donationJson }
    }
}
