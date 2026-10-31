## Deployment

### Docker (Rekomendasi)

1. Salin `.env.example` jadi `.env` dan sesuaikan:
```bash
cp .env.example .env
```

> Untuk Docker, ganti host `localhost` pada `DATABASE_URL` menjadi `db`
> (nama service PostgreSQL di `docker-compose.yml`). Pastikan password di
> `DATABASE_URL` sama dengan `POSTGRES_PASSWORD`. Jangan biarkan
> `NEXTAUTH_SECRET` memakai nilai contoh.

2. Build dan jalankan:
```bash
docker compose up -d --build
```

3. Sinkronkan skema & seed (hanya pertama kali atau setelah skema berubah):
```bash
docker compose exec app node node_modules/prisma/build/index.js db push --skip-generate
docker compose exec app node prisma/seed.js
```

`--skip-generate` dipakai karena Prisma Client sudah di-generate saat build,
dan container berjalan sebagai user non-root.

Aplikasi akan berjalan di `http://localhost:3000`.

### Manual (VPS/PM2)

1. Install dependensi
```bash
npm ci
```

2. Generate prisma client
```bash
npx prisma generate
```

3. Build
```bash
npm run build
```

4. Setup `.env` untuk production, lalu jalankan:
```bash
npm run db:push
npm run db:seed  # pertama kali
npm start
```
