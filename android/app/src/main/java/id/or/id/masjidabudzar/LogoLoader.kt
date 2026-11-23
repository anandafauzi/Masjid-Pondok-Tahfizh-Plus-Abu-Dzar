package id.or.id.masjidabudzar

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.LruCache
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

/**
 * Memuat logo masjid dari `mosque.logoUrl` (data URL atau http/https).
 * Dipakai bersama oleh UI Compose dan notifikasi agar gambar tidak
 * didekode ulang setiap kali recompose / timer notifikasi berjalan.
 */
object LogoLoader {
    private const val CACHE_KILOBYTES = 4 * 1024

    /** Sama dengan batas QR/logo data URL di admin: 4 juta karakter. */
    private const val MAX_DATA_URL_LENGTH = 4_000_000
    private const val MAX_REMOTE_BYTES = 8 * 1024 * 1024
    private const val TARGET_SIZE_PX = 512
    private const val READ_CHUNK_BYTES = 8 * 1024

    private val cache = object : LruCache<String, Bitmap>(CACHE_KILOBYTES) {
        override fun sizeOf(key: String, value: Bitmap): Int =
            (value.byteCount / 1024).coerceAtLeast(1)
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .build()

    suspend fun load(url: String?): Bitmap? = withContext(Dispatchers.IO) {
        loadBlocking(url)
    }

    /** Ambil dari cache tanpa network/decode. Aman dipanggil di thread utama. */
    fun peek(url: String?): Bitmap? = url?.let { cache.get(it) }

    fun loadBlocking(url: String?): Bitmap? {
        if (url.isNullOrBlank()) return null
        cache.get(url)?.let { return it }

        val bitmap = when {
            url.startsWith("data:image/", ignoreCase = true) -> decodeDataUrl(url)
            url.startsWith("http://", ignoreCase = true) ||
                url.startsWith("https://", ignoreCase = true) -> decodeRemote(url)
            else -> null
        } ?: return null

        cache.put(url, bitmap)
        return bitmap
    }

    private fun decodeDataUrl(url: String): Bitmap? {
        if (url.length > MAX_DATA_URL_LENGTH) return null
        val comma = url.indexOf(',')
        if (comma < 0) return null
        val header = url.substring(0, comma)
        if (!header.contains(";base64", ignoreCase = true)) return null

        val payload = url.substring(comma + 1)
        if (payload.length > MAX_DATA_URL_LENGTH) return null

        return try {
            val bytes = Base64.decode(payload, Base64.DEFAULT)
            if (bytes.isEmpty()) null else decodeSampled(bytes)
        } catch (_: Exception) {
            null
        }
    }

    private fun decodeRemote(url: String): Bitmap? = try {
        val request = Request.Builder().url(url).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val bytes = response.body?.byteStream()?.use { stream ->
                val output = ByteArrayOutputStream()
                val chunk = ByteArray(READ_CHUNK_BYTES)
                var total = 0
                while (total < MAX_REMOTE_BYTES) {
                    val read = stream.read(chunk)
                    if (read < 0) break
                    val allowed = minOf(read, MAX_REMOTE_BYTES - total)
                    output.write(chunk, 0, allowed)
                    total += allowed
                }
                output.toByteArray()
            } ?: return null
            if (bytes.isEmpty()) null else decodeSampled(bytes)
        }
    } catch (_: Exception) {
        null
    }

    /** Baca bounds dulu, lalu turunkan sampel sebelum bitmap dialokasikan. */
    private fun decodeSampled(bytes: ByteArray): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sampleSize = 1
        val largest = maxOf(bounds.outWidth, bounds.outHeight)
        while (largest / sampleSize > TARGET_SIZE_PX) {
            sampleSize *= 2
        }

        val options = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
    }
}
