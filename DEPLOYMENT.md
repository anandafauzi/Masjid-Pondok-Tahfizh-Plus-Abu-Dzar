## Deployment

### Docker (Rekomendasi)

1. Salin `.env.example` jadi `.env` dan sesuaikan:
```bash
cp .env.example .env
```

2. Build dan jalankan:
```bash
docker compose up -d --build
```

3. Sinkronkan skema & seed (hanya pertama kali):
```bash
docker compose exec app npx prisma db push
docker compose exec app npm run db:seed
```

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
