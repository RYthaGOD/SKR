# CheckNodeJavaAndroid.ps1
Write-Host "Checking Deployment Prerequisites..." -ForegroundColor Cyan

# 1. Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js NOT found. Please install Node.js (LTS)." -ForegroundColor Red
}

# 2. Check Java (JDK 17 recommended)
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    if ($javaVersion -match "17") {
        Write-Host "✅ Java JDK 17 found: $javaVersion" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Java found, but ensure it is JDK 17. Current: $javaVersion" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Java JDK NOT found. Please install JDK 17." -ForegroundColor Red
}

# 3. Check Android SDK Root
if ($env:ANDROID_HOME -or $env:ANDROID_SDK_ROOT) {
    Write-Host "✅ ANDROID_HOME/SDK_ROOT is set." -ForegroundColor Green
}
else {
    Write-Host "❌ Android SDK Environment variable not set." -ForegroundColor Red
    Write-Host "   Note: 'bubblewrap' can often install this for you, but it's good to have." -ForegroundColor Gray
}

# 4. Check Bubblewrap
try {
    $bwVersion = bubblewrap --version
    Write-Host "✅ Bubblewrap CLI found." -ForegroundColor Green
}
catch {
    Write-Host "❌ Bubblewrap CLI not found. Run: npm install -g @bubblewrap/cli" -ForegroundColor Yellow
}

Write-Host "`nCheck complete." -ForegroundColor Cyan
