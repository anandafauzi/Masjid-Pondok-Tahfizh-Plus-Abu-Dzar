# Generate Android keystore for release signing
# Usage: .\scripts\generate-android-keystore.ps1
# Output: masjid-release.keystore + prints base64 for GitHub Secrets
param(
  [string]$KeystorePath = ".\android\app\masjid-release.keystore",
  [string]$Alias = "masjidabudzar",
  [int]$ValidityDays = 10000
)

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
  Write-Error "keytool not found. Install JDK (Android Studio/JDK)."
  exit 1
}

Write-Host "Generating keystore at $KeystorePath..."
& keytool -genkey -v -keystore $KeystorePath -keyalg RSA -keysize 2048 -validity $ValidityDays -alias $Alias

if (-not (Test-Path $KeystorePath)) {
  Write-Error "Keystore generation failed."
  exit 1
}

Write-Host "`nBase64 for GitHub Secret ANDROID_KEYSTORE_BASE64:"
[Convert]::ToBase64String([IO.File]::ReadAllBytes($KeystorePath)) | Write-Output
Write-Host "`nAdd these secrets to GitHub: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD"
