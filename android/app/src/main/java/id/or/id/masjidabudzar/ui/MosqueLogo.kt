package id.or.id.masjidabudzar.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import id.or.id.masjidabudzar.LogoLoader
import id.or.id.masjidabudzar.R

@Composable
fun MosqueLogo(
    logoUrl: String?,
    modifier: Modifier = Modifier,
    fallbackTint: Color = AppColors.GoldSoft,
    contentDescription: String? = "Logo Masjid Abu Dzar",
    showFallback: Boolean = true,
) {
    var bitmap by remember(logoUrl) { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(logoUrl) {
        bitmap = LogoLoader.load(logoUrl)
    }

    val logo = bitmap
    if (logo != null) {
        Image(
            bitmap = logo.asImageBitmap(),
            contentDescription = contentDescription,
            modifier = modifier,
            contentScale = ContentScale.Fit,
        )
    } else if (showFallback) {
        Icon(
            painter = painterResource(R.drawable.ic_prayer_notification),
            contentDescription = contentDescription,
            tint = fallbackTint,
            modifier = modifier,
        )
    }
}
