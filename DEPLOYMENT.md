## Deployment

### Docker (Rekomendasi)

Prasyarat: Docker Engine + Docker Compose v2.

1. Siapkan environment:

```bash
cp .env.example .env
```

Sesuaikan minimal:

- `POSTGRES_PASSWORD` — ganti dengan password kuat (gunakan karakter URL-safe:
  huruf, angka, `-`, `_`).
- `NEXTAUTH_SECRET` — generate dengan:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `NEXTAUTH_URL` — mis. `http://localhost:3000` atau domain asli.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — akun Super Admin pertama.

> Untuk Docker, `DATABASE_URL` **tidak perlu** diubah. `docker-compose.yml`
> otomatis mengarahkannya ke service `db` memakai `POSTGRES_PASSWORD`.

2. Build dan jalankan:

```bash
docker compose up -d --build
```

Saat container start, entrypoint otomatis menjalankan `prisma db push` dan
seed (keduanya idempotent). Jadi tidak ada langkah migrasi manual.

3. Cek status:

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:3000/api/health
```

Aplikasi berjalan di `http://localhost:3000`.

4. Login admin di `/admin` memakai akun seed, lalu **segera ganti password**
   lewat menu Pengguna. Seed tidak pernah mereset password akun yang sudah ada.

#### Perintah berguna

```bash
# Hentikan container (data tetap aman)
docker compose down

# Lihat log database
docker compose logs -f db

# Jalankan seed manual
docker compose exec app node prisma/seed.js

# Sinkronkan skema manual
docker compose exec app node node_modules/prisma/build/index.js db push --skip-generate

# Backup database
docker compose exec db pg_dump -U postgres masjid_abu_dzar > backup.sql

# Restore database
docker compose exec -T db psql -U postgres masjid_abu_dzar < backup.sql

# Hapus container + volume database (DATA HILANG)
docker compose down -v
```

#### Update aplikasi

```bash
git pull
docker compose up -d --build
```

Entrypoint akan menyinkronkan skema dan menjalankan seed lagi secara aman.

#### Menonaktifkan migrasi/seed otomatis

Tambahkan ke `.env`:

```env
RUN_MIGRATIONS="false"
# atau hanya seed:
RUN_SEED="false"
```

#### Troubleshooting

- **`POSTGRES_PASSWORD wajib diisi`** — variabel belum ada di `.env`.
- **App restart terus / health check gagal** — cek `docker compose logs app`.
  Pastikan `NEXTAUTH_SECRET` terisi dan database sehat (`docker compose ps`).
- **Password database mengandung `@`, `:`, `/`, atau `#`** — ganti dengan
  karakter URL-safe, atau URL-encode karakter tersebut di `DATABASE_URL`.
- **Port 3000/5432 sudah dipakai** — ubah mapping port di `docker-compose.yml`
  (mis. `"8080:3000"`).

### Manual (VPS/PM2)

1. Install dependensi:

```bash
npm ci
```

2. Generate Prisma Client:

```bash
npx prisma generate
```

3. Build:

```bash
npm run build
```

4. Siapkan `.env` production (termasuk `DATABASE_URL` ke PostgreSQL Anda),
   lalu jalankan:

```bash
npm run db:push
npm run db:seed   # pertama kali
npm start
```
