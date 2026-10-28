$env:DATABASE_URL="postgresql://user:password@localhost:5432/masjid_abu_dzar?schema=public"
$env:NEXTAUTH_URL="http://localhost:3000"
$env:NEXTAUTH_SECRET="cfMtRhc2e06xjJj4KFbrErYebnhfrvn8NTXdklXuLPQ="
Set-Location "C:\My Project\masjid-pondok-app"
& ".\node_modules\.bin\next.cmd" dev -p 3000
