package id.or.id.masjidabudzar.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object AppColors {
    val Emerald950 = Color(0xFF061F18)
    val Emerald900 = Color(0xFF0B3B2E)
    val Emerald800 = Color(0xFF125340)
    val Emerald700 = Color(0xFF1B6E55)
    val Emerald100 = Color(0xFFDCEFE6)
    val Ivory = Color(0xFFF8F5EE)
    val Ivory2 = Color(0xFFFFFDF8)
    val Beige = Color(0xFFEDE3D1)
    val Gold = Color(0xFFC6A15B)
    val GoldSoft = Color(0xFFE7D09A)
    val GoldDeep = Color(0xFF8A6E33)
    val Alert = Color(0xFFC8453B)
    val AlertSoft = Color(0xFFFBE3E0)
    val Ink = Color(0xFF14231D)
    val Muted = Color(0xFF52645A)
    val HeroMuted = Color(0xFFD9E8DF)
    val WhiteSoft = Color(0xFFFFF8E9)
}

private val LightColors = lightColorScheme(
    primary = AppColors.Emerald800,
    onPrimary = AppColors.Ivory,
    primaryContainer = AppColors.Emerald100,
    onPrimaryContainer = AppColors.Emerald900,
    secondary = AppColors.Gold,
    onSecondary = AppColors.Emerald950,
    background = AppColors.Ivory,
    onBackground = AppColors.Ink,
    surface = AppColors.Ivory2,
    onSurface = AppColors.Ink,
    surfaceVariant = AppColors.Beige,
    onSurfaceVariant = AppColors.Muted,
    error = AppColors.Alert,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = AppColors.GoldSoft,
    onPrimary = AppColors.Emerald950,
    secondary = AppColors.Gold,
    background = AppColors.Emerald950,
    onBackground = AppColors.WhiteSoft,
    surface = AppColors.Emerald900,
    onSurface = AppColors.WhiteSoft,
    error = AppColors.Alert,
)

private val AppTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Medium,
        fontSize = 34.sp,
        lineHeight = 40.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Medium,
        fontSize = 26.sp,
        lineHeight = 32.sp,
    ),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp),
    bodyMedium = TextStyle(fontSize = 15.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 15.sp),
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
