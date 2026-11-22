package id.or.id.masjidabudzar.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object AppColors {
    // Rich Emerald Palette
    val Emerald950 = Color(0xFF041913)
    val Emerald900 = Color(0xFF093628)
    val Emerald850 = Color(0xFF0E4736)
    val Emerald800 = Color(0xFF135742)
    val Emerald700 = Color(0xFF1A6F55)
    val Emerald600 = Color(0xFF23896B)
    val Emerald100 = Color(0xFFDFF1E7)
    val Emerald50 = Color(0xFFF0F7F3)

    // Warm Parchment & Pearl Canvas
    val Ivory = Color(0xFFF9F7F2)
    val Ivory2 = Color(0xFFFFFFFF)
    val SurfaceElevated = Color(0xFFFCFAF5)
    val Beige = Color(0xFFEFE8DB)

    // Imperial Gold Accents
    val Gold = Color(0xFFCCA352)
    val GoldSoft = Color(0xFFEEDBB2)
    val GoldLight = Color(0xFFFAF3E5)
    val GoldDeep = Color(0xFF947228)

    // Functional & Feedback
    val Alert = Color(0xFFC8453B)
    val AlertSoft = Color(0xFFFBE3E0)
    val Ink = Color(0xFF12241C)
    val Muted = Color(0xFF5A6F64)
    val HeroMuted = Color(0xFFD6E7DC)
    val WhiteSoft = Color(0xFFFFF9EE)

    // Borders & Delicate Rims
    val BorderSubtle = Color(0x18093628)
    val BorderGold = Color(0x35CCA352)

    // Premium Gradients
    val HeroGradient = Brush.verticalGradient(
        listOf(
            Color(0xFF14543F),
            Color(0xFF093628),
            Color(0xFF041913),
        ),
    )

    val GoldGradient = Brush.linearGradient(
        listOf(
            Color(0xFFE8CA7C),
            Color(0xFFCCA352),
            Color(0xFFA67F2C),
        ),
    )

    val ActiveCardGradient = Brush.horizontalGradient(
        listOf(
            Color(0xFF155944),
            Color(0xFF0D3E2F),
        ),
    )
}

private val LightColors = lightColorScheme(
    primary = AppColors.Emerald800,
    onPrimary = AppColors.Ivory2,
    primaryContainer = AppColors.Emerald100,
    onPrimaryContainer = AppColors.Emerald900,
    secondary = AppColors.Gold,
    onSecondary = AppColors.Emerald950,
    secondaryContainer = AppColors.GoldLight,
    onSecondaryContainer = AppColors.GoldDeep,
    background = AppColors.Ivory,
    onBackground = AppColors.Ink,
    surface = AppColors.Ivory2,
    onSurface = AppColors.Ink,
    surfaceVariant = AppColors.SurfaceElevated,
    onSurfaceVariant = AppColors.Muted,
    outline = AppColors.BorderSubtle,
    error = AppColors.Alert,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = AppColors.GoldSoft,
    onPrimary = AppColors.Emerald950,
    primaryContainer = AppColors.Emerald900,
    onPrimaryContainer = AppColors.GoldSoft,
    secondary = AppColors.Gold,
    onSecondary = AppColors.Emerald950,
    background = AppColors.Emerald950,
    onBackground = AppColors.WhiteSoft,
    surface = AppColors.Emerald900,
    onSurface = AppColors.WhiteSoft,
    surfaceVariant = Color(0xFF08261D),
    onSurfaceVariant = AppColors.HeroMuted,
    outline = AppColors.BorderGold,
    error = AppColors.Alert,
    onError = Color.White,
)

private val AppTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 32.sp,
        lineHeight = 38.sp,
        letterSpacing = (-0.5).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 30.sp,
        letterSpacing = (-0.3).sp,
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = (-0.2).sp,
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        lineHeight = 22.sp,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        letterSpacing = 0.5.sp,
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        letterSpacing = 0.5.sp,
    ),
)

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val scheme = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(
        colorScheme = scheme,
        typography = AppTypography,
        content = content,
    )
}
