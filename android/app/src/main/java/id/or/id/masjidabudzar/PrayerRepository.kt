package id.or.id.masjidabudzar

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.time.Instant
import java.util.concurrent.TimeUnit

data class AppBundle(
    val snapshots: List<TvData> = emptyList(),
    val fetchedAt: Long = 0L,
    val clockOffset: Long = 0L,
    val hijriCorrection: Int = 0,
    val notificationsEnabled: Boolean = true,
    val offline: Boolean = true,
) {
    val primary: TvData? get() = snapshots.firstOrNull()

    fun now(): Long = System.currentTimeMillis() + clockOffset
}

class PrayerRepository(context: Context) {
    private val appContext = context.applicationContext
    val settings: AppSettings = AppSettings(appContext)

    // MainActivity, service, SyncWorker, watchdog, dan alarm bisa meminta
    // refresh bersamaan. Tanpa kunci ini, respons lama dapat menimpa snapshot
    // yang lebih baru (misalnya jadwal kemarin setelah tengah malam).
    private val refreshMutex = Mutex()

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header("User-Agent", "MasjidAbuDzarNative/2.0 (Android)")
                .header("Accept", "application/json")
                .build()
            chain.proceed(request)
        }
        .build()

    val bundle: Flow<AppBundle> = settings.prefs.map { p ->
        val today = if (p.todayJson.isBlank()) null else ApiParser.parse(p.todayJson)
        val tomorrow = if (p.tomorrowJson.isBlank()) null else ApiParser.parse(p.tomorrowJson)
        val snapshots = listOfNotNull(today, tomorrow)
        AppBundle(
            snapshots = snapshots,
            fetchedAt = p.fetchedAt,
            clockOffset = p.clockOffset,
            hijriCorrection = p.hijriCorrection,
            notificationsEnabled = p.notificationsEnabled,
            offline = snapshots.isEmpty() || !isOnline(appContext),
        )
    }

    suspend fun refresh(): Result<Long> = withContext(Dispatchers.IO) {
        refreshMutex.withLock {
            runCatching {
                // Biarkan OkHttp yang menentukan apakah jaringan benar-benar bisa dipakai.
                // Pengecekan VALIDATED terlalu ketat pada beberapa jaringan seluler.
                val now = System.currentTimeMillis()
                val previous = settings.prefsAfterMigration()
                if (previous.fetchedAt > now) {
                    return@runCatching previous.fetchedAt
                }

                val todayYmd = ApiParser.ymd(now)
                val tomorrowYmd = ApiParser.ymd(now + 24L * 60 * 60 * 1000)

                val todayJson = fetch(todayYmd)
                val todayData = ApiParser.parse(todayJson)
                if (todayData.serverTime.isBlank()) {
                    throw IllegalStateException("Respons API tidak valid")
                }

                // Gagal mengambil besok jangan menghapus snapshot yang masih valid.
                val tomorrowJson = try {
                    fetch(tomorrowYmd)
                } catch (_: Exception) {
                    previous.tomorrowJson
                }

                val fetchedAt = System.currentTimeMillis()
                val offset = PrayerEngine.clockOffset(todayData, fetchedAt)
                settings.saveSnapshot(todayJson, tomorrowJson, fetchedAt, offset)
                fetchedAt
            }
        }
    }

    private fun fetch(ymd: String): String {
        val request = Request.Builder()
            .url("${ReminderConfig.TV_DATA_URL}?date=$ymd")
            .get()
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IllegalStateException("HTTP ${response.code}")
            return response.body?.string().takeUnless { it.isNullOrBlank() }
                ?: throw IllegalStateException("Respons kosong")
        }
    }

    fun isOnline(): Boolean = isOnline(appContext)

    companion object {
        fun isOnline(context: Context): Boolean {
            val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return false
            val network = manager.activeNetwork ?: return false
            val caps = manager.getNetworkCapabilities(network) ?: return false
            return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        }
    }
}
