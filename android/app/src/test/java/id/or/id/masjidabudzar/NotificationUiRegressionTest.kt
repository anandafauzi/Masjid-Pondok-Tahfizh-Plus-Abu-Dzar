package id.or.id.masjidabudzar

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.Inflater

/**
 * Menjaga perbaikan notification shade tidak kembali ke kondisi lama:
 * - small icon tetap siluet putih solid dengan bounding box lama,
 * - collapsed cukup pendek untuk batas tinggi SystemUI (~64dp),
 * - detail imam/muadzin tampil penuh di expanded tanpa descender terpotong.
 *
 * Murni JVM: membaca file resource/sumber dan mendekode PNG 8-bit RGBA tanpa
 * android.graphics maupun java.awt, sehingga tidak butuh device/emulator.
 */
class NotificationUiRegressionTest {

    private fun resFile(relative: String): File = moduleFile("src/main/res", relative)

    private fun sourceFile(relative: String): File = moduleFile("src/main/java", relative)

    private fun moduleFile(base: String, relative: String): File {
        var dir = File(base)
        if (!File(dir, relative).exists()) dir = File("app", base)
        if (!File(dir, relative).exists()) dir = File("../app", base)
        val file = File(dir, relative)
        assertTrue("File tidak ditemukan: ${file.absolutePath}", file.exists())
        return file
    }

    private fun rootTag(xml: String): String {
        val start = xml.indexOf("<LinearLayout")
        assertTrue("Tidak ada root LinearLayout", start >= 0)
        return xml.substring(start, xml.indexOf('>', start))
    }

    private fun tagFor(xml: String, id: String): String {
        val idPos = xml.indexOf("android:id=\"@+id/$id\"")
        assertTrue("View $id tidak ada", idPos >= 0)
        val start = xml.lastIndexOf("<TextView", idPos)
        val end = xml.indexOf("/>", idPos)
        assertTrue("Tag $id tidak lengkap", start >= 0 && end > start)
        return xml.substring(start, end + 2)
    }

    private fun attr(tag: String, name: String): String? =
        Regex("""$name="([^"]+)"""").find(tag)?.groupValues?.get(1)

    private fun dp(tag: String, name: String): Int =
        attr(tag, name)?.removeSuffix("dp")?.toIntOrNull() ?: -1

    private fun textViews(xml: String): List<String> =
        Regex("""<TextView[^>]*/>""", RegexOption.DOT_MATCHES_ALL)
            .findAll(xml)
            .map { it.value }
            .toList()

    @Test
    fun notificationIconIsSolidWhiteWithOriginalBoundingBox() {
        val expected = mapOf(
            "mdpi" to intArrayOf(24, 2, 0, 21, 23),
            "hdpi" to intArrayOf(36, 3, 0, 32, 35),
            "xhdpi" to intArrayOf(48, 4, 0, 43, 47),
            "xxhdpi" to intArrayOf(72, 6, 0, 64, 71),
            "xxxhdpi" to intArrayOf(96, 9, 0, 86, 95),
        )

        for ((density, box) in expected) {
            val png = decodePng(resFile("drawable-$density/ic_mosque_notification.png"))
            val size = box[0]
            assertInt("$density width", size, png.width)
            assertInt("$density height", size, png.height)

            var minX = size
            var minY = size
            var maxX = -1
            var maxY = -1
            var opaque = 0
            var colored = 0

            for (y in 0 until png.height) {
                for (x in 0 until png.width) {
                    val i = (y * png.width + x) * 4
                    val r = png.rgba[i].toInt() and 0xFF
                    val g = png.rgba[i + 1].toInt() and 0xFF
                    val b = png.rgba[i + 2].toInt() and 0xFF
                    val a = png.rgba[i + 3].toInt() and 0xFF
                    if (a <= 8) continue

                    minX = minOf(minX, x)
                    minY = minOf(minY, y)
                    maxX = maxOf(maxX, x)
                    maxY = maxOf(maxY, y)
                    if (a == 255) opaque++
                    if (r != 255 || g != 255 || b != 255) colored++
                }
            }

            // 1 px toleransi karena anti-aliasing tiap density dibulatkan berbeda.
            assertInt("$density minX", box[1], minX, 1)
            assertInt("$density minY", box[2], minY, 1)
            assertInt("$density maxX", box[3], maxX, 1)
            assertInt("$density maxY", box[4], maxY, 1)
            assertInt("$density warna non-putih", 0, colored)
            assertTrue(
                "$density terlalu banyak piksel semi-transparan (opaque=$opaque)",
                opaque >= size * size / 5,
            )
        }
    }

    @Test
    fun collapsedLayoutFitsSystemUiHeightAtLargeFontScale() {
        val xml = resFile("layout/notification_compact.xml").readText()

        // Akar masalah lama: 3 baris collapsed melebihi batas ~64dp SystemUI.
        assertFalse("collapsed masih memuat notif_staff", "notif_staff" in xml)
        assertFalse("collapsed masih memuat notif_line1", "notif_line1" in xml)
        assertTrue("collapsed bukan horizontal", "android:orientation=\"horizontal\"" in xml)
        assertTrue("collapsed tidak baseline-aligned", "android:baselineAligned=\"true\"" in xml)
        assertTrue("collapsed tidak clipChildren=false", "android:clipChildren=\"false\"" in xml)
        assertTrue("collapsed tidak clipToPadding=false", "android:clipToPadding=\"false\"" in xml)

        val root = rootTag(xml)
        val padTop = dp(root, "android:paddingTop")
        val padBottom = dp(root, "android:paddingBottom")
        assertTrue("padding atas collapsed terlalu besar: $padTop", padTop in 0..6)
        assertTrue("padding bawah collapsed terlalu besar: $padBottom", padBottom in 0..6)

        val tags = textViews(xml)
        assertTrue("collapsed bukan tepat satu baris (4 TextView): ${tags.size}", tags.size == 4)
        // Spacer 1dp tanpa id sengaja dikecualikan; hanya teks ber-id yang dijaga.
        for (tag in tags.filter { "android:id=" in it }) {
            assertTrue("TextView tetap ada yang tinggi tetap", "android:layout_height=\"wrap_content\"" in tag)
            assertTrue("includeFontPadding hilang", "includeFontPadding=\"true\"" in tag)
            assertTrue("lineSpacingMultiplier hilang", "lineSpacingMultiplier" in tag)
            assertFalse("lineSpacingExtra masih dipakai", "lineSpacingExtra" in tag)
            assertTrue(
                "textSize bukan sp",
                attr(tag, "android:textSize")?.endsWith("sp") == true,
            )
        }

        // Estimasi konservatif: font scale 200%, tinggi glyph ≈ 1.5 x textSize.
        val maxSp = tags.mapNotNull { attr(it, "android:textSize")?.removeSuffix("sp")?.toIntOrNull() }
            .maxOrNull() ?: 0
        val estimated = maxSp * 2.0 * 1.5 + padTop + padBottom
        assertTrue(
            "Perkiraan tinggi collapsed ${estimated}dp melebihi batas SystemUI 64dp",
            estimated <= 64.0,
        )
    }

    @Test
    fun expandedLayoutShowsFullStaffTextAndDescenderSpace() {
        val xml = resFile("layout/notification_expanded.xml").readText()
        val root = rootTag(xml)
        val staff = tagFor(xml, "notif_staff")

        assertTrue("expanded root bukan wrap_content", "android:layout_height=\"wrap_content\"" in root)
        assertTrue("expanded root tidak clipChildren=false", "android:clipChildren=\"false\"" in root)
        assertTrue("expanded root tidak clipToPadding=false", "android:clipToPadding=\"false\"" in root)
        assertTrue("padding bawah expanded < 12dp", dp(root, "android:paddingBottom") >= 12)
        assertTrue("baris expanded tidak baseline-aligned", "android:baselineAligned=\"true\"" in xml)

        assertTrue("staff bukan wrap_content", "android:layout_height=\"wrap_content\"" in staff)
        assertFalse("staff masih membatasi baris", "maxLines" in staff)
        assertFalse("staff masih memotong dengan ellipsis", "ellipsize" in staff)
        assertTrue("staff includeFontPadding hilang", "includeFontPadding=\"true\"" in staff)
        assertTrue("staff lineSpacingMultiplier hilang", "lineSpacingMultiplier" in staff)
        assertFalse("staff masih memakai lineSpacingExtra", "lineSpacingExtra" in staff)
        assertTrue("staff tidak punya ruang descender", dp(staff, "android:paddingBottom") >= 2)

        for (tag in textViews(xml).filter { "android:id=" in it }) {
            assertTrue(
                "textSize expanded bukan sp",
                attr(tag, "android:textSize")?.endsWith("sp") == true,
            )
        }
    }

    @Test
    fun notificationBuilderRoutesStaffOnlyToExpandedView() {
        val src = sourceFile("id/or/id/masjidabudzar/OngoingNotification.kt").readText()

        val compactBlock = src.substringAfter("val compact =").substringBefore("val expanded =")
        val expandedBlock = src.substringAfter("val expanded =")
            .substringBefore("return NotificationCompat.Builder")

        assertFalse("compact masih mengisi notif_staff", "notif_staff" in compactBlock)
        assertFalse("compact masih mengisi notif_line1", "notif_line1" in compactBlock)
        assertTrue("expanded tidak mengisi notif_staff", "R.id.notif_staff" in expandedBlock)
        assertTrue("expanded tidak mengisi notif_line1", "R.id.notif_line1" in expandedBlock)

        assertTrue("custom collapsed view tidak dipasang", ".setCustomContentView(compact)" in src)
        assertTrue("custom expanded view tidak dipasang", ".setCustomBigContentView(expanded)" in src)
        assertTrue("custom heads-up view tidak dipasang", ".setCustomHeadsUpContentView(compact)" in src)
    }

    private data class DecodedPng(val width: Int, val height: Int, val rgba: ByteArray)

    /** Decoder minimal untuk PNG 8-bit RGBA non-interlaced (format keluaran sharp). */
    private fun decodePng(file: File): DecodedPng {
        val bytes = file.readBytes()
        var offset = 8
        var width = 0
        var height = 0
        var bitDepth = 0
        var colorType = 0
        val idat = ByteArrayOutputStream()

        while (offset + 12 <= bytes.size) {
            val length = be32(bytes, offset)
            val type = String(bytes, offset + 4, 4, Charsets.US_ASCII)
            val dataStart = offset + 8
            when (type) {
                "IHDR" -> {
                    width = be32(bytes, dataStart)
                    height = be32(bytes, dataStart + 4)
                    bitDepth = bytes[dataStart + 8].toInt() and 0xFF
                    colorType = bytes[dataStart + 9].toInt() and 0xFF
                }
                "IDAT" -> idat.write(bytes, dataStart, length)
            }
            offset = dataStart + length + 4
        }

        assertTrue("PNG unsupported bitDepth=$bitDepth colorType=$colorType", bitDepth == 8 && colorType == 6)

        val raw = ByteArrayOutputStream()
        val inflater = Inflater()
        try {
            inflater.setInput(idat.toByteArray())
            val buffer = ByteArray(8192)
            while (!inflater.finished()) {
                val read = inflater.inflate(buffer)
                if (read <= 0) break
                raw.write(buffer, 0, read)
            }
        } finally {
            inflater.end()
        }

        val channels = 4
        val stride = width * channels
        val scanlines = raw.toByteArray()
        val pixels = ByteArray(height * stride)
        var pos = 0
        for (y in 0 until height) {
            val filter = scanlines[pos++].toInt() and 0xFF
            for (x in 0 until stride) {
                val value = scanlines[pos++].toInt() and 0xFF
                val left = if (x >= channels) pixels[y * stride + x - channels].toInt() and 0xFF else 0
                val up = if (y > 0) pixels[(y - 1) * stride + x].toInt() and 0xFF else 0
                val upLeft = if (y > 0 && x >= channels) pixels[(y - 1) * stride + x - channels].toInt() and 0xFF else 0
                val restored = when (filter) {
                    0 -> value
                    1 -> (value + left) and 0xFF
                    2 -> (value + up) and 0xFF
                    3 -> (value + (left + up) / 2) and 0xFF
                    4 -> (value + paeth(left, up, upLeft)) and 0xFF
                    else -> error("Filter PNG tidak didukung: $filter")
                }
                pixels[y * stride + x] = restored.toByte()
            }
        }
        return DecodedPng(width, height, pixels)
    }

    private fun be32(b: ByteArray, o: Int): Int =
        ((b[o].toInt() and 0xFF) shl 24) or
            ((b[o + 1].toInt() and 0xFF) shl 16) or
            ((b[o + 2].toInt() and 0xFF) shl 8) or
            (b[o + 3].toInt() and 0xFF)

    private fun paeth(a: Int, b: Int, c: Int): Int {
        val p = a + b - c
        val pa = kotlin.math.abs(p - a)
        val pb = kotlin.math.abs(p - b)
        val pc = kotlin.math.abs(p - c)
        return when {
            pa <= pb && pa <= pc -> a
            pb <= pc -> b
            else -> c
        }
    }

    private fun assertInt(label: String, expected: Int, actual: Int, tolerance: Int = 0) {
        assertTrue(
            "$label: expected=$expected actual=$actual (tolerance=$tolerance)",
            kotlin.math.abs(expected - actual) <= tolerance,
        )
    }
}
