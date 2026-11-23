package id.or.id.masjidabudzar.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Logo admin sekarang transparan dengan warna asli gelap. Di container hijau
 * tua (top bar dan banner info) warna itu harus diganti, tetapi QR donasi
 * harus tetap memakai warna aslinya supaya bisa dipindai.
 */
class LogoContrastRegressionTest {

    private fun source(relative: String): String {
        var dir = File("src/main/java")
        if (!File(dir, relative).exists()) dir = File("app", "src/main/java")
        if (!File(dir, relative).exists()) dir = File("../app", "src/main/java")
        val file = File(dir, relative)
        assertTrue("File tidak ditemukan: ${file.absolutePath}", file.exists())
        return file.readText()
    }

    @Test
    fun transparentLogoCanBeTintedWithoutTouchingFallbackIcon() {
        val src = source("id/or/id/masjidabudzar/ui/MosqueLogo.kt")
        assertTrue("parameter tint hilang", "tint: Color? = null" in src)
        assertTrue(
            "bitmap tidak memakai ColorFilter.tint",
            "colorFilter = tint?.let { ColorFilter.tint(it, BlendMode.SrcIn) }" in src,
        )
        assertTrue("fallback icon masih memakai fallbackTint", "tint = fallbackTint" in src)
    }

    @Test
    fun darkContainersTintLogoButDonationQrKeepsNativeColors() {
        val src = source("id/or/id/masjidabudzar/ui/App.kt")
        val calls = Regex("""MosqueLogo\([\s\S]*?\n\s*\)""").findAll(src).map { it.value }.toList()

        assertEquals("Jumlah pemakaian MosqueLogo berubah", 3, calls.size)
        assertTrue(
            "logo top bar tidak di-tint",
            calls.any { "logoUrl = logoUrl" in it && "tint = AppColors.GoldSoft" in it },
        )
        assertTrue(
            "logo banner info tidak di-tint",
            calls.any {
                "bundle.primary?.mosque?.logoUrl" in it &&
                    "tint = AppColors.GoldSoft" in it
            },
        )
        assertFalse(
            "QR donasi tidak boleh di-tint",
            calls.first { "donation.qrImageUrl" in it }.contains("tint ="),
        )
    }
}
