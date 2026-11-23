# Checklist QA Android — v2.6.1 (versionCode 25)

Pakai checklist ini setelah install APK signed dari CI. Tandai setiap item ✅ / ❌.
Jika ada yang gagal, catat **HP + versi Android + langkah ke-** sebelum dilaporkan.

Build yang diuji:

- Commit: `67a57c6`
- CI run: `45085739425`, artifact `14779173021`
- SHA256: `5FD7AAA4AD5B2A6FACA8F1464FD98944E97B479564F2A1DCA99B5BB07EEA1EB9`

## Persiapan

- [ ] Install APK di HP fisik (jangan cukup emulator).
- [ ] Izin **Notifikasi** dan **Alarm & pengingat tepat** (`SCHEDULE_EXACT_ALARM`) aktif.
- [ ] Nonaktifkan *battery optimization* untuk aplikasi ini (khusus Samsung/Xiaomi/Oppo).
- [ ] Pastikan tanggal/waktu HP otomatis dari jaringan, zona `Asia/Jakarta`.
- [ ] Siapkan jadwal shalat + imam/muadzin terisi, minimal untuk Dzuhur dan Maghrib hari ini.

## A. Instalasi & identitas

| # | Langkah | Ekspektasi |
|---|---|---|
| A1 | Buka Pengaturan › Aplikasi › Masjid Abu Dzar | Versi **`2.6.1`** |
| A2 | Buka aplikasi, lalu notifikasi ongoing | Muncul, tidak ada toast/crash "Bad notification" |
| A3 | Update dari APK lama `2.6.0` (jika ada) | Tidak ada notifikasi lama ganda/berbayang |

## B. Alarm adzan & iqamah

| # | Langkah | Ekspektasi |
|---|---|---|
| B1 | Set waktu adzan 2–3 menit dari sekarang, biarkan HP menyala | Adzan bunyi tepat (±1 menit), notifikasi adzan muncul |
| B2 | Ulangi untuk iqamah | Notifikasi **iqamah** muncul dengan ID terpisah, tidak menimpa adzan yang masih aktif |
| B3 | Saat adzan masih berbunyi, jalankan iqamah | Keduanya tetap tampil sebagai notifikasi berbeda |
| B4 | `adb shell dumpsys deviceidle force-idle`, lalu tunggu adzan | Alarm tetap tepat walau Doze |
| B5 | Matikan HP menjelang adzan, nyalakan lagi **dalam 15 menit** | Alarm terlewat diputar ulang **tepat satu kali** |
| B6 | Matikan HP, nyalakan **setelah lebih dari 15 menit** | Tidak ada replay (sesuai batas desain jendela recovery) |
| B7 | Reboot HP setelah alarm terpasang | Alarm shalat berikutnya tetap ada |
| B8 | Ubah zona waktu HP, buka aplikasi | Jadwal dan target alarm menyesuaikan |
| B9 | Aktifkan mode pesawat, buka aplikasi | Jadwal dari cache tetap tampil; tidak ada jam `00:00`/nol |
| B10 | Swipe aplikasi dari *recents*, tunggu watchdog | Alarm tetap terpasang, service hidup kembali |
| B11 | Tekan ikon jam di status bar | Membuka aplikasi, **tidak** memicu adzan/shalat palsu |
| B12 | Amati dua siklus shalat berturut-turut | Tidak ada notifikasi dobel dari watchdog |

## C. Tutup / swipe menghentikan suara

| # | Langkah | Ekspektasi |
|---|---|---|
| C1 | Saat adzan mulai, tekan **Tutup** | Audio berhenti **langsung**, tidak ada suara tersisa |
| C2 | Tekan Tutup **dalam < 1 detik** setelah notifikasi muncul (test race `prepareAsync`) | Audio tetap tidak bunyi walau `MediaPlayer` masih menyiapkan |
| C3 | Swipe notifikasi adzan ke samping | Audio berhenti, notifikasi hilang |
| C4 | Tekan Tutup, lalu tunggu ~10 detik | Audio tidak muncul kembali (tidak ada callback terlambat) |
| C5 | Adzan A ditutup, lalu adzan B dipicu | Hanya adzan B yang bunyi |

## D. Tampilan notification shade

| # | Langkah | Ekspektasi |
|---|---|---|
| D1 | Buka shade saat adzan | Card tetap transparan/blur, warna teks mengikuti tema (terang/gelap) |
| D2 | Lihat teks compact & expanded | Tidak terpotong, tidak tumpang tindih, descender (huruf `g/y`) tidak terpangkas |
| D3 | Ubah ukuran font sistem ke **200%** | Teks tetap rapi, tinggi card menyesuaikan, tidak saling menimpa |
| D4 | Gunakan HP dengan bahasa Arab/RTL | Teks tetap `viewStart`, tidak terbalik |
| D5 | Perhatikan small icon notifikasi | Siluet masjid, **bukan emoji**, tidak berubah jadi kotak putih |
| D6 | Bandingkan notifikasi ongoing & adzan | Ikon masjid identik di keduanya |
| D7 | Cek launcher/home/navigasi/Kiblat | Ikon di luar notifikasi **tidak berubah** |

> Catatan: Android mewarnai small icon secara monokrom mengikuti tema. Aksen gold pada artwork
> akan tampil sebagai silhouette ivory—ini perilaku platform, bukan bug.

## E. Nama shalat & data lama

| # | Langkah | Ekspektasi |
|---|---|---|
| E1 | Lihat jadwal di Beranda/adzan-iqamah | `Shubuh`, `Dzuhur`, `Ashar`, `Maghrib`, `Isya` |
| E2 | Simpan data dengan label lama `Subuh`/`Zuhur` lewat API/admin | Tetap terbaca, tampil sebagai `Shubuh`/`Dzuhur` |
| E3 | Cek imam/muadzin untuk Dzuhur | Petugas sesuai baris `dhuhr`, bukan baris acak |
| E4 | Hari Jumat, lihat taskbar menjelang Dzuhur | Label `Jumat`, tetapi imam tetap petugas Dzuhur |
| E5 | Cek file audio adzan lama | Tetap diputar (key internal `fajr/dhuhr/...` tidak berubah) |

## F. Batasan yang disengaja

- Jendela pemulihan alarm hanya **15 menit** (`CATCH_UP_WINDOW_MS`).
- Watchdog berjalan tiap **5 menit**; Doze bisa menundanya sampai ~9 menit.
- OEM dengan battery optimizer agresif bisa tetap memblokir exact alarm meski izin sudah aktif
  → ini perlu diverifikasi per HP dan bukan bisa diselesaikan dari kode aplikasi saja.

## Ringkasan hasil

- Lulus: ____ / ____
- Catatan kegagalan:
  - 
