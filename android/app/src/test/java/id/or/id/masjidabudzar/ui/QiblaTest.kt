package id.or.id.masjidabudzar.ui

import id.or.id.masjidabudzar.ReminderConfig
import org.junit.Assert.assertTrue
import org.junit.Test

class QiblaTest {
    @Test
    fun bearingFromOfficialMosqueCoordinatesPointsNorthWest() {
        val bearing = QiblaCalculator.bearing(
            ReminderConfig.DEFAULT_LATITUDE,
            ReminderConfig.DEFAULT_LONGITUDE,
        )
        assertTrue("Bearing kiblat=$bearing", bearing in 280f..310f)
        assertTrue(QiblaCalculator.direction(bearing).isNotBlank())
    }
}
