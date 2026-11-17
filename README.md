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

## Pengingat WhatsApp H-1

Pengingat otomatis dikirim **satu hari sebelum bertugas** kepada imam,
muadzin, dan khatib Jumat. Nomor WhatsApp diambil dari **Admin → Data
Petugas**.

1. Isi nomor WhatsApp setiap petugas di menu **Data Petugas**.
2. Buat akun gateway (disarankan **Fonnte** paket Free: 1.000 pesan teks per
   bulan), hubungkan perangkat WhatsApp, lalu salin token ke `.env`:

   ```env
   FONNTE_TOKEN="token-dari-dashboard-fonnte"
   CRON_SECRET="string-acak-panjang"
   ```

   Gateway lain juga didukung: `WHATSAPP_PROVIDER=wablas` dengan
   `WABLAS_DOMAIN` + `WABLAS_TOKEN`, atau `WHATSAPP_PROVIDER=webhook` dengan
   `WHATSAPP_WEBHOOK_URL` (menerima JSON `{ target, message, type }`).
3. Pratinjau, kirim manual, dan lihat riwayat di **Admin → Pengingat WA**.
4. Di Vercel, cron berjalan otomatis setiap hari pukul **16.00 WIB** (09.00
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
