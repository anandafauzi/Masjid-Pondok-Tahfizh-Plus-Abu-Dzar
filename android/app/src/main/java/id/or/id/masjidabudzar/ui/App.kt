package id.or.id.masjidabudzar.ui

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerDefaults
import androidx.compose.foundation.pager.rememberPagerState
import kotlinx.coroutines.launch
import id.or.id.masjidabudzar.AppBundle
import id.or.id.masjidabudzar.ApiParser
import id.or.id.masjidabudzar.CountdownState
import id.or.id.masjidabudzar.HijriUtil
import id.or.id.masjidabudzar.PrayerDay
import id.or.id.masjidabudzar.ReminderConfig
import id.or.id.masjidabudzar.TvData
import java.util.Locale

private data class NavItem(val route: String, val label: String, val icon: ImageVector)

/**
 * Permintaan membuka sebuah tab. `requestId` unik memastikan efek di Compose
 * tetap terpicu walaupun tab yang diminta sama dengan tab sebelumnya.
 */
data class OpenTabRequest(val tab: String, val requestId: Long)

private val NAV_ITEMS = listOf(
    NavItem("home", "Beranda", Icons.Filled.Home),
    NavItem("schedule", "Jadwal", Icons.Filled.DateRange),
    NavItem("officers", "Petugas", Icons.Filled.Person),
    NavItem("qibla", "Kiblat", Icons.Filled.Place),
    NavItem("info", "Info", Icons.Filled.Info),
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MasjidApp(
    viewModel: AppViewModel,
    initialTab: String = "home",
    openTabRequest: OpenTabRequest? = null,
    onEnableNotifications: () -> Unit = {},
    onNotificationsChange: ((Boolean) -> Unit)? = null,
) {
    val bundle by viewModel.bundle.collectAsState()

    val tabRequest = openTabRequest ?: OpenTabRequest(initialTab, 0L)
    val initialPage = NAV_ITEMS.indexOfFirst { it.route == tabRequest.tab }.coerceAtLeast(0)
    val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { NAV_ITEMS.size })
    val currentPage = pagerState.currentPage
    val pagerScrolling by remember { derivedStateOf { pagerState.isScrollInProgress } }
    val countdown = remember { mutableStateOf<CountdownState?>(null) }
    val scope = rememberCoroutineScope()
    val pageSpec = spring<Float>(
        dampingRatio = 0.9f,
        stiffness = Spring.StiffnessMedium,
    )

    // Ticker 1 detik ditahan saat pager bergerak supaya geseran tidak tersendat.
    LaunchedEffect(pagerScrolling) {
        if (!pagerScrolling) {
            viewModel.countdown.collect { countdown.value = it }
        }
    }

    LaunchedEffect(tabRequest) {
        val target = NAV_ITEMS.indexOfFirst { it.route == tabRequest.tab }
        if (target >= 0 && target != pagerState.currentPage) {
            pagerState.animateScrollToPage(target, animationSpec = pageSpec)
        }
    }

    Scaffold(
        bottomBar = {
            BottomAppBar(
                containerColor = AppColors.Ivory2,
                tonalElevation = 2.dp,
            ) {
                NAV_ITEMS.forEachIndexed { index, item ->
                    val active = currentPage == index
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clickable {
                                scope.launch {
                                    pagerState.animateScrollToPage(index, animationSpec = pageSpec)
                                }
                            }
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label,
                            tint = if (active) AppColors.GoldDeep else AppColors.Muted,
                            modifier = Modifier.size(22.dp),
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = item.label,
                            fontSize = 13.sp,
                            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                            color = if (active) AppColors.Emerald800 else AppColors.Muted,
                        )
                    }
                }
            }
        },
    ) { padding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.padding(padding),
            beyondBoundsPageCount = 1,
            flingBehavior = PagerDefaults.flingBehavior(
                state = pagerState,
                snapAnimationSpec = pageSpec,
            ),
        ) { page ->
            when (NAV_ITEMS[page].route) {
                "home" -> HomeScreen(
                    bundle = bundle,
                    stateHolder = countdown,
                    onRefresh = { viewModel.refresh() },
                )
                "schedule" -> ScheduleScreen(
                    bundle = bundle,
                    stateHolder = countdown,
                    onRefresh = { viewModel.refresh() },
                )
                "officers" -> OfficersScreen(bundle = bundle)
                "qibla" -> QiblaScreen(bundle = bundle)
                "info" -> InfoScreen(
                    bundle = bundle,
                    onCorrectionChange = { viewModel.setHijriCorrection(it) },
                    onNotificationsChange = { enabled ->
                        val handler = onNotificationsChange
                        if (handler != null) {
                            handler(enabled)
                        } else {
                            viewModel.setNotificationsEnabled(enabled)
                            if (enabled) onEnableNotifications()
                        }
                    },
                    onRefresh = { viewModel.refresh() },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScreenTopBar(
    title: String,
    subtitle: String,
    onRefresh: (() -> Unit)? = null,
    titleTextSize: Int = 22,
    subtitleTextSize: Int = 13,
    logoUrl: String? = null,
) {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (logoUrl != null) {
                    MosqueLogo(
                        logoUrl = logoUrl,
                        modifier = Modifier.size(32.dp),
                        fallbackTint = AppColors.GoldDeep,
                        contentDescription = null,
                    )
                    Spacer(Modifier.width(8.dp))
                }
                Column {
                    Text(
                        text = title,
                        fontSize = titleTextSize.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = subtitle,
                        fontSize = subtitleTextSize.sp,
                        color = AppColors.Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        },
        actions = {
            if (onRefresh != null) {
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Filled.Refresh, contentDescription = "Segarkan", tint = AppColors.Emerald800)
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = AppColors.Ivory,
            titleContentColor = AppColors.Ink,
        ),
    )
}

@Composable
private fun SectionCard(
    title: String,
    titleTextSize: Int = 13,
    titleColor: Color = AppColors.Emerald800,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.Ivory2),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(
                text = title.uppercase(),
                fontSize = titleTextSize.sp,
                fontWeight = FontWeight.ExtraBold,
                color = titleColor,
                letterSpacing = 1.sp,
            )
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
private fun GoldRule() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(AppColors.Gold.copy(alpha = 0.55f)),
    )
}

@Composable
private fun Avatar(initials: String, gold: Boolean = false, textSize: Int = 15) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (gold) AppColors.Gold else AppColors.Beige),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = initials,
            fontSize = textSize.sp,
            fontWeight = FontWeight.ExtraBold,
            color = if (gold) AppColors.Emerald950 else AppColors.Emerald800,
        )
    }
}

private fun initials(name: String): String = name
    .replace("Ust.", "", ignoreCase = true)
    .replace("Ustzh.", "", ignoreCase = true)
    .trim()
    .split(Regex("\\s+"))
    .take(2)
    .joinToString("") { it.firstOrNull()?.uppercase() ?: "" }
    .ifBlank { "-" }

@Composable
private fun HomeScreen(
    bundle: AppBundle,
    stateHolder: State<CountdownState?>,
    onRefresh: () -> Unit,
) {
    val state by stateHolder
    val primary = bundle.primary
    val now = bundle.now()
    Scaffold(
        topBar = {
            ScreenTopBar(
                title = bundle.primary?.mosque?.name?.takeIf { it.isNotBlank() }
                    ?: "Masjid Pondok Tahfizh Plus Abu Dzar",
                subtitle = if (bundle.offline) "Offline · data terakhir tersimpan" else "Rumpin, Kab. Bogor · WIB",
                onRefresh = onRefresh,
                titleTextSize = 16,
                subtitleTextSize = 12,
                logoUrl = primary?.mosque?.logoUrl,
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            item {
                Spacer(Modifier.height(8.dp))
                HeroCard(bundle = bundle, state = state, now = now)
                Spacer(Modifier.height(12.dp))
            }
            item {
                PrayerStrip(data = primary, activeLabel = state?.prayerLabel)
                Spacer(Modifier.height(12.dp))
            }
            item {
                SectionCard(
                    title = "Petugas ${state?.prayerLabel ?: "hari ini"}",
                    titleTextSize = 13,
                    titleColor = AppColors.Emerald800,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(initials(state?.imamName ?: "-"), textSize = 15)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text("IMAM", fontSize = 12.sp, color = AppColors.Muted, fontWeight = FontWeight.ExtraBold)
                            Text(
                                state?.imamName ?: "-",
                                fontSize = 16.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Avatar(initials(state?.muadzinName ?: "-"), gold = true, textSize = 15)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text("MUADZIN", fontSize = 12.sp, color = AppColors.Muted, fontWeight = FontWeight.ExtraBold)
                            Text(
                                state?.muadzinName ?: "-",
                                fontSize = 16.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            item {
                val khatibName = primary?.khutbah?.khatibName
                    ?: primary?.jumat?.khatibName?.takeIf { it.isNotBlank() }
                    ?: primary?.khatibUpcoming?.firstOrNull()?.khatibName
                    ?: "-"
                val khatibTopic = primary?.khutbah?.sermonTopic
                    ?: primary?.jumat?.sermonTopic
                    ?: primary?.khatibUpcoming?.firstOrNull()?.sermonTopic
                val fridayDate = primary?.jumat?.fridayDate.orEmpty()
                val khatibDate = if (fridayDate.isBlank()) {
                    "Jumat mendatang"
                } else {
                    "Jumat, ${ApiParser.shortDate(ApiParser.instant("${fridayDate}T00:00:00Z") ?: now)}"
                }
                SectionCard(
                    title = "Khatib Jumat",
                    titleTextSize = 13,
                    titleColor = AppColors.Emerald800,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(initials(khatibName), gold = true, textSize = 15)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "KHATIB",
                                fontSize = 12.sp,
                                color = AppColors.Muted,
                                fontWeight = FontWeight.ExtraBold,
                            )
                            Text(
                                khatibName,
                                fontSize = 17.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                khatibTopic?.takeIf { it.isNotBlank() } ?: khatibDate,
                                fontSize = 14.sp,
                                color = AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            item {
                val kajian = primary?.kajian?.firstOrNull()
                SectionCard(
                    title = "Agenda Kajian",
                    titleTextSize = 13,
                    titleColor = AppColors.Emerald800,
                ) {
                    if (kajian == null) {
                        Text("Belum ada agenda kajian.", fontSize = 14.sp, color = AppColors.Muted)
                    } else {
                        Row {
                            Box(
                                Modifier
                                    .width(3.dp)
                                    .height(44.dp)
                                    .background(AppColors.Gold),
                            )
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(
                                    kajian.title,
                                    fontSize = 16.sp,
                                    color = AppColors.Ink,
                                    fontWeight = FontWeight.Bold,
                                )
                                Spacer(Modifier.height(3.dp))
                                val time = ApiParser.wallTime(ApiParser.instant(kajian.startDateTime) ?: now)
                                Text(
                                    "$time · ${kajian.speakerName} · ${kajian.location}",
                                    fontSize = 14.sp,
                                    color = AppColors.Muted,
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            item { Spacer(Modifier.height(20.dp)) }
        }
    }
}

@Composable
private fun HeroCard(bundle: AppBundle, state: CountdownState?, now: Long) {
    val hijri = state?.hijri ?: HijriUtil.format(now, bundle.hijriCorrection)
    val mosqueName = bundle.primary?.mosque?.name?.takeIf { it.isNotBlank() }
        ?: "Masjid Pondok Tahfizh Plus Abu Dzar"
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        listOf(Color(0xFF0E4836), AppColors.Emerald900, AppColors.Emerald950),
                    ),
                )
                .padding(18.dp),
        ) {
            Column {
                Text(
                    text = "📍 ${mosqueName.uppercase()}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.GoldSoft,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = hijri,
                    fontSize = 24.sp,
                    fontFamily = FontFamily.Serif,
                    color = Color(0xFFFBF6E9),
                )
                Text(
                    text = ApiParser.gregorian(now),
                    fontSize = 14.sp,
                    color = AppColors.WhiteSoft,
                )
                Spacer(Modifier.height(18.dp))
                Text(
                    text = state?.title?.uppercase() ?: "MENUNGGU DATA SHALAT",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AppColors.WhiteSoft,
                    letterSpacing = 1.sp,
                )
                Text(
                    text = state?.countdown ?: "--:--:--",
                    fontSize = 44.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = if (state?.isUrgent == true) Color(0xFFFF8A7F) else Color(0xFFFFF9EC),
                )
                Spacer(Modifier.height(12.dp))
                Row {
                    HeroPill("ADZAN", state?.adhanTime ?: "--:--")
                    Spacer(Modifier.width(8.dp))
                    HeroPill("IQAMAH", state?.iqamahTime ?: "--:--")
                }
            }
        }
    }
}

@Composable
private fun RowScope.HeroPill(label: String, value: String) {
    Column(
        Modifier
            .weight(1f)
            .clip(RoundedCornerShape(10.dp))
            .background(Color.White.copy(alpha = 0.07f))
            .padding(horizontal = 9.dp, vertical = 7.dp),
    ) {
        Text(label, fontSize = 12.sp, color = AppColors.WhiteSoft, fontWeight = FontWeight.ExtraBold)
        Text(
            value,
            fontSize = 14.sp,
            color = Color(0xFFF7F1E4),
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
        )
    }
}

@Composable
private fun PrayerStrip(data: TvData?, activeLabel: String?) {
    val events = data?.iqamahEvents.orEmpty().sortedBy { it.adhanTime }
    val items = if (events.isNotEmpty()) {
        events.map { it.label to it.adhanTime }
    } else {
        val times = data?.prayerTimes
        listOf(
            "Subuh" to (times?.fajr ?: "--:--"),
            "Dzuhur" to (times?.dhuhr ?: "--:--"),
            "Ashar" to (times?.asr ?: "--:--"),
            "Maghrib" to (times?.maghrib ?: "--:--"),
            "Isya" to (times?.isha ?: "--:--"),
        )
    }
    Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        items.forEach { (label, time) ->
            val active = activeLabel?.contains(label, ignoreCase = true) == true
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (active) AppColors.Emerald800 else AppColors.Ivory2)
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(label, fontSize = 12.sp, color = if (active) Color(0xFFFBF6E9) else AppColors.Muted)
                Text(
                    time,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (active) AppColors.GoldSoft else AppColors.Ink,
                    fontFamily = FontFamily.Monospace,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduleScreen(
    bundle: AppBundle,
    stateHolder: State<CountdownState?>,
    onRefresh: () -> Unit,
) {
    val state by stateHolder
    var tab by remember { mutableIntStateOf(0) }
    val data = bundle.primary
    val now = bundle.now()
    Scaffold(
        topBar = {
            ScreenTopBar(
                title = "Jadwal Shalat",
                subtitle = ApiParser.gregorian(now),
                onRefresh = onRefresh,
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            item {
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(AppColors.Beige)
                        .padding(3.dp),
                ) {
                    listOf("Hari ini", "7 Hari", "Iqamah").forEachIndexed { index, label ->
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(9.dp))
                                .background(if (tab == index) AppColors.Ivory2 else Color.Transparent)
                                .clickable { tab = index }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (tab == index) AppColors.Emerald800 else AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            when (tab) {
                0 -> {
                    val events = data?.iqamahEvents.orEmpty().sortedBy { it.adhanTime }
                    if (events.isEmpty()) {
                        item { EmptyState("Jadwal belum tersedia.") }
                    } else {
                        items(events.size) { index ->
                            val event = events[index]
                            ScheduleRow(
                                label = event.label,
                                adhan = event.adhanTime,
                                iqamah = event.iqamahTime,
                                active = state?.prayerLabel?.contains(event.label, ignoreCase = true) == true,
                            )
                            Spacer(Modifier.height(6.dp))
                        }
                    }
                    item {
                        Spacer(Modifier.height(8.dp))
                        DataStatus(bundle)
                        Spacer(Modifier.height(20.dp))
                    }
                }
                1 -> {
                    val apiWeek = data?.prayerTimesWeek.orEmpty()
                    val week = apiWeek.ifEmpty {
                        val base = data?.prayerTimes
                        if (base == null) {
                            emptyList()
                        } else {
                            (0..6).map { index ->
                                val dateMillis = now + index * 86_400_000L
                                PrayerDay(
                                    date = ApiParser.ymd(dateMillis),
                                    fajr = base.fajr,
                                    dhuhr = base.dhuhr,
                                    asr = base.asr,
                                    maghrib = base.maghrib,
                                    isha = base.isha,
                                )
                            }
                        }
                    }
                    if (week.isEmpty()) {
                        item { EmptyState("Jadwal 7 hari belum tersedia.") }
                    } else {
                        items(week.size) { index ->
                            val day = week[index]
                            val dateMillis = ApiParser.instant("${day.date}T00:00:00Z")
                                ?: now + index * 86_400_000L
                            val dayTitle = if (index == 0) {
                                "Hari Ini · ${ApiParser.shortDate(dateMillis)}"
                            } else {
                                ApiParser.shortDate(dateMillis)
                            }
                            SectionCard(title = dayTitle) {
                                val prayers = listOf(
                                    "Subuh" to day.fajr,
                                    "Dzuhur" to day.dhuhr,
                                    "Ashar" to day.asr,
                                    "Maghrib" to day.maghrib,
                                    "Isya" to day.isha,
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    prayers.forEach { (label, time) ->
                                        Column(
                                            Modifier.weight(1f),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                        ) {
                                            Text(
                                                label,
                                                fontSize = 12.sp,
                                                color = AppColors.Muted,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Spacer(Modifier.height(2.dp))
                                            Text(
                                                time.ifBlank { "--:--" },
                                                fontSize = 14.sp,
                                                color = AppColors.Ink,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = FontFamily.Monospace,
                                            )
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }
                        item { Spacer(Modifier.height(20.dp)) }
                    }
                }
                2 -> {
                    val events = data?.iqamahEvents.orEmpty().sortedBy { it.iqamahTime }
                    items(events.size) { index ->
                        val event = events[index]
                        SectionCard(title = event.label.uppercase()) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Adzan  ${event.adhanTime}", fontSize = 14.sp, color = AppColors.Muted)
                                Text(
                                    "Iqamah ${event.iqamahTime}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = AppColors.Emerald800,
                                )
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ScheduleRow(label: String, adhan: String, iqamah: String, active: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(13.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (active) AppColors.Emerald100 else AppColors.Ivory2,
        ),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(7.dp)
                    .clip(RoundedCornerShape(50))
                    .background(if (active) AppColors.Gold else AppColors.Beige),
            )
            Spacer(Modifier.width(9.dp))
            Text(
                label,
                fontSize = 16.sp,
                color = AppColors.Ink,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            Text(
                adhan,
                fontSize = 16.sp,
                color = AppColors.Ink,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
            )
            Text(
                "  →  $iqamah",
                fontSize = 14.sp,
                color = AppColors.Emerald700,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}

@Composable
private fun DataStatus(bundle: AppBundle) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.Emerald100),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.Refresh,
                contentDescription = null,
                tint = AppColors.Emerald800,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(10.dp))
            Column {
                Text(
                    "Sumber: website resmi masjid",
                    fontSize = 14.sp,
                    color = AppColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    if (bundle.fetchedAt == 0L) {
                        "Belum pernah sinkron"
                    } else {
                        "Sinkron terakhir ${ApiParser.wallTime(bundle.fetchedAt)} WIB"
                    },
                    fontSize = 13.sp,
                    color = AppColors.Muted,
                )
            }
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.Ivory2),
    ) {
        Text(
            message,
            modifier = Modifier
                .fillMaxWidth()
                .padding(22.dp),
            textAlign = TextAlign.Center,
            fontSize = 15.sp,
            color = AppColors.Muted,
        )
    }
}

private data class KhatibView(
    val title: String,
    val name: String?,
    val topic: String?,
    val featured: Boolean = false,
)

@Composable
private fun KhatibEntry(view: KhatibView) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (view.featured) Color(0xFFF5ECD9) else AppColors.Ivory2,
        ),
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(
                view.title.uppercase(),
                fontSize = 12.sp,
                fontWeight = FontWeight.ExtraBold,
                color = AppColors.Muted,
            )
            Spacer(Modifier.height(5.dp))
            Text(
                view.name?.takeIf { it.isNotBlank() } ?: "-",
                fontSize = if (view.featured) 20.sp else 17.sp,
                fontFamily = FontFamily.Serif,
                color = AppColors.Ink,
            )
            Text(
                view.topic?.takeIf { it.isNotBlank() } ?: "Belum dijadwalkan",
                fontSize = 14.sp,
                color = AppColors.Muted,
            )
        }
    }
    Spacer(Modifier.height(8.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OfficersScreen(bundle: AppBundle) {
    var period by remember { mutableIntStateOf(0) }
    var tab by remember { mutableIntStateOf(0) }
    val data = bundle.primary
    val now = bundle.now()

    val prayerOrder = mapOf(
        "subuh" to 0,
        "dzuhur" to 1,
        "zuhur" to 1,
        "ashar" to 2,
        "asar" to 2,
        "maghrib" to 3,
        "magrib" to 3,
        "isya" to 4,
    )

    val fridayDate = data?.jumat?.fridayDate.orEmpty()
    val currentKhatib = if (fridayDate.isNotBlank()) {
        KhatibView(
            title = "Jumat Ini · ${
                ApiParser.shortDate(
                    ApiParser.instant("${fridayDate}T00:00:00Z") ?: now,
                )
            }",
            name = data?.jumat?.khatibName,
            topic = data?.jumat?.sermonTopic,
            featured = true,
        )
    } else {
        null
    }
    val upcomingKhatibs = data?.khatibUpcoming.orEmpty()
        .filter { it.fridayDate != fridayDate }
        .distinctBy { it.fridayDate }
        .take(4)
        .map { item ->
            KhatibView(
                title = ApiParser.shortDate(
                    ApiParser.instant("${item.fridayDate}T00:00:00Z") ?: now,
                ),
                name = item.khatibName,
                topic = item.sermonTopic,
            )
        }
    val khatibViews = listOfNotNull(currentKhatib) +
        if (period == 1) upcomingKhatibs else emptyList()

    Scaffold(
        topBar = {
            ScreenTopBar(
                title = "Petugas",
                subtitle = "${if (period == 0) "Harian" else "Pekanan"} · ${ApiParser.gregorian(now)}",
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            item {
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(AppColors.Beige)
                        .padding(3.dp),
                ) {
                    listOf("Harian", "Pekanan").forEachIndexed { index, label ->
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(9.dp))
                                .background(if (period == index) AppColors.Ivory2 else Color.Transparent)
                                .clickable { period = index }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (period == index) AppColors.Emerald800 else AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    listOf("Imam", "Muadzin", "Khatib").forEachIndexed { index, label ->
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(if (tab == index) AppColors.Emerald800 else AppColors.Ivory2)
                                .clickable { tab = index }
                                .padding(horizontal = 14.dp, vertical = 7.dp),
                        ) {
                            Text(
                                label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (tab == index) Color.White else AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            if (tab < 2) {
                if (period == 0) {
                    val duties = data?.imamToday.orEmpty()
                    if (duties.isEmpty()) {
                        item { EmptyState("Jadwal petugas belum tersedia.") }
                    } else {
                        items(duties.size) { index ->
                            val duty = duties[index]
                            SectionCard(title = duty.prayerName.uppercase()) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Avatar(initials(if (tab == 0) duty.imamName else duty.muadzinName))
                                    Spacer(Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            if (tab == 0) duty.imamName else duty.muadzinName,
                                            fontSize = 16.sp,
                                            color = AppColors.Ink,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Text(
                                            if (tab == 0) "Muadzin: ${duty.muadzinName}" else "Imam: ${duty.imamName}",
                                            fontSize = 13.sp,
                                            color = AppColors.Muted,
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                } else {
                    val duties = data?.imamWeek.orEmpty()
                    if (duties.isEmpty()) {
                        item { EmptyState("Jadwal petugas pekanan belum tersedia.") }
                    } else {
                        duties.groupBy { it.date }.toSortedMap().forEach { (date, dayDuties) ->
                            item {
                                val dateMillis = ApiParser.instant("${date}T00:00:00Z") ?: now
                                val title = if (date == ApiParser.ymd(now)) {
                                    "Hari Ini · ${ApiParser.shortDate(dateMillis)}"
                                } else {
                                    ApiParser.shortDate(dateMillis)
                                }
                                SectionCard(title = title) {
                                    dayDuties
                                        .sortedBy { prayerOrder[it.prayerName.lowercase(Locale.ROOT)] ?: 99 }
                                        .forEachIndexed { index, duty ->
                                            if (index > 0) {
                                                Spacer(Modifier.height(8.dp))
                                                GoldRule()
                                                Spacer(Modifier.height(8.dp))
                                            }
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(
                                                    duty.prayerName,
                                                    modifier = Modifier.weight(1f),
                                                    fontSize = 14.sp,
                                                    color = AppColors.Muted,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Text(
                                                    if (tab == 0) duty.imamName else duty.muadzinName,
                                                    fontSize = 15.sp,
                                                    color = AppColors.Ink,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                            }
                                            Text(
                                                if (tab == 0) "Muadzin: ${duty.muadzinName}" else "Imam: ${duty.imamName}",
                                                fontSize = 12.sp,
                                                color = AppColors.Muted,
                                            )
                                        }
                                }
                                Spacer(Modifier.height(8.dp))
                            }
                        }
                    }
                }
            } else {
                if (khatibViews.isEmpty()) {
                    item { EmptyState("Jadwal khatib belum tersedia.") }
                } else {
                    items(khatibViews.size) { index ->
                        KhatibEntry(khatibViews[index])
                    }
                }
            }
            item { Spacer(Modifier.height(20.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QiblaScreen(bundle: AppBundle) {
    // Koordinat masjid berasal dari pengaturan admin lewat API, dengan fallback
    // bila data belum tersedia atau tidak valid.
    val mosque = bundle.primary?.mosque
    val lat = mosque?.latitude
        ?.takeIf { it.isFinite() && it in -90.0..90.0 }
        ?: ReminderConfig.DEFAULT_LATITUDE
    val lon = mosque?.longitude
        ?.takeIf { it.isFinite() && it in -180.0..180.0 }
        ?: ReminderConfig.DEFAULT_LONGITUDE
    val bearing = QiblaCalculator.bearing(lat, lon)
    var sensorReady by remember { mutableStateOf(true) }
    val reportSensor = remember { { ready: Boolean -> sensorReady = ready } }
    Scaffold(topBar = { ScreenTopBar("Kiblat", "Kompas digital berbasis sensor") }) { padding ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding)
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            item {
                Spacer(Modifier.height(10.dp))
                QiblaCompass(
                    latitude = lat,
                    longitude = lon,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(280.dp),
                    onSensorAvailabilityChange = reportSensor,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "ARAH KIBLAT DARI MASJID",
                    fontSize = 14.sp,
                    color = AppColors.Muted,
                    fontWeight = FontWeight.ExtraBold,
                )
                Text(
                    "%.0f° · %s".format(bearing, QiblaCalculator.direction(bearing)),
                    fontSize = 24.sp,
                    fontFamily = FontFamily.Serif,
                    color = AppColors.Emerald800,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    if (sensorReady) {
                        "Sensor aktif · kalibrasi dengan menggambar angka 8"
                    } else {
                        "Sensor tidak tersedia · arah tetap dihitung dari koordinat"
                    },
                    fontSize = 14.sp,
                    color = if (sensorReady) AppColors.Emerald700 else AppColors.Alert,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(12.dp))
            }
            item {
                SectionCard(title = "Koordinat Resmi") {
                    InfoLine("Lokasi", "$lat, $lon")
                    GoldRule()
                    Spacer(Modifier.height(9.dp))
                    InfoLine(
                        "Alamat",
                        mosque?.address?.takeIf { it.isNotBlank() }
                            ?: "Rumpin, Kabupaten Bogor, Jawa Barat",
                    )
                    GoldRule()
                    Spacer(Modifier.height(9.dp))
                    InfoLine("Zona waktu", "Asia/Jakarta (WIB)")
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun InfoLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 14.sp, color = AppColors.Muted)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = AppColors.Ink)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InfoScreen(
    bundle: AppBundle,
    onCorrectionChange: (Int) -> Unit,
    onNotificationsChange: (Boolean) -> Unit,
    onRefresh: () -> Unit,
) {
    val context = LocalContext.current
    Scaffold(topBar = { ScreenTopBar("Informasi", "Masjid & pengaturan") }) { padding ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            item {
                Spacer(Modifier.height(10.dp))
                SectionCard(title = "Profil Masjid") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(42.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(AppColors.Emerald800),
                            contentAlignment = Alignment.Center,
                        ) {
                            MosqueLogo(
                                logoUrl = bundle.primary?.mosque?.logoUrl,
                                modifier = Modifier.size(24.dp),
                                fallbackTint = AppColors.GoldSoft,
                                contentDescription = null,
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                bundle.primary?.mosque?.name ?: "Masjid Pondok Tahfizh Plus Abu Dzar",
                                fontSize = 16.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                bundle.primary?.mosque?.address ?: "Rumpin, Kab. Bogor, Jawa Barat",
                                fontSize = 13.sp,
                                color = AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            item {
                SectionCard(title = "Agenda Kajian") {
                    val kajian = bundle.primary?.kajian.orEmpty()
                    if (kajian.isEmpty()) {
                        Text("Belum ada agenda.", fontSize = 14.sp, color = AppColors.Muted)
                    } else {
                        kajian.take(3).forEachIndexed { index, item ->
                            if (index > 0) {
                                Spacer(Modifier.height(8.dp))
                                GoldRule()
                                Spacer(Modifier.height(8.dp))
                            }
                            Text(
                                item.title,
                                fontSize = 16.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                "${item.speakerName} · ${item.location}",
                                fontSize = 13.sp,
                                color = AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            item {
                SectionCard(title = "Pengaturan") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.DateRange,
                            contentDescription = null,
                            tint = AppColors.Emerald800,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Koreksi Tanggal Hijriah",
                                fontSize = 15.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("Umm al-Qura · Kemenag", fontSize = 13.sp, color = AppColors.Muted)
                        }
                        Row(
                            Modifier
                                .clip(RoundedCornerShape(9.dp))
                                .background(AppColors.Beige),
                        ) {
                            listOf(-1, 0, 1).forEach { value ->
                                Box(
                                    Modifier
                                        .size(28.dp)
                                        .background(
                                            if (bundle.hijriCorrection == value) AppColors.Gold else Color.Transparent,
                                        )
                                        .clickable { onCorrectionChange(value) },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        if (value > 0) "+" else value.toString(),
                                        fontSize = 15.sp,
                                        color = AppColors.Ink,
                                        fontWeight = FontWeight.ExtraBold,
                                    )
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    GoldRule()
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Notifications,
                            contentDescription = null,
                            tint = AppColors.Emerald800,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Notifikasi permanen",
                                fontSize = 15.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("Countdown di notification shade", fontSize = 13.sp, color = AppColors.Muted)
                        }
                        Switch(
                            checked = bundle.notificationsEnabled,
                            onCheckedChange = onNotificationsChange,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    GoldRule()
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.Refresh,
                            contentDescription = null,
                            tint = AppColors.Emerald800,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Sinkronisasi data",
                                fontSize = 15.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                when {
                                    bundle.fetchedAt == 0L -> "Belum pernah sinkron"
                                    bundle.offline -> "Offline · cache terakhir"
                                    else -> "Online · ${ApiParser.wallTime(bundle.fetchedAt)} WIB"
                                },
                                fontSize = 13.sp,
                                color = if (bundle.offline) AppColors.Alert else AppColors.Emerald700,
                            )
                        }
                        Text(
                            "SEKARANG",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = AppColors.Emerald800,
                            modifier = Modifier.clickable { onRefresh() },
                        )
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        Spacer(Modifier.height(12.dp))
                        GoldRule()
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "Izinkan alarm presisi agar pengingat adzan tepat waktu.",
                            fontSize = 13.sp,
                            color = AppColors.Muted,
                            modifier = Modifier.clickable {
                                runCatching {
                                    context.startActivity(
                                        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM),
                                    )
                                }
                            },
                        )
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        Spacer(Modifier.height(10.dp))
                        val power = context.getSystemService(PowerManager::class.java)
                        val ignored = power?.isIgnoringBatteryOptimizations(context.packageName) == true
                        Text(
                            "Optimasi baterai: ${if (ignored) "dinonaktifkan" else "aktif"} · ketuk untuk mengatur",
                            fontSize = 13.sp,
                            color = AppColors.Muted,
                            modifier = Modifier.clickable {
                                runCatching {
                                    context.startActivity(
                                        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                                            .setData(Uri.parse("package:${context.packageName}")),
                                    )
                                }
                            },
                        )
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

