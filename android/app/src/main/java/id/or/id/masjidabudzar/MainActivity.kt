package id.or.id.masjidabudzar

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import id.or.id.masjidabudzar.ui.AppTheme
import id.or.id.masjidabudzar.ui.AppViewModel
import id.or.id.masjidabudzar.ui.MasjidApp
import id.or.id.masjidabudzar.ui.OpenTabRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private lateinit var repository: PrayerRepository

    // StateFlow + id unik: membuka "home" dua kali tetap memicu LaunchedEffect.
    private val openTab = MutableStateFlow(OpenTabRequest("home", 0L))
    private var openTabSequence = 0L

    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            lifecycleScope.launch { activateReminders() }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        OngoingNotification.createChannels(this)
        repository = PrayerRepository(this)
        val viewModel = ViewModelProvider(
            this,
            AppViewModel.Factory(repository),
        )[AppViewModel::class.java]

        lifecycleScope.launch {
            repository.settings.migrateLegacySettings()
            // Jangan nyalakan FGS saat preferensi notifikasi aplikasi dimatikan.
            if (repository.settings.prefsAfterMigration().notificationsEnabled) {
                PrayerReminderService.start(this@MainActivity)
            }
            repository.refresh()
            PrayerReminderScheduler.scheduleNext(this@MainActivity, repository)
        }

        SyncWorker.enqueue(this)

        requestOpenTab(intent?.getStringExtra("open_tab") ?: "home")
        setContent {
            val tabRequest by openTab.collectAsState()
            AppTheme {
                MasjidApp(
                    viewModel = viewModel,
                    openTabRequest = tabRequest,
                    onNotificationsChange = { enabled ->
                        lifecycleScope.launch {
                            repository.settings.setNotificationsEnabled(enabled)
                            if (enabled) {
                                activateReminders()
                                requestNotificationPermission()
                            }
                        }
                    },
                )
            }
        }

        if (!notificationsGranted()) requestNotificationPermission()
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        requestOpenTab(intent.getStringExtra("open_tab") ?: "home")
    }

    private fun requestOpenTab(tab: String) {
        openTab.value = OpenTabRequest(tab, ++openTabSequence)
    }

    /** Dipanggil setelah prefs ON ditulis, juga setelah izin OS diberikan. */
    private suspend fun activateReminders() {
        PrayerReminderService.start(this)
        repository.refresh()
        PrayerReminderScheduler.scheduleNext(this, repository)
    }

    private fun notificationsGranted(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !notificationsGranted()) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
