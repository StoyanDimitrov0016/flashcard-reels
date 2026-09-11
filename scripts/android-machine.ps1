param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Start", "Stop")]
  [string]$Action
)

$ErrorActionPreference = "Stop"

# Temporary workaround for this Windows machine. Emulator 37.1.11 freezes
# before Android boots, while Google's archived 36.6.11 build works.
$emulatorPath = if ($env:FLASHCARD_ANDROID_EMULATOR) {
  $env:FLASHCARD_ANDROID_EMULATOR
} else {
  "D:\AndroidEmulatorArchive\36.6.11\emulator\emulator.exe"
}
$avdName = if ($env:FLASHCARD_ANDROID_AVD) {
  $env:FLASHCARD_ANDROID_AVD
} else {
  "Expo_API_35_Stable"
}
$androidSdk = if ($env:ANDROID_HOME) {
  $env:ANDROID_HOME
} else {
  [Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")
}

if (-not $androidSdk) {
  throw "ANDROID_HOME is not set for this process or Windows user."
}

$adbPath = Join-Path $androidSdk "platform-tools\adb.exe"

function Stop-LocalEmulator {
  $deviceLines = & $adbPath devices 2>$null
  foreach ($line in $deviceLines) {
    if ($line -match "^(emulator-\d+)\s+device$") {
      & $adbPath -s $Matches[1] emu kill 2>$null | Out-Null
    }
  }

  Start-Sleep -Seconds 2
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -in @("emulator.exe", "qemu-system-x86_64.exe") -and
      ($_.ExecutablePath -like "D:\AndroidEmulatorArchive\36.6.11\emulator\*" -or
        $_.CommandLine -match [regex]::Escape($avdName))
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

if (-not (Test-Path -LiteralPath $adbPath)) {
  throw "adb not found at '$adbPath'. Check ANDROID_HOME."
}

if ($Action -eq "Stop") {
  Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

  Stop-LocalEmulator
  & $adbPath kill-server 2>$null | Out-Null
  Write-Host "Stopped Metro on port 8081, the local emulator, and adb."
  exit 0
}

if (-not (Test-Path -LiteralPath $emulatorPath)) {
  throw "Working emulator not found at '$emulatorPath'. See docs/development.md."
}

& $adbPath start-server | Out-Null
$onlineEmulator = (& $adbPath devices) -match "^emulator-\d+\s+device$"

if (-not $onlineEmulator) {
  Stop-LocalEmulator
  & $adbPath kill-server 2>$null | Out-Null
  & $adbPath start-server | Out-Null

  Write-Host "Starting $avdName with known-good Emulator 36.6.11..."
  $env:ANDROID_SDK_ROOT = $androidSdk
  Start-Process -FilePath $emulatorPath -ArgumentList @("-avd", $avdName, "-no-snapshot-load")

  $waitForDevice = Start-Process -FilePath $adbPath -ArgumentList @("wait-for-device") -PassThru -NoNewWindow
  if (-not $waitForDevice.WaitForExit(120000)) {
    Stop-Process -Id $waitForDevice.Id -Force -ErrorAction SilentlyContinue
    throw "The Android emulator did not connect within two minutes."
  }

  $booted = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ((& $adbPath shell getprop sys.boot_completed 2>$null).Trim() -eq "1") {
      $booted = $true
      break
    }
    Start-Sleep -Seconds 2
  }
  if (-not $booted) {
    throw "The Android emulator connected but did not finish booting within two minutes."
  }
}

Write-Host "Android is ready. Starting Expo; press Ctrl+C to stop Metro."
& npm.cmd run android
