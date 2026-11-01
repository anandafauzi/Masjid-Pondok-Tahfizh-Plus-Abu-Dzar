# Monitoring & Alerting Setup

## 1) Uptime monitoring (gratis)
Options:
- **UptimeRobot** (https://uptimerobot.com/) — monitor HTTP(S), free 50 monitors
- **Better Stack** (https://betterstack.com/) — free tier tersedia
- **Healthchecks.io** (https://healthchecks.io/) — bagus buat cron jobs

**Endpoint yang dipantau:** `https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app/api/health`

Setiap kali status berubah jadi down, kirim alert ke email/Telegram/Slack/Discord.

## 2) Error tracking (gratis)
- **Sentry** (https://sentry.io/) — free tier cukup untuk project kecil
  - Install: `npm install @sentry/nextjs`
  - Jalankan wizard: `npx @sentry/wizard@latest -i nextjs`
  - Tambahkan DSN ke env vars Vercel

## 3) Vercel built-in
Vercel sudah punya deployment logs & analytics. Aktifkan **Speed Insights** dan **Web Analytics** di dashboard Vercel jika ingin.

## Quick check
```bash
curl https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app/api/health
# Expected: {"status":"ok","database":"connected",...}
```
