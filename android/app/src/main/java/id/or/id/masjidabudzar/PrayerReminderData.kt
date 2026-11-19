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

    const val DEFAULT_LOCATION = "Rumpin, Kabupaten Bogor"

    /** ID notifikasi fallback saat foreground service gagal dipulai dari alarm. */
    const val ADHAN_FALLBACK_NOTIFICATION_ID = 1003
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
    /** Waktu lokal saat data diterima. */
    val fetchedAt: Long,
    /** Waktu server yang dikirim API (epoch UTC). */
    val serverTime: Long,
    val events: List<PrayerEvent>,
    /** Lokasi masjid ringkas untuk baris 1 notifikasi. */
    val location: String = ReminderConfig.DEFAULT_LOCATION,
    /** Tanggal Hijriyah untuk baris 1 notifikasi. */
    val hijriDate: String = "",
) {
    /** Selisih jam server terhadap jam perangkat. */
    val clockOffset: Long
        get() = serverTime - fetchedAt

    /** Waktu "sekarang" yang sudah dikoreksi terhadap jam server. */
    fun now(): Long = System.currentTimeMillis() + clockOffset

    fun active(now: Long = now()): ActivePrayer? {
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
            val valid = snapshots.filterNotNull()
            val newest = valid.maxByOrNull { it.fetchedAt }
            for (snapshot in valid) {
                snapshot.events.forEach { byId[it.id] = it }
            }
            return ReminderSnapshot(
                fetchedAt = newest?.fetchedAt ?: System.currentTimeMillis(),
                serverTime = newest?.serverTime ?: System.currentTimeMillis(),
                events = byId.values.sortedBy { it.adhanTarget },
                location = newest?.location?.takeIf { it.isNotBlank() }
                    ?: ReminderConfig.DEFAULT_LOCATION,
                hijriDate = newest?.hijriDate.orEmpty(),
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
    fun fetch(context: Context, clockOffsetMs: Long = 0L): ReminderSnapshot {
        val now = System.currentTimeMillis() + clockOffsetMs
        val today = wibDate(now)
        val tomorrow = wibDate(now + 24L * 60L * 60L * 1000L)
        return ReminderSnapshot.merge(
            fetchForDate(context, today),
            fetchForDate(context, tomorrow),
        )
    }

    private fun fetchForDate(context: Context, date: String?): ReminderSnapshot? {
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
            parseSnapshot(context, root, resolvedDate)
        } catch (_: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun parseSnapshot(
        context: Context,
        root: JSONObject,
        date: String,
    ): ReminderSnapshot {
        val imamByKey = HashMap<String, Pair<String?, String?>>()
        val imamArray = root.optJSONArray("imamToday") ?: JSONArray()
        for (i in 0 until imamArray.length()) {
            val item = imamArray.optJSONObject(i) ?: continue
            val key = canonicalPrayerKey(item.optString("prayerName")) ?: continue
            val imam = cleanName(item.optNullableString("imamName"))
            val muadzin = cleanName(item.optNullableString("muadzinName"))
            if (imam != null || muadzin != null) {
                imamByKey[key] = imam to muadzin
            }
        }

        val events = ArrayList<PrayerEvent>()
        val eventArray = root.optJSONArray("iqamahEvents") ?: JSONArray()
        for (i in 0 until eventArray.length()) {
            val item = eventArray.optJSONObject(i) ?: continue
            val rawKey = item.optString("key").trim()
            val label = item.optString("label").ifBlank { rawKey }
            val key = canonicalPrayerKey(rawKey) ?: canonicalPrayerKey(label) ?: continue

            val adhan = parseIsoTimestamp(item.optString("adhanTarget")) ?: continue
            val iqamah = parseIsoTimestamp(item.optString("iqamahTarget"))
                ?: (adhan + 10L * 60L * 1000L)

            val petugas = imamByKey[key]
            val fallback = ReminderSettings.getLastGoodPetugas(context, key)
            val imam = petugas?.first?.let(::cleanName) ?: fallback?.first?.let(::cleanName)
            val muadzin = petugas?.second?.let(::cleanName)
                ?: fallback?.second?.let(::cleanName)
            if (imam != null || muadzin != null) {
                ReminderSettings.saveLastGoodPetugas(context, key, imam, muadzin)
            }

            events.add(
                PrayerEvent(
                    // Simpan key kanonik agar resolveReciter("fajr-makkah") bekerja
                    // walaupun API mengirim "Subuh"/"Fajr" dengan huruf lain.
                    key = key,
                    label = label,
                    adhanTime = item.optString("adhanTime"),
                    iqamahTime = item.optString("iqamahTime"),
                    adhanTarget = adhan,
                    iqamahTarget = iqamah,
                    imamName = imam,
                    muadzinName = muadzin,
                    date = date,
                )
            )
        }

        val receivedAt = System.currentTimeMillis()
        val serverMs = parseIsoTimestamp(root.optString("serverTime")) ?: receivedAt
        val rawAddress = root.optJSONObject("mosque")?.optNullableString("address")
        return ReminderSnapshot(
            fetchedAt = receivedAt,
            serverTime = serverMs,
            events = events.sortedBy { it.adhanTarget },
            location = shortLocation(rawAddress),
            hijriDate = formatHijriDate(serverMs),
        )
    }

    /** Lokasi ringkas: maksimal dua segmen alamat, mengikuti tampilan web. */
    private fun shortLocation(address: String?): String {
        val source = address?.takeIf { it.isNotBlank() } ?: ReminderConfig.DEFAULT_LOCATION
        return source
            .split(",")
            .take(2)
            .joinToString(", ") { it.trim() }
            .ifBlank { ReminderConfig.DEFAULT_LOCATION }
    }

    /**
     * Format Hijriyah Umm al-Qura dengan locale Indonesia, tanpa suffix "H".
     *
     * Penting: `IslamicCalendar()` tanpa argumen memakai varian *Islamic Civil*
     * yang bisa selisih 1–3 hari dari Kalender Hijriah Kemenag (Umm al-Qura).
     * Web memakai `id-ID-u-ca-islamic-umalqura`, jadi Android harus memakai
     * kalender yang sama supaya tanggal di notifikasi identik dengan web.
     */
    fun formatHijriDate(millis: Long): String {
        return try {
            val zone = android.icu.util.TimeZone.getTimeZone("Asia/Jakarta")
            val locale = Locale("id", "ID")
            val calendar = android.icu.util.IslamicCalendar(zone, locale).apply {
                setCalculationType(
                    android.icu.util.IslamicCalendar.CalculationType.ISLAMIC_UMALQURA,
                )
                setTime(Date(millis))
            }
            val formatter = android.icu.text.DateFormat.getInstanceForSkeleton(
                "d MMMM y",
                locale,
            )
            formatter.calendar = calendar
            formatter.format(Date(millis))
                .replace(Regex("\\s+H$", RegexOption.IGNORE_CASE), "")
                .trim()
        } catch (_: Exception) {
            ""
        }
    }

    /** Samakan "Subuh", "Fajr", "Dzuhur", dll. dengan key iqamahEvents. */
    private fun canonicalPrayerKey(value: String): String? {
        val text = value.trim().lowercase(Locale.ROOT)
        return when {
            text.contains("subuh") || text.contains("fajr") -> "fajr"
            text.contains("zuhur") || text.contains("dzuhur") || text.contains("dhuhr") -> "dhuhr"
            text.contains("asar") || text.contains("ashar") || text.contains("asr") -> "asr"
            text.contains("magrib") || text.contains("maghrib") -> "maghrib"
            text.contains("isya") || text.contains("isha") -> "isha"
            else -> null
        }
    }

    private fun cleanName(value: String?): String? {
        val text = value?.trim().orEmpty()
        if (text.isEmpty()) return null
        return when (text.lowercase(Locale.ROOT)) {
            "-", "--", "n/a", "null", "belum ditentukan", "tidak ditentukan" -> null
            else -> text
        }
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
