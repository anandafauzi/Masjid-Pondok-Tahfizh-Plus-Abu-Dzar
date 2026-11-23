package id.or.id.masjidabudzar

import android.content.Context
import android.icu.util.IslamicCalendar
import android.icu.util.TimeZone as IcuTimeZone
import androidx.core.app.NotificationManagerCompat
import com.google.gson.Gson
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

object ReminderConfig {
    const val APP_URL = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app"
    const val TV_DATA_URL = "$APP_URL/api/public/tv-data"
    // Endpoint donasi sengaja dipisah dari TV_DATA_URL agar layar TV tidak
    // pernah menerima data rekening/QR.
    const val DONATION_INFO_URL = "$APP_URL/api/public/donation-info"
    const val AUDIO_BASE_URL = "$APP_URL/audio/adzan/"

    const val ACTION_ADHAN_ALARM = "id.or.id.masjidabudzar.ADHAN_ALARM"
    const val ACTION_IQAMAH_ALARM = "id.or.id.masjidabudzar.IQAMAH_ALARM"
    const val ACTION_REFRESH_REMINDERS = "id.or.id.masjidabudzar.REFRESH_REMINDERS"
    const val ACTION_WATCHDOG_ALARM = "id.or.id.masjidabudzar.WATCHDOG_ALARM"
    const val ACTION_PLAY_ADHAN = "id.or.id.masjidabudzar.PLAY_ADHAN"
    const val ACTION_DISMISS_ALERT = "id.or.id.masjidabudzar.DISMISS_ALERT"

    const val EXTRA_EVENT_KEY = "event_key"
    const val EXTRA_EVENT_LABEL = "event_label"
    const val EXTRA_ADHAN_TARGET = "adhan_target"
    const val EXTRA_IQAMAH_TARGET = "iqamah_target"
    const val EXTRA_IMAM_NAME = "imam_name"
    const val EXTRA_MUADZIN_NAME = "muadzin_name"
    const val EXTRA_IS_IQAMAH = "is_iqamah"
    const val EXTRA_SCHEDULED_ID = "scheduled_event_id"
    const val EXTRA_ALERT_NOTIFICATION_ID = "alert_notification_id"

    const val DEFAULT_LOCATION = "Masjid Abu Dzar, Rumpin"
    const val DEFAULT_LATITUDE = -6.442126
    const val DEFAULT_LONGITUDE = 106.640654

    private const val BASE_NOTIFICATION_ID = 1100
    private const val NOTIFICATION_ID_SLOTS = 200
    // ID notifikasi alert sengaja di luar rentang ID ongoing. Jika berada di
    // rentang yang sama, versi APK tertentu membuat ID keduanya identik dan
    // notifikasi adzan ikut hilang saat service membersihkan ID lama.
    // Adzan dan iqamah memakai ID berbeda supaya alert iqamah tidak ditimpa
    // (atau dibungkam) oleh alert adzan yang masih aktif.
    const val ADHAN_FALLBACK_NOTIFICATION_ID = BASE_NOTIFICATION_ID + 500
    const val IQAMAH_FALLBACK_NOTIFICATION_ID = BASE_NOTIFICATION_ID + 501
    const val CHANNEL_ID = "masjid_abu_dzar_ongoing"
    const val ADHAN_CHANNEL_ID = "masjid_abu_dzar_adhan"

    /**
     * ID notifikasi berubah tiap versi. Ini mencegah SystemUI memakai ulang
     * RemoteViews lama setelah update APK, yang bisa memicu RemoteServiceException
     * "Bad notification" saat app dibuka. Fungsi ini murni agar rentang ID bisa
     * diuji tanpa Context/Android framework.
     */
    fun notificationIdForVersion(version: Int): Int =
        BASE_NOTIFICATION_ID + ((version and Int.MAX_VALUE) % NOTIFICATION_ID_SLOTS)

    fun notificationId(context: Context): Int = try {
        @Suppress("DEPRECATION")
        val version = context.packageManager
            .getPackageInfo(context.packageName, 0).versionCode
        notificationIdForVersion(version)
    } catch (_: Exception) {
        BASE_NOTIFICATION_ID
    }

    fun cancelStaleNotifications(context: Context) {
        val current = notificationId(context)
        runCatching {
            val manager = NotificationManagerCompat.from(context.applicationContext)
            // Bersihkan seluruh slot yang mungkin dipakai versi lama. ID adzan
            // berada di luar rentang ini sehingga tidak ikut dibatalkan.
            (BASE_NOTIFICATION_ID until BASE_NOTIFICATION_ID + NOTIFICATION_ID_SLOTS)
                .forEach { id ->
                    if (id != current) manager.cancel(id)
                }
        }
    }
}

data class Mosque(
    val name: String = ReminderConfig.DEFAULT_LOCATION,
    val logoUrl: String? = null,
    val address: String? = null,
    val mapUrl: String = "https://maps.app.goo.gl/aLWZpi1UhasHeHEP7",
    val calculationMethod: String = "MWL",
    val latitude: Double = ReminderConfig.DEFAULT_LATITUDE,
    val longitude: Double = ReminderConfig.DEFAULT_LONGITUDE,
)

data class PrayerTimes(
    val imsak: String = "",
    val fajr: String = "",
    val sunrise: String = "",
    val dhuhr: String = "",
    val asr: String = "",
    val maghrib: String = "",
    val isha: String = "",
)

data class PrayerDay(
    val date: String = "",
    val imsak: String = "",
    val fajr: String = "",
    val sunrise: String = "",
    val dhuhr: String = "",
    val asr: String = "",
    val maghrib: String = "",
    val isha: String = "",
)

data class NextPrayer(
    val key: String = "",
    val label: String = "",
    val time: String = "",
    val target: String = "",
    val tomorrow: Boolean = false,
)

data class IqamahEvent(
    val key: String = "",
    val label: String = "",
    val adhanTime: String = "",
    val iqamahTime: String = "",
    val adhanTarget: String = "",
    val iqamahTarget: String = "",
    val mode: String = "",
    val delayMinutes: Int? = null,
    val fixedIqamahTime: String? = null,
)

data class NextIqamah(
    val label: String = "",
    val adhanTime: String = "",
    val iqamahTime: String = "",
    val adhanTarget: String = "",
    val iqamahTarget: String = "",
    val isBetweenAdhanAndIqamah: Boolean = false,
)

data class ImamSchedule(
    val id: String = "",
    val date: String = "",
    val prayerName: String = "",
    val imamName: String = "",
    val muadzinName: String = "",
)

data class Tarawih(
    val id: String = "",
    val imamName: String = "",
    val imamName2: String? = null,
    val notes: String? = null,
)

data class Jumat(
    val fridayDate: String = "",
    val khatibName: String? = null,
    val sermonTopic: String? = null,
    val imamSubuh: String? = null,
)

data class Khatib(
    val id: String = "",
    val fridayDate: String = "",
    val khatibName: String = "",
    val sermonTopic: String? = null,
)

data class Kajian(
    val id: String = "",
    val title: String = "",
    val speakerName: String = "",
    val bookOrTopic: String? = null,
    val startDateTime: String = "",
    val endDateTime: String? = null,
    val location: String = "",
    val kajianType: String = "REGULAR",
    val audience: String? = null,
)

data class Advice(
    val id: String = "",
    val content: String = "",
    val sourceReference: String? = null,
    val authorOrSource: String? = null,
)

data class RunningText(val id: String = "", val content: String = "")

data class DisplaySettings(
    val slideIntervalSeconds: Int = 12,
    val autoRotateEnabled: Boolean = true,
    val tickerSpeed: Int = 8,
    val tickerEnabled: Boolean = true,
    val showHijriDate: Boolean = true,
)

data class Khutbah(
    val id: String = "",
    val khatibName: String = "",
    val sermonTopic: String? = null,
    val endsAt: String = "",
    val startedAt: String = "",
)

data class DonationAccount(
    val id: String = "",
    val bankName: String = "",
    val accountNumber: String = "",
    val accountName: String = "",
    val displayOrder: Int = 0,
)

data class DonationInfo(
    val title: String = "Donasi Masjid",
    val notes: String? = null,
    val qrImageUrl: String? = null,
    val isActive: Boolean = false,
    val accounts: List<DonationAccount> = emptyList(),
)

data class TvData(
    val serverTime: String = "",
    val mosque: Mosque = Mosque(),
    val today: String = "",
    val isFriday: Boolean = false,
    val isRamadan: Boolean = false,
    val tarawihToday: Tarawih? = null,
    val prayerTimes: PrayerTimes = PrayerTimes(),
    val prayerTimesWeek: List<PrayerDay> = emptyList(),
    val nextPrayer: NextPrayer = NextPrayer(),
    val iqamahEvents: List<IqamahEvent> = emptyList(),
    val nextIqamah: NextIqamah? = null,
    val imamToday: List<ImamSchedule> = emptyList(),
    val imamWeek: List<ImamSchedule> = emptyList(),
    val imamTomorrowSubuh: ImamSchedule? = null,
    val jumat: Jumat = Jumat(),
    val khatibUpcoming: List<Khatib> = emptyList(),
    val kajian: List<Kajian> = emptyList(),
    val advice: List<Advice> = emptyList(),
    val runningTexts: List<RunningText> = emptyList(),
    val display: DisplaySettings = DisplaySettings(),
    val khutbah: Khutbah? = null,
)

object ApiParser {
    private val gson = Gson()
    private val zone: ZoneId = ZoneId.of("Asia/Jakarta")

    fun parse(json: String): TvData = try {
        gson.fromJson(json, TvData::class.java) ?: TvData()
    } catch (_: Exception) {
        TvData()
    }

    fun toJson(data: TvData): String = gson.toJson(data)

    fun parseDonation(json: String): DonationInfo = try {
        gson.fromJson(json, DonationInfo::class.java) ?: DonationInfo()
    } catch (_: Exception) {
        DonationInfo()
    }

    fun toDonationJson(data: DonationInfo): String = gson.toJson(data)

    fun instant(iso: String?): Long? = try {
        if (iso.isNullOrBlank()) null else Instant.parse(iso).toEpochMilli()
    } catch (_: Exception) {
        null
    }

    fun serverTime(data: TvData): Long = instant(data.serverTime) ?: System.currentTimeMillis()

    fun zoned(epochMillis: Long): ZonedDateTime =
        ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), zone)

    fun wallTime(epochMillis: Long): String =
        zoned(epochMillis).format(DateTimeFormatter.ofPattern("HH:mm", Locale("id")))

    fun gregorian(epochMillis: Long): String =
        zoned(epochMillis).format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale("id")))

    fun shortDate(epochMillis: Long): String =
        zoned(epochMillis).format(DateTimeFormatter.ofPattern("EEE, d MMM", Locale("id")))

    fun ymd(epochMillis: Long): String =
        zoned(epochMillis).format(DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale("id")))

    fun atWallTime(ymd: String, hhmm: String): Long? = try {
        val (h, m) = hhmm.split(":").map { it.toInt() }
        zoned(Instant.parse("${ymd}T00:00:00Z").toEpochMilli())
            .toLocalDate().atTime(h, m).atZone(zone).toInstant().toEpochMilli()
    } catch (_: Exception) {
        null
    }
}

private val HIJRI_MONTHS = arrayOf(
    "Muharram", "Safar", "Rabiulawal", "Rabiulakhir",
    "Jumadilawal", "Jumadilakhir", "Rajab", "Sya'ban",
    "Ramadan", "Syawal", "Zulkaidah", "Zulhijjah",
)

object HijriUtil {
    /** Umm al-Qura (Kemenag), zona Asia/Jakarta, dengan koreksi ±1 hari. */
    fun format(epochMillis: Long, correction: Int = 0): String {
        val cal = IslamicCalendar(IcuTimeZone.getTimeZone("Asia/Jakarta"), Locale("id", "ID"))
        cal.setCalculationType(IslamicCalendar.CalculationType.ISLAMIC_UMALQURA)
        cal.setTimeInMillis(epochMillis)
        if (correction != 0) cal.add(Calendar.DATE, correction)
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val month = cal.get(Calendar.MONTH).coerceIn(0, 11)
        val year = cal.get(Calendar.YEAR)
        return "$day ${HIJRI_MONTHS[month]} $year H"
    }
}

data class PrayerMoment(
    val key: String,
    val label: String,
    val adhanTime: String,
    val iqamahTime: String,
    val adhanTarget: Long,
    val iqamahTarget: Long,
    val imamName: String,
    val muadzinName: String,
)

enum class CountdownPhase { BEFORE_ADHAN, BEFORE_IQAMAH }

data class CountdownState(
    val phase: CountdownPhase,
    val title: String,
    val prayerLabel: String,
    val displayTime: String,
    val adhanTime: String = "",
    val iqamahTime: String = "",
    val targetMillis: Long,
    val remainingSeconds: Long,
    val isUrgent: Boolean,
    val imamName: String,
    val muadzinName: String,
    val hijri: String,
    val gregorian: String,
    val location: String,
    val shortLocation: String,
    val isFriday: Boolean,
    val offline: Boolean,
    val mosqueName: String = "",
    val logoUrl: String? = null,
) {
    val countdown: String
        get() {
            val s = remainingSeconds.coerceAtLeast(0)
            val h = s / 3600
            val m = (s % 3600) / 60
            val sec = s % 60
            return "-%02d:%02d:%02d".format(Locale.US, h, m, sec)
        }

    val infoLine: String
        get() = "$prayerLabel : $displayTime | $countdown"
}

object PrayerEngine {
    private val LABEL_BY_KEY = mapOf(
        "fajr" to "Shubuh", "dhuhr" to "Dzuhur", "asr" to "Ashar",
        "maghrib" to "Maghrib", "isha" to "Isya",
    )

    // Ejaan lama masih mungkin tersimpan di database/web. Kunci internal sengaja
    // tidak diubah supaya jadwal dan file audio yang lama tetap terbaca.
    private val KEY_BY_LABEL = mapOf(
        "fajr" to "fajr", "subuh" to "fajr", "shubuh" to "fajr",
        "dhuhr" to "dhuhr", "zuhur" to "dhuhr", "dzuhur" to "dhuhr",
        "asr" to "asr", "asar" to "asr", "ashar" to "asr",
        "maghrib" to "maghrib", "magrib" to "maghrib",
        "isha" to "isha", "isya" to "isha",
    )

    private fun normalize(value: String): String = value.trim().lowercase(Locale.ROOT)

    private fun keyFor(value: String): String? = KEY_BY_LABEL[normalize(value)]

    fun samePrayer(left: String, right: String): Boolean {
        val leftKey = keyFor(left)
        val rightKey = keyFor(right)
        return if (leftKey != null && rightKey != null) {
            leftKey == rightKey
        } else {
            normalize(left) == normalize(right)
        }
    }

    private fun maskFor(key: String): String = LABEL_BY_KEY[key] ?: key

    fun clockOffset(data: TvData, fetchedAt: Long): Long = ApiParser.serverTime(data) - fetchedAt

    fun moments(data: TvData): List<PrayerMoment> {
        val result = mutableListOf<PrayerMoment>()
        for (event in data.iqamahEvents) {
            val a = ApiParser.instant(event.adhanTarget) ?: continue
            val i = ApiParser.instant(event.iqamahTarget) ?: continue
            if (a <= 0L || i <= a) continue
            val label = event.label.ifBlank { maskFor(event.key) }
            val duty = data.imamToday.firstOrNull {
                samePrayer(it.prayerName, label) ||
                    samePrayer(it.prayerName, maskFor(event.key))
            }
            result += PrayerMoment(
                key = event.key,
                label = label,
                adhanTime = event.adhanTime,
                iqamahTime = event.iqamahTime,
                adhanTarget = a,
                iqamahTarget = i,
                imamName = duty?.imamName?.takeIf { it.isNotBlank() } ?: "-",
                muadzinName = duty?.muadzinName?.takeIf { it.isNotBlank() } ?: "-",
            )
        }
        if (result.isEmpty()) {
            val a = ApiParser.instant(data.nextPrayer.target)
            val iq = data.nextIqamah
            val i = iq?.let { ApiParser.instant(it.iqamahTarget) }
            if (a != null && i != null && i > a) {
                val label = data.nextPrayer.label.ifBlank { maskFor(data.nextPrayer.key) }
                val duty = data.imamToday.firstOrNull { samePrayer(it.prayerName, label) }
                result += PrayerMoment(
                    key = data.nextPrayer.key,
                    label = label,
                    adhanTime = data.nextPrayer.time,
                    iqamahTime = iq.iqamahTime,
                    adhanTarget = a,
                    iqamahTarget = i,
                    imamName = duty?.imamName ?: "-",
                    muadzinName = duty?.muadzinName ?: "-",
                )
            }
        }
        return result.distinctBy { it.adhanTarget }.sortedBy { it.adhanTarget }
    }

    /**
     * Alarm memakai jadwal 7 hari dari API supaya tidak perlu membuka aplikasi
     * dulu setiap berganti hari. Aturan iqamah diambil dari event hari ini.
     */
    fun weeklyMoments(data: TvData): List<PrayerMoment> {
        if (data.prayerTimesWeek.isEmpty()) return moments(data)

        data class IqamahRule(val fixedTime: String?, val delayMinutes: Int)
        val rules = data.iqamahEvents.associate { event ->
            val a = ApiParser.instant(event.adhanTarget)
            val i = ApiParser.instant(event.iqamahTarget)
            val derivedDelay = if (a != null && i != null && i > a) {
                ((i - a) / 60_000L).toInt()
            } else {
                20
            }
            val fixed = event.fixedIqamahTime
                ?.takeIf { it.isNotBlank() && event.mode == "FIXED_TIME" }
            val delay = if (event.mode == "DELAY_MINUTES") {
                event.delayMinutes ?: derivedDelay
            } else {
                derivedDelay
            }
            event.key to IqamahRule(fixed, delay.takeIf { it > 0 } ?: 20)
        }

        val week = mutableListOf<PrayerMoment>()
        for (day in data.prayerTimesWeek) {
            if (day.date.isBlank()) continue
            val times = listOf(
                "fajr" to day.fajr,
                "dhuhr" to day.dhuhr,
                "asr" to day.asr,
                "maghrib" to day.maghrib,
                "isha" to day.isha,
            )
            for ((key, adhanTime) in times) {
                if (adhanTime.isBlank()) continue
                val adhanTarget = ApiParser.atWallTime(day.date, adhanTime) ?: continue
                val rule = rules[key] ?: IqamahRule(null, 20)
                // Waktu tetap bisa lebih awal dari adzan pada hari lain karena
                // adzan bergeser. Pada hari seperti itu pakai jeda menit agar
                // jadwal tidak hilang—bukan membuang shalat tersebut.
                val fixedTarget = rule.fixedTime?.let { ApiParser.atWallTime(day.date, it) }
                val iqamahTarget = if (fixedTarget != null && fixedTarget > adhanTarget) {
                    fixedTarget
                } else {
                    adhanTarget + rule.delayMinutes * 60_000L
                }
                if (iqamahTarget <= adhanTarget) continue

                val label = maskFor(key)
                val duty = data.imamWeek.firstOrNull { s ->
                    s.date == day.date &&
                        (samePrayer(s.prayerName, label) || keyFor(s.prayerName) == key)
                }
                week += PrayerMoment(
                    key = key,
                    label = label,
                    adhanTime = adhanTime,
                    iqamahTime = ApiParser.wallTime(iqamahTarget),
                    adhanTarget = adhanTarget,
                    iqamahTarget = iqamahTarget,
                    imamName = duty?.imamName?.takeIf { it.isNotBlank() } ?: "-",
                    muadzinName = duty?.muadzinName?.takeIf { it.isNotBlank() } ?: "-",
                )
            }
        }
        return (week + moments(data))
            .distinctBy { "${it.key}|${it.adhanTime}|${ApiParser.ymd(it.adhanTarget)}" }
            .sortedBy { it.adhanTarget }
    }

    fun state(
        snapshots: List<TvData>,
        now: Long,
        correction: Int,
        offline: Boolean,
    ): CountdownState? {
        val primary = snapshots.firstOrNull() ?: return null
        val all = snapshots.flatMap { moments(it) }.distinctBy { it.adhanTarget }.sortedBy { it.adhanTarget }
        val current = all.firstOrNull { now < it.iqamahTarget } ?: return null

        val beforeAdhan = now < current.adhanTarget
        val phase = if (beforeAdhan) CountdownPhase.BEFORE_ADHAN else CountdownPhase.BEFORE_IQAMAH
        val target = if (beforeAdhan) current.adhanTarget else current.iqamahTarget
        val displayTime = if (beforeAdhan) current.adhanTime else current.iqamahTime
        val title = if (beforeAdhan) {
            "Adzan ${current.label}"
        } else {
            "Iqamah ${current.label}"
        }
        val urgentLimit = if (beforeAdhan) 30 * 60L else 5 * 60L

        val remaining = ((target - now) / 1000L).coerceAtLeast(0L)
        val locationFull = listOfNotNull(primary.mosque.name, primary.mosque.address)
            .joinToString(", ")
            .ifBlank { ReminderConfig.DEFAULT_LOCATION }
        val locationShort = if (primary.mosque.name.contains("Abu Dzar", ignoreCase = true)) {
            "Masjid Abu Dzar"
        } else {
            primary.mosque.name
        }

        return CountdownState(
            phase = phase,
            title = title,
            prayerLabel = if (phase == CountdownPhase.BEFORE_ADHAN) current.label else "Iqamah ${current.label}",
            displayTime = displayTime,
            adhanTime = current.adhanTime,
            iqamahTime = current.iqamahTime,
            targetMillis = target,
            remainingSeconds = remaining,
            isUrgent = remaining <= urgentLimit,
            imamName = current.imamName,
            muadzinName = current.muadzinName,
            hijri = HijriUtil.format(now, correction),
            gregorian = ApiParser.gregorian(now),
            location = locationFull,
            shortLocation = locationShort,
            isFriday = primary.isFriday,
            offline = offline,
            mosqueName = primary.mosque.name,
            logoUrl = primary.mosque.logoUrl,
        )
    }
}
