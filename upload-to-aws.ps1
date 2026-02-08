# Upload MerasNode to AWS (no node_modules, .next)
# Run from project folder: powershell -ExecutionPolicy Bypass -File upload-to-aws.ps1

$KeyPath = "$env:USERPROFILE\Downloads\meras-key.pem"
$IP = "34.229.220.83"
$User = "ec2-user"
$RemoteDir = "~/MerasNode"

if (-not (Test-Path $KeyPath)) {
    Write-Host "Key file not found: $KeyPath"
    exit 1
}
if (-not (Test-Path "package.json")) {
    Write-Host "Run from project folder (where package.json is)"
    exit 1
}

Write-Host "Uploading to ${User}@${IP}:${RemoteDir} ..."
$excludes = @("node_modules", ".next", "whatsapp-sessions", ".git")
$items = Get-ChildItem -Path . -Force | Where-Object { $excludes -notcontains $_.Name }
foreach ($item in $items) {
    Write-Host "  $($item.Name)"
    & scp -i $KeyPath -o StrictHostKeyChecking=no -r $item.FullName "${User}@${IP}:${RemoteDir}/"
}
Write-Host "Done. On server run: cd ~/MerasNode; npm install"
