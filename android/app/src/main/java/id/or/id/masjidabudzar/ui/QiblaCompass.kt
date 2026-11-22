package id.or.id.masjidabudzar.ui

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

/** Interpolasi sudut yang benar di sekitar batas 0°/360°. */
private fun smoothAngle(current: Float, target: Float, alpha: Float): Float {
    val delta = ((target - current + 540f) % 360f) - 180f
    return normalizeDegrees(current + alpha * delta)
}

/** 0° derajat layar menghadap ke atas, bukan ke kanan. */
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
    var sensorAvailable by remember { mutableStateOf(true) }

    // Nilai sensor bisa melompat di batas 0°/360°. Target disimpan sebagai sudut
    // kontinu supaya animasi tidak berputar mundur, lalu dianimasikan dengan spring.
    val azimuth by animateFloatAsState(
        targetValue = headingTarget,
        animationSpec = spring(
            dampingRatio = 0.82f,
            stiffness = Spring.StiffnessLow,
        ),
        visibilityThreshold = 0.02f,
    )

    DisposableEffect(context, latitude, longitude) {
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

        // Kompas HP membaca utara magnetik, sedangkan arah kiblat dihitung
        // dari utara geografis. Koreksi deklinasi lokal menjaga selisihnya.
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
        val radius = minOf(size.width, size.height) * 0.43f
        val gold = Color(0xFFC6A15B)
        val goldSoft = Color(0xFFE7D09A)
        val emerald = Color(0xFF0B3B2E)
        val ink = Color(0xFF14231D)
        val muted = Color(0xFF52645A)

        drawCircle(color = Color(0xFFFFFDF8), radius = radius, center = Offset(cx, cy))
        drawCircle(
            color = gold,
            radius = radius,
            center = Offset(cx, cy),
            style = Stroke(3.dp.toPx()),
        )
        drawCircle(color = Color(0xFFEDE3D1), radius = radius * 0.72f, center = Offset(cx, cy))

        for (angle in 0..330 step 30) {
            val rad = screenRad(angle.toFloat(), azimuth)
            val inner = radius * 0.88f
            val outer = radius * 0.96f
            val cardinal = angle % 90 == 0
            drawLine(
                color = if (cardinal) emerald else muted.copy(alpha = 0.45f),
                start = Offset(cx + cos(rad) * inner, cy + sin(rad) * inner),
                end = Offset(cx + cos(rad) * outer, cy + sin(rad) * outer),
                strokeWidth = if (cardinal) 2.dp.toPx() else 1.dp.toPx(),
            )
        }

        drawCardinal(measurer, "U", 0f, azimuth, cx, cy, radius, ink)
        drawCardinal(measurer, "T", 90f, azimuth, cx, cy, radius, muted)
        drawCardinal(measurer, "S", 180f, azimuth, cx, cy, radius, muted)
        drawCardinal(measurer, "B", 270f, azimuth, cx, cy, radius, muted)

        val needleRad = screenRad(qibla, azimuth)
        val tip = Offset(cx + cos(needleRad) * radius * 0.62f, cy + sin(needleRad) * radius * 0.62f)
        val tail = Offset(cx - cos(needleRad) * radius * 0.34f, cy - sin(needleRad) * radius * 0.34f)
        drawLine(color = gold, start = tail, end = tip, strokeWidth = 9.dp.toPx())
        drawKaaba(
            center = tip,
            size = 18.dp.toPx(),
            gold = gold,
            goldSoft = goldSoft,
            ink = ink,
        )
        drawCircle(color = emerald, radius = 17.dp.toPx(), center = Offset(cx, cy))
        drawCircle(color = goldSoft, radius = 11.dp.toPx(), center = Offset(cx, cy))

        if (!sensorAvailable) {
            drawCircle(
                color = Color(0xFFC8453B),
                radius = 5.dp.toPx(),
                center = Offset(cx + radius * 0.7f, cy - radius * 0.7f),
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
) {
    val half = size / 2f
    drawRect(
        color = ink,
        topLeft = Offset(center.x - half, center.y - half),
        size = Size(size, size),
    )
    drawLine(
        color = gold,
        start = Offset(center.x - half, center.y - size * 0.12f),
        end = Offset(center.x + half, center.y - size * 0.12f),
        strokeWidth = 2.dp.toPx(),
    )
    drawLine(
        color = gold,
        start = Offset(center.x - half, center.y + size * 0.18f),
        end = Offset(center.x + half, center.y + size * 0.18f),
        strokeWidth = 1.5.dp.toPx(),
    )
    drawRect(
        color = goldSoft,
        topLeft = Offset(center.x - size * 0.11f, center.y - size * 0.02f),
        size = Size(size * 0.22f, size * 0.34f),
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
) {
    val rad = screenRad(bearing, azimuth)
    val labelStyle = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold)
    val result = measurer.measure(text, style = labelStyle)
    val x = cx + cos(rad) * radius * 0.79f - result.size.width / 2f
    val y = cy + sin(rad) * radius * 0.79f - result.size.height / 2f
    drawText(
        textMeasurer = measurer,
        text = text,
        topLeft = Offset(x, y),
        style = labelStyle.copy(color = color),
    )
}
