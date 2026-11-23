package id.or.id.masjidabudzar.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Logo admin memakai warna aslinya (tanpa tint) di top bar dan banner info.
 * QR donasi juga tetap memakai warna aslinya supaya bisa dipindai.
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
    fun logoUsesOriginalColorsAndDonationQrKeepsNativeColors() {
        val src = source("id/or/id/masjidabudzar/ui/App.kt")
        val calls = Regex("""MosqueLogo\([\s\S]*?\n\s*\)""").findAll(src).map { it.value }.toList()

        assertEquals("Jumlah pemakaian MosqueLogo berubah", 3, calls.size)
        assertFalse(
            "logo top bar harus memakai warna asli",
            calls.first { "logoUrl = logoUrl" in it }.contains("tint ="),
        )
        assertFalse(
            "logo banner info harus memakai warna asli",
            calls.first { "bundle.primary?.mosque?.logoUrl" in it }.contains("tint ="),
        )
        assertFalse(
            "QR donasi tidak boleh di-tint",
            calls.first { "donation.qrImageUrl" in it }.contains("tint ="),
        )
        assertTrue(
            "logo perlu latar terang agar warna aslinya tetap terlihat",
            src.contains("background(Color.White)"),
        )
    }
}
