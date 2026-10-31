package id.or.id.masjidabudzar

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private val appUrl = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app"
    private val appHost = "masjid-pondok-tahfizh-plus-abu-dzar.vercel.app"

    private fun isAppOrigin(origin: String): Boolean {
        return try {
            val uri = android.net.Uri.parse(origin)
            uri.scheme == "https" && uri.host == appHost
        } catch (_: Exception) {
            false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Setup layout programmatically
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
                mediaPlaybackRequiresUserGesture = false // Auto play adzan
                setGeolocationEnabled(true)
                // Aplikasi hanya menampilkan konten web; jangan izinkan
                // akses ke file lokal / content provider perangkat.
                allowFileAccess = false
                allowContentAccess = false
            }

            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    // Hanya berikan lokasi ke origin aplikasi sendiri.
                    val allowed = origin != null && isAppOrigin(origin)
                    callback?.invoke(origin, allowed, false)
                }
            }

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    swipeRefresh.isRefreshing = false
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

        // Back button handling
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Load the live Vercel app
        webView.loadUrl(appUrl)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
