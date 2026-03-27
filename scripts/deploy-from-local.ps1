# Deploy: run update on server. Set DEPLOY_USE_GIT=1 to use Git (push only, no file upload - fast).
# Usage: .\scripts\deploy-from-local.ps1  or  npm run deploy
# One-time: edit scripts\deploy.local.ps1 with DEPLOY_EC2, DEPLOY_SSH_KEY. For fast deploy add DEPLOY_USE_GIT=1 and a Git remote.

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

# المشروع الحقيقي هو مجلد MerasNode نفسه، مش الأب بتاعه.
# التصحيح: projectRoot = parent لـ scripts (يعني d:\Development\MerasNode)،
# علشان ما يرفعش مجلدات تانية زي AboKhaledfiles بالغلط.
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$localConfig = Join-Path $scriptDir "deploy.local.ps1"
if (Test-Path $localConfig) {
  . $localConfig
}

$ec2 = $env:DEPLOY_EC2
$key = $env:DEPLOY_SSH_KEY
$remoteDir = $env:DEPLOY_REMOTE_DIR
if (-not $remoteDir) { $remoteDir = "~/MerasNode" }
$noPush = $env:DEPLOY_NO_PUSH -eq "1"

if (-not $ec2) {
  Write-Host "DEPLOY_EC2 not set. Edit scripts\deploy.local.ps1 and set your real EC2 host and .pem path." -ForegroundColor Yellow
  exit 1
}

if ($ec2 -match "ec2-xx-xx" -or ($key -and $key -match "path\\to\\your-key")) {
  Write-Host "You still have placeholder values. Edit scripts\deploy.local.ps1:" -ForegroundColor Red
  Write-Host "  1. DEPLOY_EC2 = your real EC2 address (e.g. ec2-user@ec2-13-58-xxx.compute-1.amazonaws.com)" -ForegroundColor White
  Write-Host "  2. DEPLOY_SSH_KEY = full path to your .pem file (e.g. C:\Users\mahmo\.ssh\my-key.pem)" -ForegroundColor White
  exit 1
}

if ($key -and -not (Test-Path $key)) {
  Write-Host "DEPLOY_SSH_KEY file not found: $key" -ForegroundColor Red
  exit 1
}

$useGitDeploy = $env:DEPLOY_USE_GIT -eq "1"
$isGit = Test-Path (Join-Path $projectRoot ".git")

if ($useGitDeploy -and $isGit -and -not $noPush) {
  Write-Host "==> Pushing to Git (no file upload, server will pull)..." -ForegroundColor Green
  $status = git status --porcelain
  if ($status) {
    git add -A
    $msg = $env:DEPLOY_COMMIT_MSG
    if (-not $msg) { $msg = "Deploy: update from local" }
    git commit -m $msg
    git push
  } else {
    Write-Host "No local changes. Server will pull and update." -ForegroundColor Gray
  }
} elseif (-not $useGitDeploy -or -not $isGit) {
  # Upload project via rsync or scp only when NOT using Git deploy
  $excludes = @("node_modules", ".next", "whatsapp-sessions", ".git")
  $sshCmdForRsync = "ssh -o StrictHostKeyChecking=no"
  if ($key) { $sshCmdForRsync += " -i `"$key`"" }

  $rsyncAvailable = $null -ne (Get-Command rsync -ErrorAction SilentlyContinue)
  if ($rsyncAvailable) {
    Write-Host "==> Syncing files to server (rsync)..." -ForegroundColor Green
    $excludeArgs = $excludes | ForEach-Object { "--exclude=$_" }
    & rsync -avz $excludeArgs -e $sshCmdForRsync "$projectRoot/" "${ec2}:${remoteDir}/"
  } else {
    Write-Host "==> Uploading project to server (full upload)..." -ForegroundColor Green
    $scpOpts = @()
    if ($key) { $scpOpts += "-i", $key }
    $scpOpts += "-o", "StrictHostKeyChecking=no"
    Get-ChildItem -Path $projectRoot -Force | Where-Object { $excludes -notcontains $_.Name } | ForEach-Object {
      Write-Host "  $($_.Name)"
      & scp @scpOpts -r $_.FullName "${ec2}:${remoteDir}/"
    }
  }
}

$sshArgs = @()
if ($key) { $sshArgs += "-i", $key }
$sshArgs += $ec2

# 2) Upload deploy script and run update on server
$deployScript = Join-Path $projectRoot (Join-Path "scripts" "deploy-on-ec2.sh")
if (Test-Path $deployScript) {
  & ssh @sshArgs "mkdir -p $remoteDir/scripts"
  $scpArgs = @()
  if ($key) { $scpArgs += "-i", $key }
  $scpArgs += $deployScript, "${ec2}:${remoteDir}/scripts/deploy-on-ec2.sh"
  & scp $scpArgs
  $branch = (git rev-parse --abbrev-ref HEAD 2>$null)
  if (-not $branch) { $branch = "main" }
  $remote = "cd $remoteDir; git fetch origin; git checkout $branch 2>/dev/null || true; chmod +x ./scripts/deploy-on-ec2.sh; ./scripts/deploy-on-ec2.sh"
} else {
  $remote = "cd $remoteDir; [ -s ~/.nvm/nvm.sh ] && . ~/.nvm/nvm.sh && nvm use 20 2>/dev/null; mkdir -p logs; npm install; npm run build; if pm2 describe meras-nextjs &>/dev/null; then pm2 restart ecosystem.config.js; else pm2 start ecosystem.config.js; pm2 save; fi"
}

Write-Host "==> Running update on server (npm install, build, pm2)..." -ForegroundColor Green
& ssh ($sshArgs + $remote)
