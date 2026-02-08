# من مجلد المشروع: .\deploy.ps1
$config = Join-Path $PSScriptRoot "scripts\deploy.local.ps1"
$example = Join-Path $PSScriptRoot "scripts\deploy.config.ps1.example"
if (-not (Test-Path $config) -and (Test-Path $example)) {
  Copy-Item $example $config
  Write-Host "تم إنشاء scripts\deploy.local.ps1 — عدّل عنوان السيرفر ومسار المفتاح ثم شغّل .\deploy.ps1 مرة أخرى." -ForegroundColor Yellow
  notepad $config
  exit 0
}
& (Join-Path $PSScriptRoot "scripts\deploy-from-local.ps1")
