package id.or.id.masjidabudzar.ui

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerDefaults
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.or.id.masjidabudzar.ApiParser
import id.or.id.masjidabudzar.BuildConfig
import id.or.id.masjidabudzar.AppBundle
import id.or.id.masjidabudzar.CountdownState
import id.or.id.masjidabudzar.HijriUtil
import id.or.id.masjidabudzar.PrayerDay
import id.or.id.masjidabudzar.ReminderConfig
import id.or.id.masjidabudzar.TvData
import kotlinx.coroutines.launch
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

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
    val pagerScrolling by remember { derivedStateOf { pagerState.isScrollInProgress } }
    val countdown = remember { mutableStateOf<CountdownState?>(null) }
    val scope = rememberCoroutineScope()

    // Animasi pergerakan slide mulus tanpa guncangan kasar (damping ratio 1.0 = no bouncy)
    val pageSpec = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow,
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
            PremiumBottomNavBar(
                items = NAV_ITEMS,
                pagerState = pagerState,
                onItemSelect = { index ->
                    scope.launch {
                        pagerState.animateScrollToPage(index, animationSpec = pageSpec)
                    }
                },
            )
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
            // Efek transformasi slide mulus: parallax halus + scale + fade ringan.
            // Snapshot pager dibaca di dalam graphicsLayer agar tidak memicu
            // recomposition seluruh halaman pada setiap frame geseran.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        val pageOffset =
                            ((pagerState.currentPage - page) + pagerState.currentPageOffsetFraction)
                        val absOffset = abs(pageOffset).coerceIn(0f, 1f)
                        scaleX = 1f - (absOffset * 0.04f)
                        scaleY = 1f - (absOffset * 0.04f)
                        alpha = 1f - (absOffset * 0.40f)
                    },
            ) {
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
}

/**
 * Bottom Navigation Bar Mewah dengan Indikator Geser (Sliding Pill) Real-Time.
 * Indikator meluncur mengikuti sapuan jari di layar secara presisi.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun PremiumBottomNavBar(
    items: List<NavItem>,
    pagerState: androidx.compose.foundation.pager.PagerState,
    onItemSelect: (Int) -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 14.dp, shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
        color = AppColors.Ivory2,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        border = BorderStroke(0.8.dp, AppColors.Gold.copy(alpha = 0.25f)),
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
        ) {
            val totalWidth = maxWidth
            val tabWidth = totalWidth / items.size

            // Indikator Geser Mulus (Sliding Pill). Posisi dibaca di dalam
            // lambda offset supaya hanya layer indikator yang berubah.
            Box(
                modifier = Modifier
                    .offset {
                        val currentPos =
                            (pagerState.currentPage + pagerState.currentPageOffsetFraction)
                                .coerceIn(0f, (items.size - 1).toFloat())
                        IntOffset((tabWidth.value * density * currentPos).roundToInt(), 0)
                    }
                    .width(tabWidth)
                    .height(54.dp)
                    .padding(horizontal = 4.dp, vertical = 3.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                AppColors.Emerald100.copy(alpha = 0.85f),
                                AppColors.Emerald50,
                            ),
                        ),
                    )
                    .border(
                        BorderStroke(1.dp, AppColors.Emerald700.copy(alpha = 0.18f)),
                        RoundedCornerShape(16.dp),
                    ),
            )

            // Baris Tombol Tab
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                items.forEachIndexed { index, item ->
                    val isSelected = pagerState.currentPage == index
                    val iconScale by animateFloatAsState(
                        targetValue = if (isSelected) 1.1f else 1f,
                        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                        label = "navIconScale",
                    )

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .clickable { onItemSelect(index) }
                            .padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label,
                            tint = if (isSelected) AppColors.Emerald800 else AppColors.Muted,
                            modifier = Modifier
                                .size(21.dp)
                                .graphicsLayer {
                                    scaleX = iconScale
                                    scaleY = iconScale
                                },
                        )
                        Spacer(Modifier.height(3.dp))
                        Text(
                            text = item.label,
                            fontSize = 11.5.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) AppColors.Emerald900 else AppColors.Muted,
                            letterSpacing = 0.2.sp,
                        )
                    }
                }
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
    titleTextSize: Int = 18,
    subtitleTextSize: Int = 12,
    logoUrl: String? = null,
) {
    var refreshRequest by remember { mutableIntStateOf(0) }
    val rotation = remember { Animatable(0f) }
    LaunchedEffect(refreshRequest) {
        if (refreshRequest > 0) {
            rotation.snapTo(0f)
            rotation.animateTo(360f, animationSpec = tween(durationMillis = 500))
            rotation.snapTo(0f)
        }
    }

    TopAppBar(
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 4.dp),
            ) {
                if (logoUrl != null) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(11.dp))
                            .background(Color.White)
                            .border(BorderStroke(1.2.dp, AppColors.Gold.copy(alpha = 0.6f)), RoundedCornerShape(11.dp))
                            .padding(4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        MosqueLogo(
                            logoUrl = logoUrl,
                            modifier = Modifier.size(28.dp),
                            fallbackTint = AppColors.GoldDeep,
                            contentDescription = null,
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                }
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = title,
                            fontSize = titleTextSize.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Serif,
                            color = AppColors.Ink,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(AppColors.Emerald100)
                                .padding(horizontal = 5.dp, vertical = 1.dp),
                        ) {
                            Text(
                                "RESMI",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = AppColors.Emerald800,
                                letterSpacing = 0.5.sp,
                            )
                        }
                    }
                    Spacer(Modifier.height(1.dp))
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
                IconButton(
                    onClick = {
                        refreshRequest++
                        onRefresh()
                    },
                ) {
                    Icon(
                        Icons.Filled.Refresh,
                        contentDescription = "Segarkan",
                        tint = AppColors.Emerald800,
                        modifier = Modifier.rotate(rotation.value),
                    )
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
    titleTextSize: Int = 12,
    titleColor: Color = AppColors.Emerald800,
    action: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.Ivory2),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp),
        border = BorderStroke(0.9.dp, AppColors.BorderSubtle),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(AppColors.Gold),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = title.uppercase(),
                        fontSize = titleTextSize.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = titleColor,
                        letterSpacing = 0.8.sp,
                    )
                }
                action?.invoke()
            }
            Spacer(Modifier.height(12.dp))
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
            .background(AppColors.Gold.copy(alpha = 0.35f)),
    )
}

@Composable
private fun Avatar(initials: String, gold: Boolean = false, textSize: Int = 14) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(13.dp))
            .background(
                if (gold) {
                    Brush.linearGradient(listOf(AppColors.GoldSoft, AppColors.Gold))
                } else {
                    Brush.linearGradient(listOf(AppColors.Emerald100, AppColors.Beige))
                },
            )
            .border(
                BorderStroke(
                    1.2.dp,
                    if (gold) AppColors.GoldDeep.copy(alpha = 0.5f) else AppColors.Emerald700.copy(alpha = 0.25f),
                ),
                RoundedCornerShape(13.dp),
            ),
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

private fun kajianScheduleLabel(startDateTime: String, now: Long): String {
    val start = ApiParser.instant(startDateTime) ?: return "Jadwal belum tersedia"
    val day = if (ApiParser.ymd(start) == ApiParser.ymd(now)) {
        "Hari ini"
    } else {
        ApiParser.shortDate(start)
    }
    return "$day · ${ApiParser.wallTime(start)}"
}

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
                subtitle = if (bundle.offline) "Mode Offline · Data tersimpan" else "Rumpin, Kab. Bogor · Waktu Indonesia Barat",
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
                Spacer(Modifier.height(14.dp))
            }
            item {
                PrayerStrip(data = primary, activeLabel = state?.prayerLabel)
                Spacer(Modifier.height(14.dp))
            }
            item {
                SectionCard(
                    title = "Petugas Shalat ${state?.prayerLabel ?: "Hari Ini"}",
                    titleTextSize = 12,
                    titleColor = AppColors.Emerald800,
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        // Card Imam
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = AppColors.Emerald50,
                            border = BorderStroke(1.dp, AppColors.Emerald100),
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Avatar(initials(state?.imamName ?: "-"), textSize = 13)
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text("IMAM", fontSize = 10.5.sp, color = AppColors.Emerald700, fontWeight = FontWeight.ExtraBold)
                                    Text(
                                        state?.imamName ?: "-",
                                        fontSize = 14.5.sp,
                                        color = AppColors.Ink,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }

                        // Card Muadzin
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = AppColors.GoldLight,
                            border = BorderStroke(1.dp, AppColors.GoldSoft.copy(alpha = 0.5f)),
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Avatar(initials(state?.muadzinName ?: "-"), gold = true, textSize = 13)
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text("MUADZIN", fontSize = 10.5.sp, color = AppColors.GoldDeep, fontWeight = FontWeight.ExtraBold)
                                    Text(
                                        state?.muadzinName ?: "-",
                                        fontSize = 14.5.sp,
                                        color = AppColors.Ink,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
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
                    title = "Khatib Shalat Jumat",
                    titleTextSize = 12,
                    titleColor = AppColors.Emerald800,
                ) {
                    Surface(
                        shape = RoundedCornerShape(15.dp),
                        color = Color(0xFFF9F4EB),
                        border = BorderStroke(1.dp, AppColors.GoldSoft.copy(alpha = 0.6f)),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Avatar(initials(khatibName), gold = true, textSize = 15)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "KHATIB JUM'AT",
                                        fontSize = 10.5.sp,
                                        color = AppColors.GoldDeep,
                                        fontWeight = FontWeight.ExtraBold,
                                        letterSpacing = 0.5.sp,
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        "· $khatibDate",
                                        fontSize = 11.5.sp,
                                        color = AppColors.Muted,
                                    )
                                }
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    khatibName,
                                    fontSize = 17.sp,
                                    fontFamily = FontFamily.Serif,
                                    color = AppColors.Ink,
                                    fontWeight = FontWeight.Bold,
                                )
                                if (!khatibTopic.isNullOrBlank()) {
                                    Spacer(Modifier.height(3.dp))
                                    Text(
                                        "“$khatibTopic”",
                                        fontSize = 13.5.sp,
                                        color = AppColors.Muted,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
            }
            item {
                val kajian = primary?.kajian?.firstOrNull()
                SectionCard(
                    title = "Agenda Kajian Terdekat",
                    titleTextSize = 12,
                    titleColor = AppColors.Emerald800,
                ) {
                    if (kajian == null) {
                        EmptyState("Belum ada agenda kajian terjadwal.")
                    } else {
                        Surface(
                            shape = RoundedCornerShape(15.dp),
                            color = AppColors.SurfaceElevated,
                            border = BorderStroke(1.dp, AppColors.BorderSubtle),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    Modifier
                                        .width(3.5.dp)
                                        .height(52.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(AppColors.Gold),
                                )
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(
                                        kajian.title,
                                        fontSize = 16.sp,
                                        color = AppColors.Ink,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    val schedule = kajianScheduleLabel(kajian.startDateTime, now)
                                    val detail = if (kajian.kajianType == "LIBUR") {
                                        "Tidak ada kajian"
                                    } else {
                                        listOf(kajian.speakerName, kajian.location)
                                            .filter { it.isNotBlank() }
                                            .joinToString(" · ")
                                    }
                                    Text(
                                        "$schedule · $detail",
                                        fontSize = 13.5.sp,
                                        color = AppColors.Muted,
                                    )
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

/**
 * Hero Card Mewah dengan Gradasi Zamrud Gelap, Aksen Emas, dan Timer Berpendar.
 */
@Composable
private fun HeroCard(bundle: AppBundle, state: CountdownState?, now: Long) {
    val hijri = state?.hijri ?: HijriUtil.format(now, bundle.hijriCorrection)
    val mosqueName = bundle.primary?.mosque?.name?.takeIf { it.isNotBlank() }
        ?: "Masjid Pondok Tahfizh Plus Abu Dzar"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 12.dp, shape = RoundedCornerShape(24.dp), spotColor = AppColors.Emerald950),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(1.dp, AppColors.BorderGold),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(AppColors.HeroGradient)
                .padding(20.dp),
        ) {
            Column {
                // Header Lokasi Masjid
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.White.copy(alpha = 0.08f))
                            .padding(horizontal = 9.dp, vertical = 4.dp),
                    ) {
                        Text(
                            text = "📍 ${mosqueName.uppercase()}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.GoldSoft,
                            letterSpacing = 0.5.sp,
                        )
                    }

                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(if (bundle.offline) AppColors.Alert.copy(alpha = 0.2f) else AppColors.Gold.copy(alpha = 0.2f))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    ) {
                        Text(
                            text = if (bundle.offline) "OFFLINE" else "ONLINE",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (bundle.offline) Color(0xFFFF9E95) else AppColors.GoldSoft,
                            letterSpacing = 0.5.sp,
                        )
                    }
                }

                Spacer(Modifier.height(14.dp))

                // Tanggal Hijriah & Masehi
                Text(
                    text = hijri,
                    fontSize = 24.sp,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFFCF7EE),
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = ApiParser.gregorian(now),
                    fontSize = 13.5.sp,
                    color = AppColors.WhiteSoft.copy(alpha = 0.85f),
                )

                Spacer(Modifier.height(20.dp))

                // Label Status Fase Shalat
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(if (state?.isUrgent == true) Color(0xFFFF8A7F) else AppColors.Gold),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = state?.title?.uppercase() ?: "MENUNGGU JADWAL SHALAT",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (state?.isUrgent == true) Color(0xFFFFADA5) else AppColors.GoldSoft,
                        letterSpacing = 1.sp,
                    )
                }

                Spacer(Modifier.height(4.dp))

                // Jam Hitung Mundur Besar Berpendar
                Text(
                    text = state?.countdown ?: "--:--:--",
                    fontSize = 46.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = if (state?.isUrgent == true) Color(0xFFFF8A7F) else Color(0xFFFFF9EC),
                    letterSpacing = 1.sp,
                )

                Spacer(Modifier.height(16.dp))

                // Pil Adzan & Iqamah
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    HeroPill(
                        label = "WAKTU ADZAN",
                        value = state?.adhanTime ?: "--:--",
                        icon = "📢",
                    )
                    HeroPill(
                        label = "WAKTU IQAMAH",
                        value = state?.iqamahTime ?: "--:--",
                        icon = "⏱",
                    )
                }
            }
        }
    }
}

@Composable
private fun RowScope.HeroPill(label: String, value: String, icon: String) {
    Surface(
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(13.dp),
        color = Color.White.copy(alpha = 0.08f),
        border = BorderStroke(0.8.dp, Color.White.copy(alpha = 0.12f)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(icon, fontSize = 16.sp)
            Spacer(Modifier.width(8.dp))
            Column {
                Text(
                    label,
                    fontSize = 10.sp,
                    color = AppColors.WhiteSoft.copy(alpha = 0.75f),
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.5.sp,
                )
                Text(
                    value,
                    fontSize = 15.sp,
                    color = Color(0xFFF9F4EB),
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                )
            }
        }
    }
}

/**
 * Strip Jadwal Shalat 5 Waktu di Beranda dengan Highlight Emas untuk Waktu Aktif.
 */
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

    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEach { (label, time) ->
            val active = activeLabel?.contains(label, ignoreCase = true) == true
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .shadow(
                        elevation = if (active) 4.dp else 0.5.dp,
                        shape = RoundedCornerShape(14.dp),
                    ),
                shape = RoundedCornerShape(14.dp),
                color = if (active) AppColors.Emerald800 else AppColors.Ivory2,
                border = BorderStroke(
                    width = if (active) 1.5.dp else 0.8.dp,
                    color = if (active) AppColors.Gold else AppColors.BorderSubtle,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    if (active) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(AppColors.Gold)
                                .padding(horizontal = 4.dp, vertical = 0.5.dp),
                        ) {
                            Text(
                                "AKTIF",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = AppColors.Emerald950,
                            )
                        }
                        Spacer(Modifier.height(2.dp))
                    }
                    Text(
                        label,
                        fontSize = 11.5.sp,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                        color = if (active) Color(0xFFFCF6EA) else AppColors.Muted,
                    )
                    Spacer(Modifier.height(3.dp))
                    Text(
                        time,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (active) AppColors.GoldSoft else AppColors.Ink,
                        fontFamily = FontFamily.Monospace,
                    )
                }
            }
        }
    }
}

/**
 * Layar Jadwal Shalat dengan Tab Geser Mulus (AnimatedContent Slide).
 */
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
    val tabLabels = listOf("Hari Ini", "7 Hari", "Iqamah")

    Scaffold(
        topBar = {
            ScreenTopBar(
                title = "Jadwal Shalat",
                subtitle = ApiParser.gregorian(now),
                onRefresh = onRefresh,
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding),
        ) {
            Spacer(Modifier.height(10.dp))
            SlidingSegmentedControl(
                items = tabLabels,
                selectedIndex = tab,
                onSelect = { tab = it },
            )
            Spacer(Modifier.height(14.dp))

            AnimatedContent(
                modifier = Modifier.fillMaxSize(),
                targetState = tab,
                transitionSpec = {
                    if (targetState > initialState) {
                        slideInHorizontally(
                            animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                        ) { it } + fadeIn() togetherWith
                            slideOutHorizontally(
                                animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                            ) { -it } + fadeOut()
                    } else {
                        slideInHorizontally(
                            animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                        ) { -it } + fadeIn() togetherWith
                            slideOutHorizontally(
                                animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                            ) { it } + fadeOut()
                    }
                },
                label = "scheduleTabContent",
            ) { currentTab ->
                LazyColumn(
                    Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                ) {
                    when (currentTab) {
                        0 -> {
                            val events = data?.iqamahEvents.orEmpty().sortedBy { it.adhanTime }
                            if (events.isEmpty()) {
                                item { EmptyState("Jadwal hari ini belum tersedia.") }
                            } else {
                                items(events.size) { index ->
                                    val event = events[index]
                                    ScheduleRow(
                                        label = event.label,
                                        adhan = event.adhanTime,
                                        iqamah = event.iqamahTime,
                                        active = state?.prayerLabel?.contains(
                                            event.label,
                                            ignoreCase = true,
                                        ) == true,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                }
                            }
                            item {
                                Spacer(Modifier.height(10.dp))
                                DataStatus(bundle)
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
                                                        fontSize = 11.5.sp,
                                                        color = AppColors.Muted,
                                                        fontWeight = FontWeight.Bold,
                                                    )
                                                    Spacer(Modifier.height(3.dp))
                                                    Text(
                                                        time.ifBlank { "--:--" },
                                                        fontSize = 13.5.sp,
                                                        color = AppColors.Ink,
                                                        fontWeight = FontWeight.Bold,
                                                        fontFamily = FontFamily.Monospace,
                                                    )
                                                }
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                }
                            }
                        }

                        2 -> {
                            val events = data?.iqamahEvents.orEmpty().sortedBy { it.iqamahTime }
                            if (events.isEmpty()) {
                                item { EmptyState("Jadwal jeda iqamah belum tersedia.") }
                            } else {
                                items(events.size) { index ->
                                    val event = events[index]
                                    SectionCard(title = event.label.uppercase()) {
                                        Row(
                                            Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column {
                                                Text("Waktu Adzan", fontSize = 12.sp, color = AppColors.Muted)
                                                Text(
                                                    event.adhanTime,
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    fontFamily = FontFamily.Monospace,
                                                    color = AppColors.Ink,
                                                )
                                            }
                                            Text("➔", fontSize = 16.sp, color = AppColors.GoldDeep)
                                            Column(horizontalAlignment = Alignment.End) {
                                                Text(
                                                    "Waktu Iqamah",
                                                    fontSize = 12.sp,
                                                    color = AppColors.Emerald800,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Text(
                                                    event.iqamahTime,
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    fontFamily = FontFamily.Monospace,
                                                    color = AppColors.Emerald800,
                                                )
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                }
                            }
                        }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}
/**
 * Komponen Tab Geser (Sliding Segmented Control) dengan Pil Bergerak Halus.
 */
@Composable
private fun SlidingSegmentedControl(
    items: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = AppColors.Beige.copy(alpha = 0.6f),
        border = BorderStroke(1.dp, AppColors.BorderSubtle),
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .padding(3.dp),
        ) {
            val tabWidth = maxWidth / items.size
            val indicatorOffset by animateDpAsState(
                targetValue = tabWidth * selectedIndex,
                animationSpec = spring(dampingRatio = 0.85f, stiffness = Spring.StiffnessMediumLow),
                label = "segmentOffset",
            )

            // Pil indikator yang meluncur mulus
            Box(
                modifier = Modifier
                    .offset(x = indicatorOffset)
                    .width(tabWidth)
                    .height(38.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(AppColors.Ivory2)
                    .shadow(1.dp, RoundedCornerShape(13.dp))
                    .border(BorderStroke(0.8.dp, AppColors.Gold.copy(alpha = 0.3f)), RoundedCornerShape(13.dp)),
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(38.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                items.forEachIndexed { index, label ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(13.dp))
                            .clickable { onSelect(index) }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = label,
                            fontSize = 13.sp,
                            fontWeight = if (selectedIndex == index) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedIndex == index) AppColors.Emerald800 else AppColors.Muted,
                        )
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
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (active) AppColors.Emerald50 else AppColors.Ivory2,
        ),
        border = BorderStroke(
            width = if (active) 1.5.dp else 0.8.dp,
            color = if (active) AppColors.Gold else AppColors.BorderSubtle,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (active) 2.dp else 1.dp),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(if (active) AppColors.Gold else AppColors.Emerald700.copy(alpha = 0.3f)),
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    label,
                    fontSize = 16.sp,
                    color = AppColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                if (active) {
                    Text(
                        "Sedang Berlangsung",
                        fontSize = 11.sp,
                        color = AppColors.Emerald700,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            Text(
                adhan,
                fontSize = 16.sp,
                color = AppColors.Ink,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                "➔",
                fontSize = 14.sp,
                color = AppColors.GoldDeep,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                iqamah,
                fontSize = 15.sp,
                color = AppColors.Emerald800,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}

@Composable
private fun DataStatus(bundle: AppBundle) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = AppColors.Emerald50,
        border = BorderStroke(1.dp, AppColors.Emerald100),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(AppColors.Emerald100),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.Refresh,
                    contentDescription = null,
                    tint = AppColors.Emerald800,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    "Sumber Resmi Masjid Abu Dzar",
                    fontSize = 13.5.sp,
                    color = AppColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    if (bundle.fetchedAt == 0L) {
                        "Belum pernah sinkron"
                    } else {
                        "Sinkron terakhir ${ApiParser.wallTime(bundle.fetchedAt)} WIB"
                    },
                    fontSize = 12.5.sp,
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
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = AppColors.Ivory2),
        border = BorderStroke(0.8.dp, AppColors.BorderSubtle),
    ) {
        Text(
            message,
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            textAlign = TextAlign.Center,
            fontSize = 14.sp,
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
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (view.featured) Color(0xFFF9F4EB) else AppColors.Ivory2,
        ),
        border = BorderStroke(
            1.dp,
            if (view.featured) AppColors.GoldSoft else AppColors.BorderSubtle,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (view.featured) 2.dp else 1.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (view.featured) AppColors.Gold else AppColors.Emerald100)
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                ) {
                    Text(
                        view.title.uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (view.featured) AppColors.Emerald950 else AppColors.Emerald800,
                        letterSpacing = 0.5.sp,
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                view.name?.takeIf { it.isNotBlank() } ?: "-",
                fontSize = if (view.featured) 20.sp else 17.sp,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                color = AppColors.Ink,
            )
            Spacer(Modifier.height(3.dp))
            Text(
                view.topic?.takeIf { it.isNotBlank() } ?: "Tema khutbah belum dijadwalkan",
                fontSize = 13.5.sp,
                color = AppColors.Muted,
            )
        }
    }
    Spacer(Modifier.height(10.dp))
}

/**
 * Layar Petugas dengan Tab Geser Ganda (Harian/Pekanan & Imam/Muadzin/Khatib).
 */
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

    Scaffold(
        topBar = {
            ScreenTopBar(
                title = "Petugas Masjid",
                subtitle = "${if (period == 0) "Jadwal Harian" else "Jadwal Pekanan"} · ${ApiParser.gregorian(now)}",
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding),
        ) {
            Spacer(Modifier.height(10.dp))
            SlidingSegmentedControl(
                items = listOf("Harian", "Pekanan"),
                selectedIndex = period,
                onSelect = { period = it },
            )
            Spacer(Modifier.height(10.dp))
            SlidingSegmentedControl(
                items = listOf("Imam", "Muadzin", "Khatib"),
                selectedIndex = tab,
                onSelect = { tab = it },
            )
            Spacer(Modifier.height(14.dp))

            AnimatedContent(
                modifier = Modifier.fillMaxSize(),
                targetState = Pair(period, tab),
                transitionSpec = {
                    val direction = if (targetState.second != initialState.second) {
                        if (targetState.second > initialState.second) 1 else -1
                    } else {
                        if (targetState.first > initialState.first) 1 else -1
                    }
                    slideInHorizontally(
                        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                    ) { it * direction } + fadeIn() togetherWith
                        slideOutHorizontally(
                            animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
                        ) { -it * direction } + fadeOut()
                },
                label = "officersSlideContent",
            ) { (currentPeriod, currentTab) ->
                LazyColumn(
                    Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                ) {
                    if (currentTab < 2) {
                        if (currentPeriod == 0) {
                            val duties = data?.imamToday.orEmpty()
                            if (duties.isEmpty()) {
                                item { EmptyState("Jadwal petugas hari ini belum tersedia.") }
                            } else {
                                items(duties.size) { index ->
                                    val duty = duties[index]
                                    SectionCard(title = duty.prayerName.uppercase()) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Avatar(
                                                initials = initials(
                                                    if (currentTab == 0) duty.imamName else duty.muadzinName,
                                                ),
                                                gold = currentTab == 1,
                                            )
                                            Spacer(Modifier.width(12.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    if (currentTab == 0) duty.imamName else duty.muadzinName,
                                                    fontSize = 16.sp,
                                                    color = AppColors.Ink,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Spacer(Modifier.height(2.dp))
                                                Text(
                                                    if (currentTab == 0) {
                                                        "Muadzin: ${duty.muadzinName}"
                                                    } else {
                                                        "Imam: ${duty.imamName}"
                                                    },
                                                    fontSize = 13.sp,
                                                    color = AppColors.Muted,
                                                )
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                }
                            }
                        } else {
                            val dayGroups = data?.imamWeek.orEmpty()
                                .groupBy { it.date }
                                .toSortedMap()
                                .toList()
                            if (dayGroups.isEmpty()) {
                                item { EmptyState("Jadwal petugas pekanan belum tersedia.") }
                            } else {
                                items(dayGroups.size) { index ->
                                    val (date, dayDuties) = dayGroups[index]
                                    val dateMillis = ApiParser.instant("${date}T00:00:00Z") ?: now
                                    val title = if (date == ApiParser.ymd(now)) {
                                        "Hari Ini · ${ApiParser.shortDate(dateMillis)}"
                                    } else {
                                        ApiParser.shortDate(dateMillis)
                                    }
                                    SectionCard(title = title) {
                                        dayDuties
                                            .sortedBy { prayerOrder[it.prayerName.lowercase(Locale.ROOT)] ?: 99 }
                                            .forEachIndexed { dutyIndex, duty ->
                                                if (dutyIndex > 0) {
                                                    Spacer(Modifier.height(10.dp))
                                                    GoldRule()
                                                    Spacer(Modifier.height(10.dp))
                                                }
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Text(
                                                        duty.prayerName,
                                                        modifier = Modifier.weight(1f),
                                                        fontSize = 14.5.sp,
                                                        color = AppColors.Emerald800,
                                                        fontWeight = FontWeight.Bold,
                                                    )
                                                    Column(horizontalAlignment = Alignment.End) {
                                                        Text(
                                                            if (currentTab == 0) duty.imamName else duty.muadzinName,
                                                            fontSize = 14.5.sp,
                                                            color = AppColors.Ink,
                                                            fontWeight = FontWeight.Bold,
                                                        )
                                                        Text(
                                                            if (currentTab == 0) {
                                                                "Muadzin: ${duty.muadzinName}"
                                                            } else {
                                                                "Imam: ${duty.imamName}"
                                                            },
                                                            fontSize = 12.sp,
                                                            color = AppColors.Muted,
                                                        )
                                                    }
                                                }
                                            }
                                    }
                                    Spacer(Modifier.height(10.dp))
                                }
                            }
                        }
                    } else {
                        val khatibViews = listOfNotNull(currentKhatib) +
                            if (currentPeriod == 1) upcomingKhatibs else emptyList()
                        if (khatibViews.isEmpty()) {
                            item { EmptyState("Jadwal khatib belum tersedia.") }
                        } else {
                            items(khatibViews.size) { index ->
                                KhatibEntry(khatibViews[index])
                                Spacer(Modifier.height(10.dp))
                            }
                        }
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}
/**
 * Layar Kompas Kiblat Digital Mewah Berbasis Sensor HP.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QiblaScreen(bundle: AppBundle) {
    val mosque = bundle.primary?.mosque
    val lat = mosque?.latitude
        ?.takeIf { it.isFinite() && it in -90.0..90.0 }
        ?: ReminderConfig.DEFAULT_LATITUDE
    val lon = mosque?.longitude
        ?.takeIf { it.isFinite() && it in -180.0..180.0 }
        ?: ReminderConfig.DEFAULT_LONGITUDE
    val bearing = QiblaCalculator.bearing(lat, lon)
    var sensorReady by remember { mutableStateOf(false) }
    val reportSensor = remember { { ready: Boolean -> sensorReady = ready } }

    Scaffold(topBar = { ScreenTopBar("Arah Kiblat", "Kompas digital presisi Ka'bah") }) { padding ->
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
                        .height(300.dp),
                    onSensorAvailabilityChange = reportSensor,
                )
                Spacer(Modifier.height(12.dp))

                // Banner Informasi Sudut Kiblat
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = AppColors.Ivory2,
                    border = BorderStroke(1.dp, AppColors.BorderGold),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "ARAH KIBLAT DARI MASJID",
                            fontSize = 11.5.sp,
                            color = AppColors.GoldDeep,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.sp,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            String.format(
                                Locale.ROOT,
                                "%.0f° · %s",
                                bearing,
                                QiblaCalculator.direction(bearing),
                            ),
                            fontSize = 28.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.Emerald800,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            if (sensorReady) {
                                "Sensor aktif · gerakkan HP seperti angka 8 bila perlu kalibrasi"
                            } else {
                                "Sensor tidak tersedia · arah dihitung otomatis dari koordinat"
                            },
                            fontSize = 12.5.sp,
                            color = if (sensorReady) AppColors.Emerald700 else AppColors.Alert,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
            }

            item {
                SectionCard(title = "Koordinat Resmi Masjid") {
                    InfoLine("Koordinat", String.format(Locale.ROOT, "%.4f, %.4f", lat, lon))
                    Spacer(Modifier.height(10.dp))
                    GoldRule()
                    Spacer(Modifier.height(10.dp))
                    InfoLine(
                        "Alamat",
                        mosque?.address?.takeIf { it.isNotBlank() }
                            ?: "Rumpin, Kabupaten Bogor, Jawa Barat",
                    )
                    Spacer(Modifier.height(10.dp))
                    GoldRule()
                    Spacer(Modifier.height(10.dp))
                    InfoLine("Zona Waktu", "Asia/Jakarta (Waktu Indonesia Barat)")
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun InfoLine(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 13.5.sp, color = AppColors.Muted)
        Text(
            value,
            fontSize = 13.5.sp,
            fontWeight = FontWeight.Bold,
            color = AppColors.Ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Layar Informasi Masjid & Pengaturan Aplikasi.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InfoScreen(
    bundle: AppBundle,
    onCorrectionChange: (Int) -> Unit,
    onNotificationsChange: (Boolean) -> Unit,
    onRefresh: () -> Unit,
) {
    val now = bundle.now()
    val context = LocalContext.current

    Scaffold(topBar = { ScreenTopBar("Informasi", "Profil masjid & pengaturan") }) { padding ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .background(AppColors.Ivory)
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            item {
                Spacer(Modifier.height(10.dp))
                // Banner Profil Masjid
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    color = AppColors.Ivory2,
                    border = BorderStroke(1.dp, AppColors.BorderGold),
                    shadowElevation = 2.dp,
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(50.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(AppColors.HeroGradient)
                                .border(BorderStroke(1.dp, AppColors.BorderGold), RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            MosqueLogo(
                                logoUrl = bundle.primary?.mosque?.logoUrl,
                                modifier = Modifier.size(32.dp),
                                fallbackTint = AppColors.GoldSoft,
                                contentDescription = null,
                            )
                        }
                        Spacer(Modifier.width(14.dp))
                        Column {
                            Text(
                                bundle.primary?.mosque?.name ?: "Masjid Pondok Tahfizh Plus Abu Dzar",
                                fontSize = 16.5.sp,
                                fontFamily = FontFamily.Serif,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                bundle.primary?.mosque?.address ?: "Rumpin, Kab. Bogor, Jawa Barat",
                                fontSize = 13.sp,
                                color = AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
            }

            item {
                SectionCard(title = "Agenda Kajian Mendatang") {
                    val kajian = bundle.primary?.kajian.orEmpty()
                    if (kajian.isEmpty()) {
                        Text("Belum ada agenda kajian terjadwal.", fontSize = 13.5.sp, color = AppColors.Muted)
                    } else {
                        kajian.take(3).forEachIndexed { index, item ->
                            if (index > 0) {
                                Spacer(Modifier.height(10.dp))
                                GoldRule()
                                Spacer(Modifier.height(10.dp))
                            }
                            Text(
                                item.title,
                                fontSize = 15.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            val detail = if (item.kajianType == "LIBUR") {
                                "Tidak ada kajian"
                            } else {
                                listOf(item.speakerName, item.location)
                                    .filter { it.isNotBlank() }
                                    .joinToString(" · ")
                            }
                            Spacer(Modifier.height(2.dp))
                            Text(
                                "${kajianScheduleLabel(item.startDateTime, now)} · $detail",
                                fontSize = 13.sp,
                                color = AppColors.Muted,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
            }

            item {
                SectionCard(title = "Pengaturan Aplikasi") {
                    // Koreksi Hijriah
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(AppColors.Emerald100),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Filled.DateRange,
                                contentDescription = null,
                                tint = AppColors.Emerald800,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Koreksi Tanggal Hijriah",
                                fontSize = 14.5.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("Penyesuaian rukyat (-1, 0, +1)", fontSize = 12.5.sp, color = AppColors.Muted)
                        }
                        Row(
                            Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(AppColors.Beige),
                        ) {
                            listOf(-1, 0, 1).forEach { value ->
                                val selected = bundle.hijriCorrection == value
                                Box(
                                    Modifier
                                        .size(32.dp)
                                        .background(
                                            if (selected) AppColors.Gold else Color.Transparent,
                                            shape = RoundedCornerShape(12.dp),
                                        )
                                        .clickable { onCorrectionChange(value) },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        if (value > 0) "+1" else value.toString(),
                                        fontSize = 13.sp,
                                        color = if (selected) AppColors.Emerald950 else AppColors.Ink,
                                        fontWeight = FontWeight.ExtraBold,
                                    )
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(12.dp))
                    GoldRule()
                    Spacer(Modifier.height(12.dp))

                    // Notifikasi Permanen
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(AppColors.Emerald100),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Filled.Notifications,
                                contentDescription = null,
                                tint = AppColors.Emerald800,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Notifikasi Ongoing",
                                fontSize = 14.5.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("Countdown shalat di notification bar", fontSize = 12.5.sp, color = AppColors.Muted)
                        }
                        Switch(
                            checked = bundle.notificationsEnabled,
                            onCheckedChange = onNotificationsChange,
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = AppColors.Emerald800,
                                uncheckedThumbColor = AppColors.Muted,
                                uncheckedTrackColor = AppColors.Beige,
                            ),
                        )
                    }

                    Spacer(Modifier.height(12.dp))
                    GoldRule()
                    Spacer(Modifier.height(12.dp))

                    // Sinkronisasi Data
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(AppColors.Emerald100),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Filled.Refresh,
                                contentDescription = null,
                                tint = AppColors.Emerald800,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Sinkronisasi Server",
                                fontSize = 14.5.sp,
                                color = AppColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                when {
                                    bundle.fetchedAt == 0L -> "Belum pernah sinkron"
                                    bundle.offline -> "Offline · data cache lokal"
                                    else -> "Online · ${ApiParser.wallTime(bundle.fetchedAt)} WIB"
                                },
                                fontSize = 12.5.sp,
                                color = if (bundle.offline) AppColors.Alert else AppColors.Emerald700,
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = AppColors.Emerald100,
                            modifier = Modifier.clickable { onRefresh() },
                        ) {
                            Text(
                                "SINKRONKAN",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = AppColors.Emerald800,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                letterSpacing = 0.5.sp,
                            )
                        }
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        Spacer(Modifier.height(12.dp))
                        GoldRule()
                        Spacer(Modifier.height(12.dp))
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = AppColors.SurfaceElevated,
                            border = BorderStroke(0.8.dp, AppColors.BorderSubtle),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    runCatching {
                                        context.startActivity(
                                            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM),
                                        )
                                    }
                                },
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        "Izin Alarm Presisi",
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AppColors.Ink,
                                    )
                                    Text(
                                        "Ketuk untuk memastikan waktu adzan tepat detik",
                                        fontSize = 12.sp,
                                        color = AppColors.Muted,
                                    )
                                }
                                Text("➔", fontSize = 14.sp, color = AppColors.Emerald800)
                            }
                        }
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        Spacer(Modifier.height(10.dp))
                        val power = context.getSystemService(PowerManager::class.java)
                        val ignored = power?.isIgnoringBatteryOptimizations(context.packageName) == true
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = AppColors.SurfaceElevated,
                            border = BorderStroke(0.8.dp, AppColors.BorderSubtle),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    runCatching {
                                        context.startActivity(
                                            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                                                .setData(Uri.parse("package:${context.packageName}")),
                                        )
                                    }
                                },
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        "Optimasi Baterai OS",
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AppColors.Ink,
                                    )
                                    Text(
                                        if (ignored) "Status: Dinonaktifkan (Optimal)" else "Status: Aktif (Ketuk untuk izin latar belakang)",
                                        fontSize = 12.sp,
                                        color = if (ignored) AppColors.Emerald700 else AppColors.Alert,
                                    )
                                }
                                Text("➔", fontSize = 14.sp, color = AppColors.Emerald800)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(14.dp))
            }

            // Kartu Versi Aplikasi
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    color = AppColors.Ivory2,
                    border = BorderStroke(0.8.dp, AppColors.BorderSubtle),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "Masjid Pondok Abu Dzar Mobile",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = AppColors.Ink,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            "Versi ${BuildConfig.VERSION_NAME} · Material 3 Premium Design",
                            fontSize = 12.sp,
                            color = AppColors.Muted,
                        )
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
