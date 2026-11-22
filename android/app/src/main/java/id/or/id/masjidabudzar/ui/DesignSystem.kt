package id.or.id.masjidabudzar.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val PremiumCardShape = RoundedCornerShape(22.dp)
val PremiumPillShape = RoundedCornerShape(999.dp)

@Composable
fun rememberPressSource(): MutableInteractionSource = remember { MutableInteractionSource() }

/** Ringan, hanya mengubah layer gambar saat tombol/card ditekan. */
@Composable
fun Modifier.pressScale(
    source: InteractionSource,
    scale: Float = 0.965f,
): Modifier {
    val pressed by source.collectIsPressedAsState()
    val animatedScale by animateFloatAsState(
        targetValue = if (pressed) scale else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium,
        ),
        label = "pressScale",
    )
    return this then Modifier.graphicsLayer {
        scaleX = animatedScale
        scaleY = animatedScale
    }
}

/** Entrance halus untuk konten utama setiap halaman. */
@Composable
fun ScreenEnter(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(tween(260)) + slideInVertically(tween(360)) { it / 16 },
        exit = fadeOut(tween(140)) + slideOutVertically(tween(140)) { it / 16 },
    ) {
        content()
    }
}

/** Permukaan kartu premium dengan gradien opsional dan rim emas tipis. */
@Composable
fun PremiumSurface(
    modifier: Modifier = Modifier,
    shape: Shape = PremiumCardShape,
    color: Color = AppColors.Ivory2,
    gradient: Brush? = null,
    borderColor: Color = AppColors.GoldLine,
    elevation: Dp = 3.dp,
    contentPadding: Dp = 16.dp,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = modifier,
        shape = shape,
        color = color,
        border = BorderStroke(1.dp, borderColor),
        shadowElevation = elevation,
    ) {
        Box(Modifier.fillMaxWidth().then(if (gradient != null) Modifier.background(gradient) else Modifier)) {
            Column(Modifier.fillMaxWidth().padding(contentPadding)) {
                content()
            }
        }
    }
}

/** Header seksi dengan aksen emas dan hierarchy yang konsisten. */
@Composable
fun SectionHeading(
    title: String,
    titleSize: androidx.compose.ui.unit.TextUnit = 13.sp,
    titleColor: Color = AppColors.Emerald800,
    subtitle: String? = null,
    action: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(width = 3.dp, height = 18.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(AppColors.GoldGradient),
            )
            Spacer(Modifier.width(10.dp))
            Column {
                Text(
                    text = title,
                    fontSize = titleSize,
                    fontWeight = FontWeight.Bold,
                    color = titleColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!subtitle.isNullOrBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        fontSize = 11.5.sp,
                        color = AppColors.Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        if (action != null) {
            Spacer(Modifier.width(10.dp))
            action()
        }
    }
}

/** Pill kecil untuk status/role, tidak ALL-CAPS berlebihan. */
@Composable
fun StatusPill(
    text: String,
    color: Color = AppColors.Emerald800,
    background: Color = AppColors.Emerald50,
    borderColor: Color = AppColors.GoldLine,
) {
    Surface(
        shape = PremiumPillShape,
        color = background,
        border = BorderStroke(0.8.dp, borderColor),
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            fontSize = 10.5.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            maxLines = 1,
        )
    }
}

/** Ikon dalam bubble lembut untuk baris pengaturan dan informasi. */
@Composable
fun IconBubble(
    icon: ImageVector,
    tint: Color = AppColors.Emerald800,
    background: Color = AppColors.Emerald100,
) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(RoundedCornerShape(13.dp))
            .background(
                Brush.linearGradient(
                    listOf(
                        background,
                        background.copy(alpha = 0.55f),
                    ),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(19.dp),
        )
    }
}

@Composable
fun SoftGoldDivider() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(AppColors.Gold.copy(alpha = 0.22f)),
    )
}

@Composable
fun EyebrowText(text: String, color: Color = AppColors.GoldDeep) {
    Text(
        text = text,
        fontSize = 10.5.sp,
        fontWeight = FontWeight.ExtraBold,
        color = color,
        letterSpacing = 0.8.sp,
        fontFamily = FontFamily.Default,
    )
}
