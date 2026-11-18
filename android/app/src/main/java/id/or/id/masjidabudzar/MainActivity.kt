package id.or.id.masjidabudzar

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private val appUrl = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app"
    private val appHost = "masjid-pondok-tahfizh-plus-abu-dzar.vercel.app"

    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startReminderService()
            maybeRequestExactAlarm()
        } else {
            Toast.makeText(
                this,
                "Izin notifikasi dibutuhkan agar pengingat shalat muncul di status bar.",
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private val requestLocationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val origin = pendingGeoOrigin
        val callback = pendingGeoCallback
        pendingGeoOrigin = null
        pendingGeoCallback = null
        callback?.invoke(origin, granted && origin != null && isAppOrigin(origin), false)
    }

    private var exactAlarmDialogShown = false

    private fun isAppOrigin(origin: String): Boolean {
        return try {
            val uri = Uri.parse(origin)
            uri.scheme == "https" && uri.host == appHost
        } catch (_: Exception) {
            false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        swipeRefresh = SwipeRefreshLayout(this).apply {
            setColorSchemeColors(0xFF2D946E.toInt(), 0xFF1B5E46.toInt())
        }

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                mediaPlaybackRequiresUserGesture = false
                setGeolocationEnabled(true)
                allowFileAccess = false
                allowContentAccess = false
            }

            addJavascriptInterface(NativeBridge(), BRIDGE_NAME)

            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    if (origin == null || !isAppOrigin(origin)) {
                        callback?.invoke(origin, false, false)
                        return
                    }
                    if (
                        ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.ACCESS_FINE_LOCATION,
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        callback?.invoke(origin, true, false)
                        return
                    }
                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    requestLocationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: return false
                    if (isAppOrigin(url)) return false

                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (_: Exception) {
                        Toast.makeText(
                            this@MainActivity,
                            "Tautan tidak dapat dibuka.",
                            Toast.LENGTH_SHORT,
                        ).show()
                        true
                    }
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    swipeRefresh.isRefreshing = false
                    if (url != null && isAppOrigin(url)) {
                        view?.evaluateJavascript(BRIDGE_SCRIPT, null)
                    }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    swipeRefresh.isRefreshing = false
                }
            }
        }

        swipeRefresh.addView(webView)
        setContentView(swipeRefresh)

        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        val openPath = intent?.getStringExtra(ReminderConfig.EXTRA_OPEN_PATH)
            ?.takeIf { it.startsWith("/") && !it.startsWith("//") }
        webView.loadUrl(appUrl + (openPath.orEmpty()))
        ensureReminderPermissionAndStart()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val path = intent.getStringExtra(ReminderConfig.EXTRA_OPEN_PATH)
            ?.takeIf { it.startsWith("/") && !it.startsWith("//") }
        if (!path.isNullOrBlank() && ::webView.isInitialized) {
            webView.loadUrl(appUrl + path)
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
        ) {
            // User baru saja memberi izin alarm & pengingat dari Settings.
            startReminderService()
        } else {
            maybeRequestExactAlarm()
        }
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface(BRIDGE_NAME)
        webView.destroy()
        super.onDestroy()
    }

    private fun ensureReminderPermissionAndStart() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            return
        }

        startReminderService()
        maybeRequestExactAlarm()
    }

    private fun startReminderService() {
        if (NotificationManagerCompat.from(this).areNotificationsEnabled()) {
            PrayerReminderLauncher.start(this, ReminderConfig.ACTION_REFRESH_DATA)
        }
    }

    private fun maybeRequestExactAlarm() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

        val alarmManager = getSystemService(AlarmManager::class.java)
        if (alarmManager.canScheduleExactAlarms() || exactAlarmDialogShown) return
        exactAlarmDialogShown = true

        AlertDialog.Builder(this)
            .setTitle("Izin alarm shalat")
            .setMessage(
                "Agar adzan berbunyi tepat waktu, izinkan aplikasi mengatur " +
                    "alarm & pengingat pada pengaturan berikut."
            )
            .setPositiveButton("Buka pengaturan") { _, _ ->
                ReminderSettings.markExactAlarmPrompted(this)
                try {
                    startActivity(
                        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                            .setData(Uri.parse("package:$packageName"))
                    )
                } catch (_: Exception) {
                    Toast.makeText(
                        this,
                        "Pengaturan alarm tidak tersedia di perangkat ini.",
                        Toast.LENGTH_SHORT,
                    ).show()
                }
            }
            .setNegativeButton("Nanti") { _, _ -> exactAlarmDialogShown = false }
            .setOnCancelListener { exactAlarmDialogShown = false }
            .show()
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun getPlatform(): String = "android"

        @JavascriptInterface
        fun syncAdzanSettings(raw: String) {
            ReminderSettings.saveAdzanSettingsFromJson(applicationContext, raw)
        }

        /** Kembalikan status saat ini, bukan asumsi "granted" setelah dialog dibuka. */
        @JavascriptInterface
        fun requestNotifications(): Boolean {
            runOnUiThread { ensureReminderPermissionAndStart() }
            return NotificationManagerCompat.from(this@MainActivity).areNotificationsEnabled()
        }

        /** Dipakai JS untuk mengecek ulang setelah dialog izin Android ditutup. */
        @JavascriptInterface
        fun areNotificationsEnabled(): Boolean =
            NotificationManagerCompat.from(this@MainActivity).areNotificationsEnabled()
    }

    private companion object {
        const val BRIDGE_NAME = "MasjidNative"
        val BRIDGE_SCRIPT = """
            (function () {
              if (window.__masjidNativeBridgeInstalled) return;
              window.__masjidNativeBridgeInstalled = true;
              function sync() {
                try {
                  var raw = localStorage.getItem('abu_dzar_adzan_settings');
                  if (raw && window.MasjidNative && window.MasjidNative.syncAdzanSettings) {
                    window.MasjidNative.syncAdzanSettings(raw);
                  }
                } catch (e) {}
              }
              sync();
              setInterval(sync, 5000);
            })();
        """.trimIndent()
    }
}
