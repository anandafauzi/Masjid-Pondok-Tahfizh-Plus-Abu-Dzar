package id.or.id.masjidabudzar

import android.content.Context
import android.content.Intent
import android.os.Bundle
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object ReminderConfig {
    const val APP_URL = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app"
    const val TV_DATA_URL = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app/api/public/tv-data"
    const val AUDIO_BASE_URL = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app/audio/adzan/"

    const val ACTION_ADHAN_ALARM = "id.or.id.masjidabudzar.ADHAN_ALARM"
    const val ACTION_REFRESH_REMINDERS = "id.or.id.masjidabudzar.REFRESH_REMINDERS"
    const val ACTION_PLAY_ADHAN = "id.or.id.masjidabudzar.PLAY_ADHAN"
    const val ACTION_REFRESH_DATA = "id.or.id.masjidabudzar.REFRESH_DATA"

    const val EXTRA_EVENT_ID = "event_id"
    const val EXTRA_EVENT_KEY = "event_key"
    const val EXTRA_EVENT_LABEL = "event_label"
    const val EXTRA_ADHAN_TIME = "adhan_time"
    const val EXTRA_IQAMAH_TIME = "iqamah_time"
    const val EXTRA_ADHAN_TARGET = "adhan_target"
    const val EXTRA_IQAMAH_TARGET = "iqamah_target"
    const val EXTRA_IMAM_NAME = "imam_name"
    const val EXTRA_MUADZIN_NAME = "muadzin_name"
    const val EXTRA_DATE = "event_date"
    const val EXTRA_OPEN_PATH = "open_path"
}

data class PrayerEvent(
    val key: String,
    val label: String,
    val adhanTime: String,
    val iqamahTime: String,
    val adhanTarget: Long,
    val iqamahTarget: Long,
    val imamName: String?,
    val muadzinName: String?,
    val date: String,
) {
    val id: String
        get() = "$date|$key"

    fun toBundle(): Bundle = Bundle().apply {
        putString(ReminderConfig.EXTRA_EVENT_ID, id)
        putString(ReminderConfig.EXTRA_EVENT_KEY, key)
        putString(ReminderConfig.EXTRA_EVENT_LABEL, label)
        putString(ReminderConfig.EXTRA_ADHAN_TIME, adhanTime)
        putString(ReminderConfig.EXTRA_IQAMAH_TIME, iqamahTime)
        putLong(ReminderConfig.EXTRA_ADHAN_TARGET, adhanTarget)
        putLong(ReminderConfig.EXTRA_IQAMAH_TARGET, iqamahTarget)
        putString(ReminderConfig.EXTRA_IMAM_NAME, imamName)
        putString(ReminderConfig.EXTRA_MUADZIN_NAME, muadzinName)
        putString(ReminderConfig.EXTRA_DATE, date)
    }

    companion object {
        fun fromIntent(intent: Intent): PrayerEvent? {
            val key = intent.getStringExtra(ReminderConfig.EXTRA_EVENT_KEY) ?: return null
            val date = intent.getStringExtra(ReminderConfig.EXTRA_DATE) ?: return null
            return PrayerEvent(
                key = key,
                label = intent.getStringExtra(ReminderConfig.EXTRA_EVENT_LABEL) ?: key,
                adhanTime = intent.getStringExtra(ReminderConfig.EXTRA_ADHAN_TIME) ?: "",
                iqamahTime = intent.getStringExtra(ReminderConfig.EXTRA_IQAMAH_TIME) ?: "",
                adhanTarget = intent.getLongExtra(ReminderConfig.EXTRA_ADHAN_TARGET, 0L),
                iqamahTarget = intent.getLongExtra(ReminderConfig.EXTRA_IQAMAH_TARGET, 0L),
                imamName = intent.getStringExtra(ReminderConfig.EXTRA_IMAM_NAME),
                muadzinName = intent.getStringExtra(ReminderConfig.EXTRA_MUADZIN_NAME),
                date = date,
            ).takeIf { it.adhanTarget > 0L }
        }
    }
}

data class ActivePrayer(
    val event: PrayerEvent,
    val isAdhanWindow: Boolean,
)

data class ReminderSnapshot(
    val fetchedAt: Long,
    val events: List<PrayerEvent>,
) {
    fun active(now: Long = System.currentTimeMillis()): ActivePrayer? {
        for (event in events) {
            if (now >= event.adhanTarget && now < event.iqamahTarget) {
                return ActivePrayer(event, true)
            }
        }
        for (event in events) {
            if (event.adhanTarget > now) {
                return ActivePrayer(event, false)
            }
        }
        return null
    }

    companion object {
        fun merge(vararg snapshots: ReminderSnapshot?): ReminderSnapshot {
            val byId = LinkedHashMap<String, PrayerEvent>()
            var fetchedAt = 0L
            for (snapshot in snapshots) {
                if (snapshot == null) continue
                fetchedAt = maxOf(fetchedAt, snapshot.fetchedAt)
                snapshot.events.forEach { byId[it.id] = it }
            }
            return ReminderSnapshot(
                fetchedAt = fetchedAt,
                events = byId.values.sortedBy { it.adhanTarget },
            )
        }
    }
}

object PrayerReminderRepository {
    private const val TIMEOUT_CONNECT_MS = 10_000
    private const val TIMEOUT_READ_MS = 15_000

    /**
     * Ambil jadwal hari ini dan besok (WIB) agar notifikasi ongoing tetap punya
     * data petugas setelah shalat terakhir hari ini.
     */
    fun fetch(@Suppress("UNUSED_PARAMETER") context: Context): ReminderSnapshot {
        val now = System.currentTimeMillis()
        val today = wibDate(now)
        val tomorrow = wibDate(now + 24L * 60L * 60L * 1000L)
        return ReminderSnapshot.merge(
            fetchForDate(today),
            fetchForDate(tomorrow),
        )
    }

    private fun fetchForDate(date: String?): ReminderSnapshot? {
        var connection: HttpURLConnection? = null
        return try {
            val endpoint = if (date.isNullOrBlank()) {
                ReminderConfig.TV_DATA_URL
            } else {
                "${ReminderConfig.TV_DATA_URL}?date=$date"
            }
            connection = URL(endpoint).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = TIMEOUT_CONNECT_MS
            connection.readTimeout = TIMEOUT_READ_MS
            connection.setRequestProperty("Accept", "application/json")

            val code = connection.responseCode
            if (code !in 200..299) return null

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val root = JSONObject(body)
            val resolvedDate = date?.takeIf { it.isNotBlank() }
                ?: root.optString("today").ifBlank { wibDate(System.currentTimeMillis()) }
            parseSnapshot(root, resolvedDate)
        } catch (_: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun parseSnapshot(root: JSONObject, date: String): ReminderSnapshot {
        val imamByPrayer = HashMap<String, Pair<String?, String?>>()
        val imamArray = root.optJSONArray("imamToday") ?: JSONArray()
        for (i in 0 until imamArray.length()) {
            val item = imamArray.optJSONObject(i) ?: continue
            val prayer = item.optString("prayerName").trim()
            if (prayer.isEmpty()) continue
            imamByPrayer[prayer] = item.optNullableString("imamName") to
                item.optNullableString("muadzinName")
        }

        val events = ArrayList<PrayerEvent>()
        val eventArray = root.optJSONArray("iqamahEvents") ?: JSONArray()
        for (i in 0 until eventArray.length()) {
            val item = eventArray.optJSONObject(i) ?: continue
            val key = item.optString("key").trim()
            if (key.isEmpty()) continue

            val label = item.optString("label").ifBlank { key }
            val adhan = parseIsoTimestamp(item.optString("adhanTarget")) ?: continue
            val iqamah = parseIsoTimestamp(item.optString("iqamahTarget"))
                ?: (adhan + 10L * 60L * 1000L)
            val petugas = imamByPrayer[label]

            events.add(
                PrayerEvent(
                    key = key,
                    label = label,
                    adhanTime = item.optString("adhanTime"),
                    iqamahTime = item.optString("iqamahTime"),
                    adhanTarget = adhan,
                    iqamahTarget = iqamah,
                    imamName = petugas?.first,
                    muadzinName = petugas?.second,
                    date = date,
                )
            )
        }

        return ReminderSnapshot(
            fetchedAt = parseIsoTimestamp(root.optString("serverTime"))
                ?: System.currentTimeMillis(),
            events = events.sortedBy { it.adhanTarget },
        )
    }

    private fun JSONObject.optNullableString(name: String): String? =
        optString(name).trim().takeIf { it.isNotEmpty() }

    private fun parseIsoTimestamp(value: String?): Long? {
        if (value.isNullOrBlank()) return null
        val patterns = arrayOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
        )
        for (pattern in patterns) {
            try {
                val format = SimpleDateFormat(pattern, Locale.US)
                format.timeZone = TimeZone.getTimeZone("UTC")
                return format.parse(value)?.time
            } catch (_: ParseException) {
                // Coba format berikutnya.
            }
        }
        return null
    }

    private fun wibDate(millis: Long): String {
        val format = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        format.timeZone = TimeZone.getTimeZone("Asia/Jakarta")
        return format.format(Date(millis))
    }
}
