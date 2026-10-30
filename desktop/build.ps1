$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$iconPath = Join-Path $projectRoot "public\favicon.ico"

Write-Host "Memulai kompilasi Desktop App Windows..." -ForegroundColor Cyan

# 1. Main App (Masjid-Abu-Dzar.exe)
$mainSrc = Join-Path $PSScriptRoot "src\Program.cs"
$outMain = Join-Path $projectRoot "Masjid-Abu-Dzar.exe"
& $cscPath /nologo /target:winexe /win32icon:"$iconPath" /out:"$outMain" "$mainSrc"
Write-Host "Berhasil membuat: $outMain" -ForegroundColor Green

# 2. TV Display Launcher (Layar-TV-Masjid.exe)
$tvSrc = Join-Path $PSScriptRoot "src\TVLauncher.cs"
$outTV = Join-Path $projectRoot "Layar-TV-Masjid.exe"
& $cscPath /nologo /target:winexe /win32icon:"$iconPath" /out:"$outTV" "$tvSrc"
Write-Host "Berhasil membuat: $outTV" -ForegroundColor Green

# 3. Admin Launcher (Admin-Masjid.exe)
$adminSrc = Join-Path $PSScriptRoot "src\AdminLauncher.cs"
$outAdmin = Join-Path $projectRoot "Admin-Masjid.exe"
& $cscPath /nologo /target:winexe /win32icon:"$iconPath" /out:"$outAdmin" "$adminSrc"
Write-Host "Berhasil membuat: $outAdmin" -ForegroundColor Green

Write-Host "`nKompilasi Selesai! Semua aplikasi (.exe) siap digunakan langsung di Windows." -ForegroundColor Yellow
