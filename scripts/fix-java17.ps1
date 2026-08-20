# fix-java17.ps1 — 持久化 Java 17 兼容补丁
# 在 npm install / npx cap sync 后运行此脚本

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Output "[fix-java17] Applying Java 17 patches..."

$files = @(
    "$root\node_modules\@capacitor\android\capacitor\build.gradle",
    "$root\node_modules\@capacitor\local-notifications\android\build.gradle",
    "$root\node_modules\@capacitor\status-bar\android\build.gradle",
    "$root\node_modules\@capgo\capacitor-navigation-bar\android\build.gradle",
    "$root\android\app\capacitor.build.gradle",
    "$root\android\capacitor-cordova-android-plugins\build.gradle"
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        $content = $content -replace 'JavaVersion\.VERSION_21', 'JavaVersion.VERSION_17'
        $content = $content -replace 'jvmToolchain\(21\)', 'jvmToolchain(17)'
        Set-Content -Path $f -Value $content -NoNewline
        Write-Output "  Patched: $f"
    }
}

Write-Output "[fix-java17] Done."
