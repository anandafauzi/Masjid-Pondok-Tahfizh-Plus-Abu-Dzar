using System;
using System.Drawing;
using System.Windows.Forms;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace MasjidAbuDzarDesktop {
    public class Program {
        private const string AppTitle = "Sistem Informasi Masjid Abu Dzar";
        private const string BaseUrl = "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app";
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip trayMenu;

        [STAThread]
        public static void Main(string[] args) {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string mode = args.Length > 0 ? args[0].ToLower() : "";

            if (mode == "--tray") {
                // Run in background with tray icon
                InitTray();
                Application.Run();
                return;
            }

            // Launch the desired window
            string targetUrl = BaseUrl;
            bool isKiosk = false;

            if (mode == "--tv" || mode == "-tv") {
                targetUrl = BaseUrl + "/tv";
                isKiosk = true;
            } else if (mode == "--admin" || mode == "-admin") {
                targetUrl = BaseUrl + "/admin";
            }

            LaunchApp(targetUrl, isKiosk);
        }

        public static void LaunchApp(string url, bool kiosk = false) {
            string edgePath = FindEdgePath();
            if (string.IsNullOrEmpty(edgePath)) {
                // Fallback to default browser
                Process.Start(url);
                return;
            }

            // Isolated profile directory so login session and caches are private and persistent
            string userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "MasjidAbuDzar", "UserData"
            );

            try {
                if (!Directory.Exists(userDataDir)) {
                    Directory.CreateDirectory(userDataDir);
                }
            } catch {}

            string arguments = string.Format(
                "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1280,800 --disable-pinch --disable-features=TranslateUI",
                url, userDataDir
            );

            if (kiosk) {
                arguments += " --start-fullscreen --kiosk";
            }

            try {
                Process.Start(new ProcessStartInfo {
                    FileName = edgePath,
                    Arguments = arguments,
                    UseShellExecute = true
                });
            } catch (Exception ex) {
                MessageBox.Show(
                    "Gagal menjalankan aplikasi: " + ex.Message,
                    AppTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static string FindEdgePath() {
            string[] possiblePaths = new string[] {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge SxS\Application\msedge.exe"),
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
            };

            foreach (string path in possiblePaths) {
                if (File.Exists(path)) return path;
            }
            return null;
        }

        private static void InitTray() {
            trayMenu = new ContextMenuStrip();
            trayMenu.Items.Add("🕌 Buka Aplikasi Utama", null, (s, e) => LaunchApp(BaseUrl));
            trayMenu.Items.Add("📺 Buka Layar TV (Fullscreen)", null, (s, e) => LaunchApp(BaseUrl + "/tv", true));
            trayMenu.Items.Add("🔐 Buka Panel Admin DKM", null, (s, e) => LaunchApp(BaseUrl + "/admin"));
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add("ℹ️ Tentang Aplikasi", null, (s, e) => {
                MessageBox.Show(
                    "Sistem Informasi Masjid Pondok Tahfizh Plus Abu Dzar\nVersi 1.0 Desktop Edition (Windows)\n\n" +
                    "Fitur:\n" +
                    "• Jadwal Shalat & Countdown Iqamah Otomatis\n" +
                    "• Mode Layar TV Fullscreen (Kiosk)\n" +
                    "• Panel Admin DKM Terintegrasi\n" +
                    "• Pemutar Audio Adzan Real-Time",
                    AppTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            });
            trayMenu.Items.Add("❌ Keluar", null, (s, e) => {
                trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon = new NotifyIcon {
                Text = AppTitle,
                ContextMenuStrip = trayMenu,
                Visible = true
            };

            try {
                string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "favicon.ico");
                if (File.Exists(icoPath)) {
                    trayIcon.Icon = new Icon(icoPath);
                } else {
                    trayIcon.Icon = SystemIcons.Application;
                }
            } catch {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.DoubleClick += (s, e) => LaunchApp(BaseUrl);
        }
    }
}
