package id.or.id.masjidabudzar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PrayerLogicTest {

    @Test
    fun parsesIsoUtcTimestamp() {
        val epoch = ApiParser.instant("2026-11-20T10:42:00.000Z")
        assertEquals(1795171320000L, epoch)
    }

    @Test
    fun parsesTvDataAndBuildsMoments() {
        val json = """
            {
              "serverTime":"2026-11-20T10:42:00.000Z",
              "mosque":{"name":"Masjid Abu Dzar","address":"Rumpin"},
              "today":"2026-11-20",
              "iqamahEvents":[{
                "key":"maghrib","label":"Maghrib",
                "adhanTime":"17:42","iqamahTime":"18:02",
                "adhanTarget":"2026-11-20T10:42:00.000Z",
                "iqamahTarget":"2026-11-20T11:02:00.000Z",
                "mode":"fixed"
              }],
              "imamToday":[{
                "prayerName":"Maghrib",
                "imamName":"Ust. Ahmad Fauzi",
                "muadzinName":"Ust. Dedi Saputra"
              }]
            }
        """.trimIndent()

        val data = ApiParser.parse(json)
        assertEquals("Masjid Abu Dzar", data.mosque.name)
        assertEquals(1, data.iqamahEvents.size)

        val moments = PrayerEngine.moments(data)
        assertEquals(1, moments.size)
        assertEquals("Maghrib", moments[0].label)
        assertEquals("Ust. Ahmad Fauzi", moments[0].imamName)
        assertEquals("Ust. Dedi Saputra", moments[0].muadzinName)
    }

    @Test
    fun weeklyMomentsFallsBackToDelayWhenFixedIqamahPrecedesAdhan() {
        val json = """
            {
              "serverTime":"2026-11-20T10:42:00.000Z",
              "today":"2026-11-20",
              "iqamahEvents":[{
                "key":"maghrib","label":"Maghrib",
                "adhanTime":"17:40","iqamahTime":"18:00",
                "adhanTarget":"2026-11-20T10:40:00.000Z",
                "iqamahTarget":"2026-11-20T11:00:00.000Z",
                "mode":"FIXED_TIME","delayMinutes":0,
                "fixedIqamahTime":"18:00"
              }],
              "prayerTimesWeek":[
                {"date":"2026-11-20","maghrib":"17:40"},
                {"date":"2026-11-21","maghrib":"18:05"}
              ]
            }
        """.trimIndent()

        val moments = PrayerEngine.weeklyMoments(ApiParser.parse(json))
        val maghrib = moments.filter { it.key == "maghrib" }

        assertEquals(2, maghrib.size)
        // Hari pertama memakai waktu tetap.
        assertEquals("18:00", maghrib[0].iqamahTime)
        // Hari berikutnya adzan bergeser melewati waktu tetap; jeda 20 menit
        // dipakai supaya jadwal tetap ada, bukan dibuang.
        assertEquals("18:25", maghrib[1].iqamahTime)
        assertTrue(maghrib[1].iqamahTarget > maghrib[1].adhanTarget)
    }

    @Test
    fun notificationIdStaysInReservedRangeAndChangesBetweenVersions() {
        val first = ReminderConfig.notificationIdForVersion(1)
        val next = ReminderConfig.notificationIdForVersion(2)

        assertTrue(first in 1100 until 1300)
        assertTrue(next in 1100 until 1300)
        assertNotEquals(first, next)
        assertNotEquals(
            ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID,
            first,
        )
    }

    @Test
    fun countdownUsesHhMmSsWithMinusSign() {
        val state = CountdownState(
            phase = CountdownPhase.BEFORE_ADHAN,
            title = "Menuju Adzan Maghrib",
            prayerLabel = "Maghrib",
            displayTime = "17:42",
            targetMillis = 0L,
            remainingSeconds = 3723L,
            isUrgent = false,
            imamName = "Ust. Ahmad Fauzi",
            muadzinName = "Ust. Dedi Saputra",
            hijri = "10 Jumadilakhir 1448 H",
            gregorian = "Jumat, 20 November 2026",
            location = "Masjid Abu Dzar, Rumpin",
            shortLocation = "Masjid Abu Dzar",
            isFriday = true,
            offline = false,
        )
        assertEquals("-01:02:03", state.countdown)
        assertEquals("Maghrib : 17:42 | -01:02:03", state.infoLine)
    }
}
