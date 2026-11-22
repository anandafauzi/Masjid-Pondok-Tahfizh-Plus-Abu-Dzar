package id.or.id.masjidabudzar.ui

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

object QiblaCalculator {
    private const val KAABA_LAT = 21.4225
    private const val KAABA_LON = 39.8262

    fun bearing(latitude: Double, longitude: Double): Float {
        val lat = Math.toRadians(latitude)
        val kaabaLat = Math.toRadians(KAABA_LAT)
        val dLon = Math.toRadians(KAABA_LON) - Math.toRadians(longitude)
        val y = sin(dLon) * cos(kaabaLat)
        val x = cos(lat) * sin(kaabaLat) - sin(lat) * cos(kaabaLat) * cos(dLon)
        return ((Math.toDegrees(atan2(y, x)) + 360.0) % 360.0).toFloat()
    }

    fun direction(degrees: Float): String = when {
        degrees < 22.5 || degrees >= 337.5 -> "Utara"
        degrees < 67.5 -> "Timur Laut"
        degrees < 112.5 -> "Timur"
        degrees < 157.5 -> "Tenggara"
        degrees < 202.5 -> "Selatan"
        degrees < 247.5 -> "Barat Daya"
        degrees < 292.5 -> "Barat"
        else -> "Barat Laut"
    }
}

private fun normalizeDegrees(degrees: Float): Float = ((degrees % 360f) + 360f) % 360f

/** Interpolasi sudut kontinu di sekitar batas 0°/360°. */
private fun smoothAngle(current: Float, target: Float, alpha: Float): Float {
    val delta = ((target - current + 540f) % 360f) - 180f
    return normalizeDegrees(current + alpha * delta)
}

/** 0° derajat layar menghadap ke atas (arah jarum jam). */
private fun screenRad(bearing: Float, azimuth: Float): Float =
    Math.toRadians(normalizeDegrees(bearing - azimuth - 90f).toDouble()).toFloat()

@Composable
fun QiblaCompass(
    latitude: Double,
    longitude: Double,
    modifier: Modifier = Modifier,
    onSensorAvailabilityChange: (Boolean) -> Unit = {},
) {
    val context = LocalContext.current
    val measurer = rememberTextMeasurer()
    val qibla = remember(latitude, longitude) { QiblaCalculator.bearing(latitude, longitude) }
    val availabilityCallback = rememberUpdatedState(onSensorAvailabilityChange)

    var headingTarget by remember { mutableFloatStateOf(0f) }
    var sensorAvailable by remember { mutableStateOf(false) }
    var hasHeading by remember { mutableStateOf(false) }

    // Animasi putaran kompas berbasis spring dengan redaman halus
    val azimuth by animateFloatAsState(
        targetValue = headingTarget,
        animationSpec = spring(
            dampingRatio = 0.88f,
            stiffness = Spring.StiffnessLow,
        ),
        visibilityThreshold = 0.02f,
        label = "compassAzimuth",
    )

    // Deteksi apakah HP tepat mengarah ke kiblat (dalam toleransi ±3.5 derajat).
    // derivedStateOf mencegah recomposition tiap frame: hanya berubah saat
    // status sejajar benar-benar berubah.
    val isAligned by remember(qibla) {
        derivedStateOf {
            val angleDiff = ((qibla - (azimuth % 360f) + 540f) % 360f) - 180f
            hasHeading && sensorAvailable && abs(angleDiff) <= 3.5f
        }
    }

    val ringColor by animateColorAsState(
        targetValue = if (isAligned) AppColors.Emerald700 else AppColors.Gold,
        animationSpec = tween(300),
        label = "ringColor",
    )

    DisposableEffect(context, latitude, longitude) {
        hasHeading = false
        headingTarget = 0f
        val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val rotationVector = manager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        val accelerometer = manager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        val magnetometer = manager?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)

        val available = manager != null &&
            (rotationVector != null || (accelerometer != null && magnetometer != null))
        sensorAvailable = available
        availabilityCallback.value(available)

        val gravity = FloatArray(3)
        val magnetic = FloatArray(3)
        val rotation = FloatArray(9)
        val orientation = FloatArray(3)
        var hasSample = false
        var smoothed = 0f

        val declination = GeomagneticField(
            latitude.toFloat(),
            longitude.toFloat(),
            0f,
            System.currentTimeMillis(),
        ).declination

        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.sensor.type == Sensor.TYPE_ROTATION_VECTOR) {
                    SensorManager.getRotationMatrixFromVector(rotation, event.values)
                } else {
                    when (event.sensor.type) {
                        Sensor.TYPE_ACCELEROMETER ->
                            System.arraycopy(event.values, 0, gravity, 0, 3)
                        Sensor.TYPE_MAGNETIC_FIELD ->
                            System.arraycopy(event.values, 0, magnetic, 0, 3)
                        else -> return
                    }
                    if (!SensorManager.getRotationMatrix(rotation, null, gravity, magnetic)) return
                }

                SensorManager.getOrientation(rotation, orientation)
                val magneticHeading = normalizeDegrees(
                    Math.toDegrees(orientation[0].toDouble()).toFloat(),
                )
                val trueHeading = normalizeDegrees(magneticHeading + declination)

                if (!hasSample) {
                    smoothed = trueHeading
                    headingTarget = trueHeading
                    hasSample = true
                    hasHeading = true
                } else {
                    val next = smoothAngle(smoothed, trueHeading, 0.32f)
                    val delta = ((next - smoothed + 540f) % 360f) - 180f
                    smoothed = next
                    headingTarget += delta
                }
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }

        when {
            rotationVector != null ->
                manager.registerListener(
                    listener,
                    rotationVector,
                    SensorManager.SENSOR_DELAY_UI,
                )
            accelerometer != null && magnetometer != null -> {
                manager.registerListener(
                    listener,
                    accelerometer,
                    SensorManager.SENSOR_DELAY_UI,
                )
                manager.registerListener(
                    listener,
                    magnetometer,
                    SensorManager.SENSOR_DELAY_UI,
                )
            }
        }

        onDispose {
            manager?.unregisterListener(listener)
        }
    }

    Canvas(modifier = modifier) {
        val cx = size.width / 2f
        val cy = size.height / 2f
        val radius = minOf(size.width, size.height) * 0.44f

        val gold = AppColors.Gold
        val goldSoft = AppColors.GoldSoft
        val emerald = AppColors.Emerald900
        val emeraldLight = AppColors.Emerald800
        val ink = AppColors.Ink
        val muted = AppColors.Muted

        // 1. Shadow, glow, dan outer halo
        drawCircle(
            color = Color(0x120B3B2E),
            radius = radius + 8.dp.toPx(),
            center = Offset(cx, cy),
        )
        drawCircle(
            color = if (isAligned) {
                AppColors.Emerald600.copy(alpha = 0.24f)
            } else {
                gold.copy(alpha = 0.07f)
            },
            radius = radius * 1.07f,
            center = Offset(cx, cy),
        )

        // 2. Bezel luar bermotif kuningan emas
        drawCircle(
            color = Color(0xFFFAF7F0),
            radius = radius,
            center = Offset(cx, cy),
        )
        drawCircle(
            color = ringColor,
            radius = radius,
            center = Offset(cx, cy),
            style = Stroke(3.5.dp.toPx()),
        )
        drawCircle(
            color = gold.copy(alpha = 0.28f),
            radius = radius * 0.965f,
            center = Offset(cx, cy),
            style = Stroke(1.dp.toPx()),
        )

        // 3. Dial face dalam dengan gradasi lembut
        drawCircle(
            color = Color(0xFFFDFBF7),
            radius = radius * 0.92f,
            center = Offset(cx, cy),
        )
        drawCircle(
            color = goldSoft.copy(alpha = 0.4f),
            radius = radius * 0.92f,
            center = Offset(cx, cy),
            style = Stroke(1.dp.toPx()),
        )

        // Lingkaran kompas tengah
        drawCircle(
            color = Color(0xFFF3ECE0),
            radius = radius * 0.68f,
            center = Offset(cx, cy),
        )
        drawCircle(
            color = gold.copy(alpha = 0.35f),
            radius = radius * 0.68f,
            center = Offset(cx, cy),
            style = Stroke(1.5.dp.toPx()),
        )
        drawCircle(
            color = gold.copy(alpha = 0.18f),
            radius = radius * 0.5f,
            center = Offset(cx, cy),
            style = Stroke(1.dp.toPx()),
        )

        // 4. Skala Garis Derajat Kompas (Setiap 5° dan 30°)
        for (angle in 0..355 step 5) {
            val rad = screenRad(angle.toFloat(), azimuth)
            val isMajor = angle % 30 == 0
            val isCardinal = angle % 90 == 0

            val inner = when {
                isCardinal -> radius * 0.81f
                isMajor -> radius * 0.84f
                else -> radius * 0.88f
            }
            val outer = radius * 0.91f

            val stroke = when {
                isCardinal -> 2.dp.toPx()
                isMajor -> 1.5.dp.toPx()
                else -> 0.8.dp.toPx()
            }
            val strokeColor = when {
                isCardinal -> emeraldLight
                isMajor -> gold
                else -> muted.copy(alpha = 0.3f)
            }

            drawLine(
                color = strokeColor,
                start = Offset(cx + cos(rad) * inner, cy + sin(rad) * inner),
                end = Offset(cx + cos(rad) * outer, cy + sin(rad) * outer),
                strokeWidth = stroke,
            )
        }

        // 5. Huruf Mata Angin (U, T, S, B)
        drawCardinal(measurer, "U", 0f, azimuth, cx, cy, radius, AppColors.Alert, isNorth = true)
        drawCardinal(measurer, "T", 90f, azimuth, cx, cy, radius, muted)
        drawCardinal(measurer, "S", 180f, azimuth, cx, cy, radius, muted)
        drawCardinal(measurer, "B", 270f, azimuth, cx, cy, radius, muted)

        // 6. Jarum Penunjuk Kiblat Emas & Ka'bah
        val needleRad = screenRad(qibla, azimuth)
        val needleLength = radius * 0.64f
        val tailLength = radius * 0.32f

        val tip = Offset(cx + cos(needleRad) * needleLength, cy + sin(needleRad) * needleLength)
        val tail = Offset(cx - cos(needleRad) * tailLength, cy - sin(needleRad) * tailLength)

        // Sisi samping jarum (tapered diamond needle)
        val perpRad = needleRad + (Math.PI / 2).toFloat()
        val halfBase = 7.dp.toPx()
        val leftPoint = Offset(cx + cos(perpRad) * halfBase, cy + sin(perpRad) * halfBase)
        val rightPoint = Offset(cx - cos(perpRad) * halfBase, cy - sin(perpRad) * halfBase)

        // Gambar jarum depan (emas bercahaya)
        val needlePathFront = Path().apply {
            moveTo(tip.x, tip.y)
            lineTo(leftPoint.x, leftPoint.y)
            lineTo(cx, cy)
            close()
        }
        drawPath(needlePathFront, color = if (isAligned) AppColors.Emerald700 else gold)

        val needlePathFrontShade = Path().apply {
            moveTo(tip.x, tip.y)
            lineTo(rightPoint.x, rightPoint.y)
            lineTo(cx, cy)
            close()
        }
        drawPath(needlePathFrontShade, color = if (isAligned) AppColors.Emerald800 else AppColors.GoldDeep)

        // Gambar jarum belakang (ekor)
        val needlePathTail = Path().apply {
            moveTo(tail.x, tail.y)
            lineTo(leftPoint.x, leftPoint.y)
            lineTo(cx, cy)
            close()
        }
        drawPath(needlePathTail, color = Color(0xFFD4C8B2))

        val needlePathTailShade = Path().apply {
            moveTo(tail.x, tail.y)
            lineTo(rightPoint.x, rightPoint.y)
            lineTo(cx, cy)
            close()
        }
        drawPath(needlePathTailShade, color = Color(0xFFBEB09A))

        // 7. Simbol Ka'bah Premium di Ujung Jarum
        drawKaaba(
            center = tip,
            size = 20.dp.toPx(),
            gold = gold,
            goldSoft = goldSoft,
            ink = ink,
            isGlowing = isAligned,
        )

        // 8. Poros Tengah (Center Jewel Pivot)
        drawCircle(color = emerald, radius = 14.dp.toPx(), center = Offset(cx, cy))
        drawCircle(color = gold, radius = 9.dp.toPx(), center = Offset(cx, cy))
        drawCircle(color = Color.White.copy(alpha = 0.85f), radius = 3.dp.toPx(), center = Offset(cx - 2.dp.toPx(), cy - 2.dp.toPx()))

        // Indikator peringatan bila sensor tidak tersedia
        if (!sensorAvailable) {
            drawCircle(
                color = AppColors.Alert,
                radius = 6.dp.toPx(),
                center = Offset(cx + radius * 0.72f, cy - radius * 0.72f),
            )
        }
    }
}

private fun DrawScope.drawKaaba(
    center: Offset,
    size: Float,
    gold: Color,
    goldSoft: Color,
    ink: Color,
    isGlowing: Boolean,
) {
    val half = size / 2f

    // Efek aura cahaya jika sejajar
    if (isGlowing) {
        drawCircle(
            color = AppColors.Emerald700.copy(alpha = 0.25f),
            radius = size * 1.1f,
            center = center,
        )
        drawCircle(
            color = gold.copy(alpha = 0.35f),
            radius = size * 0.8f,
            center = center,
        )
    }

    // Bangunan utama Ka'bah
    drawRect(
        color = ink,
        topLeft = Offset(center.x - half, center.y - half),
        size = Size(size, size),
    )

    // Border halus emas
    drawRect(
        color = gold.copy(alpha = 0.5f),
        topLeft = Offset(center.x - half, center.y - half),
        size = Size(size, size),
        style = Stroke(1.dp.toPx()),
    )

    // Pita Kiswah Emas
    drawLine(
        color = gold,
        start = Offset(center.x - half, center.y - size * 0.16f),
        end = Offset(center.x + half, center.y - size * 0.16f),
        strokeWidth = 2.4.dp.toPx(),
    )

    // Pintu Ka'bah (Bab al-Ka'bah)
    drawRect(
        color = goldSoft,
        topLeft = Offset(center.x - size * 0.10f, center.y - size * 0.05f),
        size = Size(size * 0.24f, size * 0.38f),
    )
}

private fun DrawScope.drawCardinal(
    measurer: TextMeasurer,
    text: String,
    bearing: Float,
    azimuth: Float,
    cx: Float,
    cy: Float,
    radius: Float,
    color: Color,
    isNorth: Boolean = false,
) {
    val rad = screenRad(bearing, azimuth)
    val labelStyle = TextStyle(
        fontSize = if (isNorth) 17.sp else 15.sp,
        fontWeight = if (isNorth) FontWeight.ExtraBold else FontWeight.Bold,
        fontFamily = FontFamily.Serif,
    )
    val result = measurer.measure(text, style = labelStyle)
    val x = cx + cos(rad) * radius * 0.73f - result.size.width / 2f
    val y = cy + sin(rad) * radius * 0.73f - result.size.height / 2f
    drawText(
        textMeasurer = measurer,
        text = text,
        topLeft = Offset(x, y),
        style = labelStyle.copy(color = color),
    )
}
