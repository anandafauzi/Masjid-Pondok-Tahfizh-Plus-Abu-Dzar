# Sistem Informasi Masjid Pondok Tahfizh Plus Abu Dzar

Aplikasi web + PWA + TV Display untuk Masjid Pondok Tahfizh Plus Abu Dzar
(Rumpin, Kabupaten Bogor). Menyajikan jadwal shalat, jadwal imam/muadzin,
khatib Jumat, kajian, countdown adzan–iqamah, dan panel admin lengkap.

## Fitur

- **Web publik**: beranda, jadwal shalat 7 hari, jadwal imam & muadzin,
  khatib Jumat, kajian, serta hitung mundur adzan–iqamah.
- **TV Display** (`/tv`): 5 slide otomatis (shalat, imam, Jumat, kajian,
  nasihat), jam & tanggal, running text, countdown iqamah. Saat koneksi
  terputus, data terakhir tetap ditampilkan dengan indikator offline.
- **Mode khutbah Jumat**: TV beralih ke layar khutbah **tanpa hitung mundur
  atau sisa waktu**. Durasi dihitung di server (`endsAt` absolut), hanya satu
  sesi aktif, dapat diperpanjang tanpa mereset sesi, dan berakhir otomatis.
- **Admin panel** (`/admin`): dashboard khutbah, jadwal shalat, imam &
  muadzin, khatib Jumat, kajian, iqamah, nasihat, running text, pengaturan TV,
  pengaturan masjid, pengguna (khusus Super Admin), dan log aktivitas.
- **Jadwal kajian tetap**: kajian rutin mingguan cukup dibuat sekali (acuan
  hari dan jam), lalu tampil otomatis setiap pekan tanpa input tanggal ulang.
  Satu pertemuan dapat dipindahkan ke hari/jam lain tanpa mengubah pekan
  lainnya, dan dapat dikembalikan ke jadwal semula.
- **Pengingat WhatsApp H-1**: pengingat otomatis ke imam, muadzin, dan khatib
  Jumat sehari sebelum bertugas, dengan pratinjau, kirim manual, dan riwayat.
- **Rotasi berbasis tanggal**: urutan imam/khatib dihitung dari tanggal
  berlaku, bukan counter perangkat, dan urutannya dapat diubah dari panel
  admin (tombol naik/turun).
- **PWA**: dapat dipasang di perangkat, ikon 192/512, service worker, halaman
  offline.

## Prasyarat

- Node.js 20 atau lebih baru
- PostgreSQL 14 atau lebih baru
- npm

## Instalasi

1. Pasang dependensi:

   ```bash
   npm install
   ```

2. Siapkan environment:

   ```bash
   copy .env.example .env     # Windows
   # cp .env.example .env     # macOS/Linux
   ```

   Sesuaikan `DATABASE_URL` dengan PostgreSQL Anda. Buat `NEXTAUTH_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Buat database (contoh dengan `psql`). Gunakan encoding **UTF8** agar teks
   Arab/Unicode dapat disimpan:

   ```sql
   CREATE DATABASE masjid_abu_dzar WITH ENCODING 'UTF8' TEMPLATE template0;
   ```

   > Di Windows, database yang dibuat tanpa opsi encoding dapat mewarisi
   > encoding `WIN1252` dan menolak karakter Unicode. Jika sudah terlanjur
   > dibuat, buat ulang dengan perintah di atas.

4. Sinkronkan skema dan isi data awal:

   ```bash
   npm run db:push
   npm run db:seed
   ```

   Untuk migrasi berversi di produksi gunakan `npm run db:migrate`.

5. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

   Buka <http://localhost:3000>.

## Menjalankan dengan Docker

Cara tercepat untuk produksi:

```bash
cp .env.example .env   # lalu isi POSTGRES_PASSWORD & NEXTAUTH_SECRET
docker compose up -d --build
```

Skema database dan seed dijalankan otomatis saat container start.
Panduan lengkap (update, backup, restore, troubleshooting) ada di
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Akun Admin Awal

- Email: `fauzi@abudzar.sch.id`
- Password: `masjidabudzar`

> Kredensial di atas hanya dipakai saat akun pertama kali dibuat. Menjalankan
> `npm run db:seed` lagi **tidak** mereset password. Untuk mengganti email atau
> password awal, set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` sebelum seed.

> Segera ubah password setelah login pertama melalui menu **Pengguna**.

## Perintah Berguna

| Perintah | Keterangan |
| --- | --- |
| `npm run dev` | Jalankan mode pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Jalankan hasil build |
| `npm run lint` | Jalankan ESLint |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run db:push` | Sinkronkan skema ke database (tanpa file migrasi) |
| `npm run db:migrate` | Buat & terapkan migrasi |
| `npm run db:seed` | Isi data awal |
| `npm run db:studio` | Buka Prisma Studio |

## TV Display

- Buka `/tv` di browser, lalu tekan **F11** (atau mode fullscreen) pada
  perangkat TV.
- Konten diambil dari `/api/public/tv-data` setiap 20 detik.
- Saat khutbah aktif, TV menampilkan nama khatib & tema tanpa hitung mundur.
  Setelah `endsAt`, TV kembali normal otomatis.
- Saat offline, data terakhir tetap tampil dan muncul indikator offline.

## PWA

- Service worker hanya didaftarkan pada build produksi (`npm run build`
  lalu `npm start`).
- Ikon berada di `public/icon-192.png` dan `public/icon-512.png`. Untuk
  membuat ulang ikon:

  ```bash
  node scripts/generate-icons.js
  ```

## Aplikasi Android (APK)

Folder `android/` membungkus aplikasi web dengan WebView dan menambahkan
kemampuan native:

- Saat pertama dibuka, aplikasi meminta izin **Notifikasi** dan (di Android 12+)
  **Alarm & pengingat** agar adzan tepat waktu.
- Notifikasi *ongoing* di status bar menampilkan waktu shalat berikutnya, imam,
  muadzin, dan hitung mundur iqamah tanpa perlu membuka aplikasi.
- Saat adzan, aplikasi memutar MP3 yang dipilih di menu adzan. Jika HP dalam
  mode silent/getar atau DND, audio dilewati dan hanya notifikasi yang muncul.
- Jadwal diambil dari `/api/public/tv-data` untuk hari ini dan besok (WIB),
  sehingga notifikasi tetap punya data petugas setelah shalat terakhir.
  **Perubahan endpoint ini ikut terdeploy bersama aplikasi web.**

Build APK debug (butuh JDK 17 dan Android SDK 34):

```bash
cd android
./gradlew assembleDebug          # Windows: .\gradlew.bat assembleDebug
```

Hasil: `android/app/build/outputs/apk/debug/app-debug.apk`. Untuk distribusi
Play Store/APK release, tambahkan `signingConfig` release terlebih dahulu.

## Pengingat WhatsApp H-1

Pengingat otomatis dikirim **satu hari sebelum bertugas** kepada imam,
muadzin, dan khatib Jumat. Nomor WhatsApp diambil dari **Admin → Data
Petugas**. Pengiriman memakai **WhatsApp Cloud API resmi dari Meta**; gateway
pihak ketiga sengaja tidak dipakai agar tidak rentan diblokir.

1. Isi nomor WhatsApp setiap petugas di menu **Data Petugas**.
2. Siapkan WhatsApp Business Platform di Meta:
   - Buat/Hubungkan WhatsApp Business Account (WABA) dan nomor bisnis.
   - Buat **System User** dengan izin WhatsApp dan salin **access token
     permanen** (bukan token sementara dari API Setup).
   - Buat dan ajukan **Message Template** berbahasa Indonesia yang disetujui.
     Contoh isi template (category `UTILITY`):

     ```text
     Assalamu'alaikum {{1}}, ini pengingat dari {{2}} bahwa Anda bertugas {{3}} pada {{4}}. Mohon hadir 15 menit sebelum adzan. Jika berhalangan, mohon konfirmasi ke Pengurus DKM. Jazakumullahu khairan.
     ```

     Urutan variabel wajib: `{{1}}` nama petugas, `{{2}}` nama masjid,
     `{{3}}` ringkasan tugas, `{{4}}` tanggal tugas.
3. Isi `.env`:

   ```env
   WHATSAPP_CLOUD_PHONE_NUMBER_ID="id-nomor-bisnis"
   WHATSAPP_CLOUD_ACCESS_TOKEN="token-permanen-system-user"
   WHATSAPP_CLOUD_TEMPLATE_NAME="pengingat_h1"
   WHATSAPP_CLOUD_TEMPLATE_LANGUAGE="id_ID"
   CRON_SECRET="string-acak-panjang"
   ```

   `WHATSAPP_CLOUD_API_VERSION` opsional; default `v26.0`. Panduan resmi:
   https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
4. Pratinjau, kirim manual, dan lihat riwayat di **Admin → Pengingat WA**.
   Karena pesan H-1 dikirim di luar jendela layanan 24 jam, Meta mewajibkan
   template; teks pratinjau di admin hanya untuk memeriksa isi tugas.
5. Di Vercel, cron berjalan otomatis setiap hari pukul **16.00 WIB** (09.00
   UTC) melalui `/api/cron/h-1-reminders`. Endpoint ini hanya menerima
   permintaan dengan header `Authorization: Bearer <CRON_SECRET>`.

Pengiriman bersifat idempoten: satu penerima hanya menerima satu pesan per
tanggal tugas (semua tugasnya digabung), dan riwayat disimpan di tabel
`reminder_logs`. Pengiriman ulang hanya dilakukan lewat tombol **Kirim ulang**
di panel admin.

Uji tanpa mengirim pesan:

```bash
curl "http://localhost:3000/api/cron/h-1-reminders?dryRun=1&secret=$CRON_SECRET"
```

## Catatan Teknis

- Zona waktu aplikasi: **Asia/Jakarta (WIB)**. Perhitungan waktu shalat
  menggunakan library `adhan` dengan metode default **MWL** dan Asar
  **Standar**. Metode, koordinat, dan koreksi menit dapat diubah di
  **Admin → Pengaturan Masjid**. Nama, alamat, dan tautan peta masjid pada
  halaman publik juga dibaca langsung dari pengaturan tersebut.
- Semua tanggal `@db.Date` disimpan pada tengah malam UTC agar tidak bergeser
  oleh zona waktu.
- Autentikasi memakai NextAuth v5 (Credentials + JWT). Proteksi admin
  dilakukan di server melalui `auth()` pada layout `/admin`.
- Service worker ditulis manual (tanpa `next-pwa`), sehingga tidak
  mengganggu build Next.js.
- Endpoint `/api/health` dapat dipakai untuk memantau koneksi database
  (`200` = terhubung, `503` = database tidak tersedia).

## Struktur Singkat

```
prisma/
  schema.prisma      # skema database
  seed.js            # data awal
public/              # manifest, ikon, service worker, offline.html
scripts/
  generate-icons.js  # generator ikon PWA
src/
  app/
    (publik)         # /, /jadwal-*, /kajian, /adzan-iqamah, /tv
    admin/           # panel admin
    api/             # route handler (admin + publik)
    auth/login/      # halaman login
  components/        # UI, shell, provider
  lib/               # waktu, prayer-times, iqamah, rolling, khutbah, data
```
