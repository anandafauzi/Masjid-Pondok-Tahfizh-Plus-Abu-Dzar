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
            Color(0xFF17624A),
            Color(0xFF0B3D2D),
            Color(0xFF041A13),
        ),
    )

    val CanvasGradient = Brush.verticalGradient(
        listOf(
            Color(0xFFFBF9F4),
            Color(0xFFF6F3EC),
            Color(0xFFF1ECE1),
        ),
    )

    val CardGradient = Brush.linearGradient(
        listOf(
            Color(0xFFFFFFFF),
            Color(0xFFFBF8F1),
        ),
    )

    val EmeraldGlassGradient = Brush.horizontalGradient(
        listOf(
            Color(0xFF155944),
            Color(0xFF0D3E2F),
        ),
    )

    val GoldGradient = Brush.linearGradient(
        listOf(
            Color(0xFFF0DCA8),
            Color(0xFFCCA352),
            Color(0xFFA67F2C),
        ),
    )

    val ActiveCardGradient = Brush.horizontalGradient(
        listOf(
            Color(0xFF17624A),
            Color(0xFF0C4030),
        ),
    )

    val DutyGoldGradient = Brush.linearGradient(
        listOf(
            Color(0xFFFBF2DF),
            Color(0xFFF3E3C2),
        ),
    )

    val DutyEmeraldGradient = Brush.linearGradient(
        listOf(
            Color(0xFFF1F8F3),
            Color(0xFFE3F0E8),
        ),
    )

    val GlassWhite = Color(0x14FFFFFF)
    val GoldLine = Color(0x66CCA352)
    val SoftShadow = Color(0x1A041913)
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
    displaySmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.8).sp,
    ),
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
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 21.sp,
        lineHeight = 27.sp,
        letterSpacing = (-0.2).sp,
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
    bodyLarge = TextStyle(
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontSize = 12.5.sp,
        lineHeight = 18.sp,
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        letterSpacing = 0.4.sp,
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        letterSpacing = 0.5.sp,
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 10.5.sp,
        letterSpacing = 0.6.sp,
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
