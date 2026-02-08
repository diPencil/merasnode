# Close any Chrome/Chromium process using the WhatsApp session folder (fixes "browser is already running")
$sessionPath = Join-Path $PSScriptRoot "whatsapp-sessions"
if (-not (Test-Path $sessionPath)) {
    Write-Host "No whatsapp-sessions folder found."
    exit 0
}
$killed = 0
Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe' OR Name = 'chromium.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmd = $_.CommandLine
        if ($cmd -and $cmd -like "*$sessionPath*") {
            Write-Host "Stopping PID $($_.ProcessId)..."
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            $killed++
        }
    } catch {}
}
if ($killed -eq 0) {
    Write-Host "No WhatsApp browser process found (or already closed)."
} else {
    Write-Host "Stopped $killed process(es). Wait a few seconds then try Connect WhatsApp again."
}
