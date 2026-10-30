using System;
using System.Diagnostics;
using System.IO;

namespace MasjidAbuDzarDesktop {
    class TVLauncher {
        [STAThread]
        static void Main() {
            string exe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Masjid-Abu-Dzar.exe");
            if (File.Exists(exe)) {
                Process.Start(exe, "--tv");
            } else {
                Process.Start("https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app/tv");
            }
        }
    }
}
