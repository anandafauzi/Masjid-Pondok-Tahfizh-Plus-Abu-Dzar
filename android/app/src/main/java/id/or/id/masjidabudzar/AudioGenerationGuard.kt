package id.or.id.masjidabudzar

import java.util.concurrent.atomic.AtomicInteger

/**
 * Menjaga agar suara adzan lama tidak menyala setelah pengguna menekan Tutup.
 *
 * `MediaPlayer.prepareAsync()` selesai asynchronous. Bila Tutup datang sebelum
 * callback prepared dipanggil, callback harus dibatalkan. Token generasi dibuat
 * murni (tanpa Android framework) supaya perilaku ini bisa diuji di unit test.
 */
class AudioGenerationGuard {
    private val generation = AtomicInteger(0)

    /** Mulai sesi putar baru dan kembalikan tokennya. */
    fun beginPlayback(): Int = generation.incrementAndGet()

    /** Batalkan sesi putar mana pun yang sedang berjalan atau disiapkan. */
    fun dismiss() {
        generation.incrementAndGet()
    }

    /** True hanya untuk sesi terakhir yang belum dibatalkan. */
    fun isCurrent(token: Int): Boolean = generation.get() == token
}
