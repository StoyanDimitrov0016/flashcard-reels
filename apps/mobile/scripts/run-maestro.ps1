param(
  [string]$ApkPath
)

$ErrorActionPreference = "Stop"
$mobileRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$resolvedApkPath = if ($ApkPath) { (Resolve-Path -LiteralPath $ApkPath).Path } else { $null }
$androidSdk = if ($env:ANDROID_HOME) {
  $env:ANDROID_HOME
} else {
  [Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")
}
if (-not $androidSdk) {
  throw "ANDROID_HOME is required."
}
$adbPath = Join-Path $androidSdk "platform-tools\adb.exe"
if (-not (Test-Path -LiteralPath $adbPath)) {
  throw "adb was not found at '$adbPath'."
}
if (-not (Get-Command maestro -ErrorAction SilentlyContinue)) {
  throw "Maestro CLI is not installed or is not on PATH. See docs/development.md."
}

& (Join-Path $PSScriptRoot "android-machine.ps1") -Action Ready
if ($LASTEXITCODE -ne 0) {
  throw "Android emulator preparation failed."
}

$fixturePath = Join-Path $mobileRoot ".maestro\.generated\versioned-test-deck.fcrdeck"
Push-Location $mobileRoot
try {
  & npm.cmd run decks:test:generate -- data/test-decks/versioned/v1/deck.json .maestro/.generated/versioned-test-deck.fcrdeck
  if ($LASTEXITCODE -ne 0) {
    throw "Could not generate the Maestro deck fixture."
  }
  if ($resolvedApkPath) {
    & $adbPath install -r $resolvedApkPath
    if ($LASTEXITCODE -ne 0) {
      throw "Could not install the Android APK."
    }
  }
  $installedPackage = & $adbPath shell pm path com.flashcardreels.app
  if ($LASTEXITCODE -ne 0 -or -not $installedPackage) {
    throw "Flashcard Reels is not installed. Supply -ApkPath with a preview APK."
  }
  & $adbPath push $fixturePath /sdcard/Download/versioned-test-deck.fcrdeck
  if ($LASTEXITCODE -ne 0) {
    throw "Could not copy the deck fixture to Android Downloads."
  }

  foreach ($flow in @(
    "archived-progress-continue.yaml",
    "archived-progress-start-fresh.yaml",
    "archived-progress-delete.yaml"
  )) {
    & maestro test (Join-Path ".maestro" $flow)
    if ($LASTEXITCODE -ne 0) {
      throw "Maestro flow failed: $flow"
    }
  }
} finally {
  Pop-Location
}
