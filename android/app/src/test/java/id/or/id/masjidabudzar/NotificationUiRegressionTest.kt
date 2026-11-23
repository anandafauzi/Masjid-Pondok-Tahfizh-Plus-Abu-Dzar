package id.or.id.masjidabudzar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.zip.Inflater

/**
 * Menjaga notification shade sesuai permintaan terbaru:
 * - siluet masjid putih solid (logo sedikit diperkecil),
 * - semua field tampil di collapsed dengan jarak baris dipangkas,
 * - detail tetap penuh di expanded,
 * - BigTextStyle dipasang sebagai fallback expanded standar.
 *
 * Murni JVM: membaca resource/sumber dan mendekode PNG 8-bit RGBA.
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

    private fun assertTextBasics(tag: String, maxMultiplier: Double) {
        assertTrue("TextView ber-id bukan wrap_content", "android:layout_height=\"wrap_content\"" in tag)
        assertTrue("includeFontPadding hilang", "includeFontPadding=\"true\"" in tag)
        assertFalse("lineSpacingExtra masih dipakai", "lineSpacingExtra" in tag)
        val multiplier = attr(tag, "android:lineSpacingMultiplier")?.toDoubleOrNull()
        assertTrue("lineSpacingMultiplier hilang", multiplier != null)
        assertTrue("lineSpacingMultiplier $multiplier > $maxMultiplier", multiplier!! <= maxMultiplier)
        val size = attr(tag, "android:textSize")
        assertTrue("textSize bukan sp: $size", size?.endsWith("sp") == true)
        assertTrue("textSize diperkecil: $size", size!!.removeSuffix("sp").toIntOrNull()?.let { it >= 12 } == true)
    }

    @Test
    fun notificationIconIsSolidWhiteAndSlightlySmaller() {
        val expected = mapOf(
            "mdpi" to intArrayOf(24, 3, 1, 20, 22),
            "hdpi" to intArrayOf(36, 4, 1, 30, 33),
            "xhdpi" to intArrayOf(48, 6, 2, 40, 45),
            "xxhdpi" to intArrayOf(72, 9, 3, 61, 67),
            "xxxhdpi" to intArrayOf(96, 12, 4, 81, 90),
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

            assertInt("$density minX", box[1], minX, 1)
            assertInt("$density minY", box[2], minY, 1)
            assertInt("$density maxX", box[3], maxX, 1)
            assertInt("$density maxY", box[4], maxY, 1)
            assertInt("$density warna non-putih", 0, colored)
            assertTrue(
                "$density terlalu banyak piksel semi-transparan (opaque=$opaque)",
                opaque >= size * size / 6,
            )
        }
    }

    @Test
    fun collapsedLayoutShowsExactlyThreeRowsWithoutButton() {
        val xml = resFile("layout/notification_compact.xml").readText()
        val root = rootTag(xml)

        for (id in listOf(
            "notif_line1", "notif_prayer", "notif_time",
            "notif_countdown", "notif_staff",
        )) {
            assertTrue("collapsed tidak punya $id", "android:id=\"@+id/$id\"" in xml)
        }
        assertFalse(
            "tombol Buka Aplikasi tidak boleh muncul di collapsed",
            "android:id=\"@+id/notif_action_open\"" in xml,
        )
        // 1 root + 5 field; tidak ada id ke-6 (= tombol).
        val idCount = Regex.fromLiteral("android:id=\"@+id/notif_").findAll(xml).count()
        assertEquals("collapsed punya $idCount id (root + field), bukan 6", 6, idCount)

        assertTrue("collapsed tidak clipChildren=false", "android:clipChildren=\"false\"" in root)
        assertTrue("collapsed tidak clipToPadding=false", "android:clipToPadding=\"false\"" in root)
        assertInt("paddingStart", 0, dp(root, "android:paddingStart"))
        assertInt("paddingEnd", 0, dp(root, "android:paddingEnd"))
        assertTrue("padding atas collapsed > 3dp", dp(root, "android:paddingTop") <= 3)
        assertTrue("padding bawah collapsed > 3dp", dp(root, "android:paddingBottom") <= 3)

        for (tag in textViews(xml).filter { "android:id=" in it }) {
            assertTextBasics(tag, 1.0)
        }
    }

    @Test
    fun expandedLayoutKeepsFullDetailAndLeftAlignment() {
        val xml = resFile("layout/notification_expanded.xml").readText()
        val root = rootTag(xml)
        val staff = tagFor(xml, "notif_staff")
        val action = tagFor(xml, "notif_action_open")

        assertInt("expanded paddingStart", 0, dp(root, "android:paddingStart"))
        assertInt("expanded paddingEnd", 0, dp(root, "android:paddingEnd"))
        assertTrue("expanded padding atas > 4dp", dp(root, "android:paddingTop") <= 4)
        assertTrue("expanded padding bawah < 6dp", dp(root, "android:paddingBottom") >= 6)
        assertTrue("baris expanded tidak baseline-aligned", "android:baselineAligned=\"true\"" in xml)

        assertTrue("staff bukan wrap_content", "android:layout_height=\"wrap_content\"" in staff)
        assertFalse("staff masih membatasi baris", "maxLines" in staff)
        assertFalse("staff masih ellipsize", "ellipsize" in staff)
        assertTextBasics(staff, 0.95)
        assertTrue("staff tidak punya ruang descender", dp(staff, "android:paddingBottom") >= 2)

        assertTrue("tombol expanded tidak ditengah", "android:gravity=\"center\"" in action)
        assertTrue("tombol expanded textAlignment bukan center", "android:textAlignment=\"center\"" in action)
        assertTrue("tombol expanded layout_gravity bukan center", "android:layout_gravity=\"center_horizontal\"" in action)
        for (tag in textViews(xml).filter { "android:id=" in it }) {
            assertTextBasics(tag, 0.95)
        }
    }

    @Test
    fun notificationBuilderShowsAllFieldsAndSetsBigTextStyle() {
        val src = sourceFile("id/or/id/masjidabudzar/OngoingNotification.kt").readText()

        val compactBlock = src.substringAfter("val compact =").substringBefore("val expanded =")
        val expandedBlock = src.substringAfter("val expanded =")
            .substringBefore("return NotificationCompat.Builder")

        for (id in listOf(
            "notif_line1", "notif_prayer", "notif_time",
            "notif_countdown", "notif_staff",
        )) {
            assertTrue("compact tidak mengisi $id", "R.id.$id" in compactBlock)
            assertTrue("expanded tidak mengisi $id", "R.id.$id" in expandedBlock)
        }
        assertFalse(
            "compact tidak boleh memasang tombol Buka Aplikasi",
            "R.id.notif_action_open" in compactBlock,
        )
        assertTrue(
            "expanded harus memasang tombol Buka Aplikasi",
            "R.id.notif_action_open" in expandedBlock,
        )

        assertTrue("fullText tidak dibuat", "val fullText = listOf(" in src)
        assertTrue("fullText tidak memuat staff", "staff," in src)
        assertTrue("BigTextStyle tidak dipasang", ".setStyle(NotificationCompat.BigTextStyle().bigText(fullText))" in src)
        assertTrue("custom collapsed tidak dipasang", ".setCustomContentView(compact)" in src)
        assertTrue("custom expanded tidak dipasang", ".setCustomBigContentView(expanded)" in src)
        assertTrue("custom heads-up tidak dipasang", ".setCustomHeadsUpContentView(compact)" in src)
    }

    @Test
    fun notificationTextMatchesRequestedTemplate() {
        val src = sourceFile("id/or/id/masjidabudzar/OngoingNotification.kt").readText()

        assertTrue("pemisah tanggal bukan bullet", ".joinToString(\" • \")" in src)
        assertTrue("tanggal Masehi tidak dipakai utuh", "state.gregorian" in src)
        assertTrue("tanggal Hijriyah tidak dipakai utuh", "state.hijri" in src)

        assertTrue(
            "format staff bukan 'Imam : (nama) | Muadzin (nama)'",
            "\"Imam : \${state.imamName} | Muadzin \${state.muadzinName}\"" in src,
        )
        assertTrue(
            "format shalat bukan '(nama) : (waktu) | (mundur)'",
            "\"\$label : \$time | \$countdown\"" in src,
        )
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
