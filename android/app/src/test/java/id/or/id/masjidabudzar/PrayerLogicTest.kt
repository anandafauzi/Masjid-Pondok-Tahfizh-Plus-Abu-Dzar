package id.or.id.masjidabudzar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
    fun scheduledAlarmIdRoundTripsAndRejectsMalformedIds() {
        val raw = PrayerReminderScheduler.scheduledId("A", "maghrib", 1_795_171_320_000L)
        val parsed = PrayerReminderScheduler.parseScheduledId(raw)

        assertEquals("A", parsed?.kind)
        assertEquals("maghrib", parsed?.key)
        assertEquals(1_795_171_320_000L, parsed?.trigger)
        assertEquals(raw, parsed?.raw)

        assertEquals(null, PrayerReminderScheduler.parseScheduledId("X|maghrib|123"))
        assertEquals(null, PrayerReminderScheduler.parseScheduledId("A|maghrib|not-a-number"))
    }

    @Test
    fun adhanAndIqamahAlertsUseDistinctIdsOutsideOngoingRange() {
        assertNotEquals(
            ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID,
            ReminderConfig.IQAMAH_FALLBACK_NOTIFICATION_ID,
        )
        assertTrue(ReminderConfig.ADHAN_FALLBACK_NOTIFICATION_ID !in 1100 until 1300)
        assertTrue(ReminderConfig.IQAMAH_FALLBACK_NOTIFICATION_ID !in 1100 until 1300)
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

    @Test
    fun dismissInvalidatesPreparingAdhanAudio() {
        val guard = AudioGenerationGuard()
        val preparing = guard.beginPlayback()

        guard.dismiss()

        assertFalse(guard.isCurrent(preparing))

        val nextPlayback = guard.beginPlayback()
        assertTrue(guard.isCurrent(nextPlayback))
        assertFalse(guard.isCurrent(preparing))
    }

    @Test
    fun legacyPrayerNamesStillMatchDutiesAndUseNewLabels() {
        val json = """
            {
              "serverTime":"2026-11-20T10:42:00.000Z",
              "today":"2026-11-20",
              "iqamahEvents":[{
                "key":"fajr","label":"Shubuh",
                "adhanTime":"04:30","iqamahTime":"04:50",
                "adhanTarget":"2026-11-19T21:30:00.000Z",
                "iqamahTarget":"2026-11-19T21:50:00.000Z",
                "mode":"DELAY_MINUTES"
              }],
              "imamToday":[{
                "prayerName":"Subuh",
                "imamName":"Ust. Ahmad Fauzi",
                "muadzinName":"Ust. Dedi Saputra"
              }]
            }
        """.trimIndent()

        val moments = PrayerEngine.moments(ApiParser.parse(json))

        assertEquals(1, moments.size)
        assertEquals("Shubuh", moments[0].label)
        assertEquals("Ust. Ahmad Fauzi", moments[0].imamName)
        assertEquals("Ust. Dedi Saputra", moments[0].muadzinName)
    }

    @Test
    fun weeklyMomentsMatchLegacyImamLabels() {
        val json = """
            {
              "serverTime":"2026-11-20T10:42:00.000Z",
              "today":"2026-11-20",
              "prayerTimesWeek":[{"date":"2026-11-20","dhuhr":"11:52"}],
              "imamWeek":[{
                "date":"2026-11-20",
                "prayerName":"Zuhur",
                "imamName":"Ust. Umar",
                "muadzinName":"-"
              }]
            }
        """.trimIndent()

        val moments = PrayerEngine.weeklyMoments(ApiParser.parse(json))
        val dzuhur = moments.first { it.key == "dhuhr" }

        assertEquals("Dzuhur", dzuhur.label)
        assertEquals("Ust. Umar", dzuhur.imamName)
    }

    @Test
    fun adhanAndIqamahScheduledIdsNeverCollide() {
        val trigger = 1_795_171_320_000L
        val adhan = PrayerReminderScheduler.scheduledId("A", "dhuhr", trigger)
        val iqamah = PrayerReminderScheduler.scheduledId("I", "dhuhr", trigger)

        assertNotEquals(adhan, iqamah)
        assertEquals("A", PrayerReminderScheduler.parseScheduledId(adhan)?.kind)
        assertEquals("I", PrayerReminderScheduler.parseScheduledId(iqamah)?.kind)
        assertEquals("dhuhr", PrayerReminderScheduler.parseScheduledId(iqamah)?.key)
    }

    @Test
    fun scheduledIdKeepsClockSkewAndOverflowSafeTriggers() {
        // Waktu perangkat bisa lebih lambat/lebih cepat dari server, atau
        // berada di sekitar epoch. Pemulihan alarm mengandalkan angka ini.
        val triggers = listOf(-86_400_000L, 0L, 4_102_444_800_000L)
        for (trigger in triggers) {
            val parsed = PrayerReminderScheduler.parseScheduledId(
                PrayerReminderScheduler.scheduledId("I", "isha", trigger)
            )
            assertEquals(trigger, parsed?.trigger)
            assertEquals("isha", parsed?.key)
        }

        assertEquals(null, PrayerReminderScheduler.parseScheduledId("A|fajr|"))
        assertEquals(null, PrayerReminderScheduler.parseScheduledId("A|fajr|999999999999999999999999"))
        assertEquals(null, PrayerReminderScheduler.parseScheduledId("A|fajr"))
        assertEquals(null, PrayerReminderScheduler.parseScheduledId(""))
    }

    @Test
    fun dismissCancelsEveryEarlierAudioGeneration() {
        val guard = AudioGenerationGuard()
        val preparing = guard.beginPlayback()
        val newer = guard.beginPlayback()

        assertFalse(guard.isCurrent(preparing))
        assertTrue(guard.isCurrent(newer))

        guard.dismiss()
        assertFalse(guard.isCurrent(newer))
        assertFalse(guard.isCurrent(preparing))

        val afterDismiss = guard.beginPlayback()
        assertTrue(guard.isCurrent(afterDismiss))
    }

    @Test
    fun samePrayerAcceptsLegacyLabelsWithoutMixingDifferentPrayers() {
        assertTrue(PrayerEngine.samePrayer("Subuh", "Shubuh"))
        assertTrue(PrayerEngine.samePrayer("Zuhur", "Dzuhur"))
        assertTrue(PrayerEngine.samePrayer(" Ashar ", "ashar"))
        assertTrue(PrayerEngine.samePrayer("magrib", "Maghrib"))

        assertFalse(PrayerEngine.samePrayer("fajr", "Isya"))
        assertFalse(PrayerEngine.samePrayer("Jumat", "Dzuhur"))

        // Label di luar daftar shalat tetap dibandingkan apa adanya.
        assertTrue(PrayerEngine.samePrayer("Tarawih", " tarawih "))
    }

    @Test
    fun parsesDonationInfoFromItsOwnEndpoint() {
        val json = """
            {
              "title":"Donasi Masjid",
              "notes":"Transfer atau QRIS",
              "qrImageUrl":"https://example.com/qris.png",
              "isActive":true,
              "accounts":[{
                "id":"acc-1","bankName":"BSI",
                "accountNumber":"123 456","accountName":"Masjid Abu Dzar"
              }]
            }
        """.trimIndent()

        val donation = ApiParser.parseDonation(json)

        assertTrue(donation.isActive)
        assertEquals("Donasi Masjid", donation.title)
        assertEquals(1, donation.accounts.size)
        assertEquals("123 456", donation.accounts[0].accountNumber)
        assertEquals("https://example.com/qris.png", donation.qrImageUrl)
    }

    @Test
    fun malformedDonationResponseFallsBackToInactiveInfo() {
        val donation = ApiParser.parseDonation("{")

        assertTrue(!donation.isActive)
        assertTrue(donation.accounts.isEmpty())
    }
}
