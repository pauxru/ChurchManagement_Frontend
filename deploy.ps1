# Paths
$BuildPath = "$PSScriptRoot"
$DeployPath = "C:\inetpub\wwwroot\PawadTech"

Write-Host "🚀 Starting Deployment Process..."

# Ensure npm dependencies are installed
Write-Host "📦 Installing dependencies..."
npm install

# Remove old deployment if exists
if (Test-Path $DeployPath) {
    Write-Host "🗑 Removing old deployment files..."
    Remove-Item -Recurse -Force $DeployPath
}

# Create deployment folder
Write-Host "📂 Creating deployment directory..."
New-Item -ItemType Directory -Path $DeployPath | Out-Null

# Copy new build files (excluding .git folder and .env.local file)
Write-Host "📂 Copying new build files..."
Get-ChildItem -Path $BuildPath -Recurse -Exclude ".git", ".env.local" | Copy-Item -Destination $DeployPath -Recurse -Force

# Restart IIS
Write-Host "🔄 Restarting IIS..."
iisreset

Write-Host "🚀 Starting Next.js server..."
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c cd $DeployPath"

# Start Next.js server
Write-Host "🚀 Starting Next.js server..."
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npm start"

Write-Host "✅ Deployment Completed Successfully!"
