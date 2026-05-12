# Frontend deployment script.
#
# Builds the Next.js app, copies only the build output (not source, not node_modules)
# to the IIS site path, installs production dependencies in the destination, then
# (re)starts the Next.js server under PM2.
#
# Prerequisites on the host:
#   - Node 20+ on PATH
#   - PM2 installed globally:  npm install -g pm2  (and once: pm2 install pm2-windows-startup)
#
# Usage:
#   .\deploy.ps1                    # uses default $DeployPath below
#   .\deploy.ps1 -DeployPath D:\sites\Pawad   # override target

[CmdletBinding()]
param(
    [string]$DeployPath = "C:\inetpub\wwwroot\PawadTech",
    [string]$AppName    = "pawadtech-frontend",
    [int]   $Port       = 3000
)

$ErrorActionPreference = "Stop"
$BuildPath = $PSScriptRoot

Write-Host "Frontend deployment starting..."
Write-Host "  Source : $BuildPath"
Write-Host "  Target : $DeployPath"

# 1. Install dev + prod deps in source so we can build.
Write-Host "`n[1/5] Installing dependencies (source)..."
Push-Location $BuildPath
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed in source" }

    # 2. Build.
    Write-Host "`n[2/5] Building Next.js app..."
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
} finally {
    Pop-Location
}

# 3. Copy build output to deployment path.
# We copy only the artifacts Next.js needs at runtime: the .next folder, public
# assets, and the package manifests. node_modules is installed fresh in the
# destination (prod-only) to avoid shipping dev tooling.
Write-Host "`n[3/5] Copying build artifacts..."
if (Test-Path $DeployPath) {
    # Stop running app so files aren't locked.
    pm2 delete $AppName 2>$null | Out-Null
    Remove-Item -Recurse -Force $DeployPath
}
New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null

$itemsToCopy = @(
    ".next",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.ts"
)
foreach ($item in $itemsToCopy) {
    $src = Join-Path $BuildPath $item
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $DeployPath -Recurse -Force
    } else {
        Write-Warning "  Skipping missing item: $item"
    }
}

# 4. Install prod-only deps in destination.
Write-Host "`n[4/5] Installing production dependencies (destination)..."
Push-Location $DeployPath
try {
    npm ci --omit=dev
    if ($LASTEXITCODE -ne 0) { throw "npm ci --omit=dev failed in destination" }

    # 5. Start (or restart) under PM2.
    Write-Host "`n[5/5] Starting app under PM2..."
    $env:PORT = "$Port"
    pm2 start npm --name $AppName -- start
    if ($LASTEXITCODE -ne 0) { throw "pm2 start failed" }
    pm2 save | Out-Null
} finally {
    Pop-Location
}

Write-Host "`nDeployment complete. App '$AppName' is serving on port $Port."
Write-Host "Tail logs with: pm2 logs $AppName"
