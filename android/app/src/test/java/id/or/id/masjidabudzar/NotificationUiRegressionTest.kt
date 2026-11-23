package id.or.id.masjidabudzar

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.Inflater

/**
 * Menjaga agar perbaikan notification shade tidak kembali ke kondisi lama:
 * - small icon tetap siluet putih solid dengan bounding box lama,
 * - layout tidak memotong teks (tinggi dinamis, tanpa ellipsis pada staff).
 *
 * Murni JVM: membaca file resource dan mendekode PNG 8-bit RGBA tanpa
 * android.graphics maupun java.awt, sehingga tidak butuh device/emulator.
 */
class NotificationUiRegressionTest {

    private fun resourceFile(relative: String): File {
        var dir = File("src/main/res")
        if (!File(dir, relative).exists()) dir = File("app/src/main/res")
        if (!File(dir, relative).exists()) dir = File("../app/src/main/res")
        val file = File(dir, relative)
        assertTrue("Resource tidak ditemukan: ${file.absolutePath}", file.exists())
        return file
    }

    private fun tagFor(xml: String, id: String): String {
        val idPos = xml.indexOf("android:id=\"@+id/$id\"")
        assertTrue("TextView $id tidak ada", idPos >= 0)
        val start = xml.lastIndexOf("<TextView", idPos)
        val end = xml.indexOf("/>", idPos)
        assertTrue("Tag $id tidak lengkap", start >= 0 && end > start)
        return xml.substring(start, end + 2)
    }

    @Test
    fun notificationIconIsSolidWhiteWithOriginalBoundingBox() {
        // box lama (mdpi -> xxxhdpi), dipertahankan agar posisi/ukuran di shade tidak berubah
        val expected = mapOf(
            "mdpi" to intArrayOf(24, 2, 0, 21, 23),
            "hdpi" to intArrayOf(36, 3, 0, 32, 35),
            "xhdpi" to intArrayOf(48, 4, 0, 43, 47),
            "xxhdpi" to intArrayOf(72, 6, 0, 64, 71),
            "xxxhdpi" to intArrayOf(96, 9, 0, 86, 95),
        )

        for ((density, box) in expected) {
            val png = decodePng(resourceFile("drawable-$density/ic_mosque_notification.png"))
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
                    // SystemUI mewarnai small icon secara monokrom. Piksel harus
                    // putih supaya tidak tampak pucat di atas lingkaran biru.
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
    fun notificationLayoutsDoNotClipStaffText() {
        for (name in listOf("notification_compact.xml", "notification_expanded.xml")) {
            val xml = resourceFile("layout/$name").readText()

            // Root dan semua TextView ber-id tidak boleh punya tinggi tetap.
            // Spacer 1dp tanpa id sengaja dikecualikan (bukan teks).
            val rootStart = xml.indexOf("<LinearLayout")
            assertTrue("$name tidak punya root LinearLayout", rootStart >= 0)
            val rootTag = xml.substring(rootStart, xml.indexOf('>', rootStart))
            assertTrue("$name root bukan wrap_content", "android:layout_height=\"wrap_content\"" in rootTag)

            val fixedHeight = Regex("""android:layout_height="\d+dp"""")
            Regex("""<TextView[^>]*/>""", RegexOption.DOT_MATCHES_ALL)
                .findAll(xml)
                .map { it.value }
                .filter { "android:id=" in it }
                .forEach { tag ->
                    assertFalse("$name punya TextView ber-id dengan tinggi tetap", fixedHeight.containsMatchIn(tag))
                }

            val staff = tagFor(xml, "notif_staff")
            assertTrue("$name staff bukan wrap_content", "android:layout_height=\"wrap_content\"" in staff)
            assertFalse("$name staff masih membatasi baris", "maxLines" in staff)
            assertFalse("$name staff masih memotong dengan ellipsis", "ellipsize" in staff)
            assertTrue("$name staff kehilangan font padding", "includeFontPadding=\"true\"" in staff)
            assertTrue(
                "$name staff memakai line spacing tetap (tidak ikut font scaling)",
                "lineSpacingMultiplier" in staff,
            )
            assertFalse("$name masih memakai lineSpacingExtra", "lineSpacingExtra" in xml)
        }
    }

    @Test
    fun notificationTextScalesWithFontAndHasBottomClearance() {
        for (name in listOf("notification_compact.xml", "notification_expanded.xml")) {
            val xml = resourceFile("layout/$name").readText()
            val sizes = Regex("""android:textSize="([^"]+)"""")
                .findAll(xml)
                .map { it.groupValues[1] }
                .toList()
            assertTrue("$name tidak punya textSize", sizes.isNotEmpty())
            assertTrue("$name punya textSize bukan sp: $sizes", sizes.all { it.endsWith("sp") })

            val bottom = Regex("""android:paddingBottom="(\d+)dp"""")
                .find(xml)
                ?.groupValues
                ?.get(1)
                ?.toIntOrNull()
            assertTrue("$name padding bawah < 10dp (bottom clearance): $bottom", (bottom ?: 0) >= 10)
        }
    }

    private data class DecodedPng(val width: Int, val height: Int, val rgba: ByteArray)

    /** Decoder minimal untuk PNG 8-bit RGBA non-interlaced (format keluaran sharp). */
    private fun decodePng(file: File): DecodedPng {
        val bytes = file.readBytes()
        var offset = 8 // lewati signature
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
            offset = dataStart + length + 4 // + CRC
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
