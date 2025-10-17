# Gmail API Setup Script for CodeArena
# Run this script as Administrator to set environment variables

Write-Host "🚀 CodeArena Gmail API Setup Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "📧 Gmail API Setup Instructions:" -ForegroundColor Cyan
Write-Host "1. Go to Google Cloud Console: https://console.cloud.google.com/" -ForegroundColor White
Write-Host "2. Create a new project or select existing one" -ForegroundColor White
Write-Host "3. Enable Gmail API for your project" -ForegroundColor White
Write-Host "4. Create OAuth 2.0 credentials" -ForegroundColor White
Write-Host "5. Download the credentials JSON file" -ForegroundColor White
Write-Host "6. Generate a refresh token using the credentials" -ForegroundColor White
Write-Host ""

Write-Host "🔑 Enter your Gmail API credentials:" -ForegroundColor Yellow

$clientId = Read-Host "Enter your Gmail Client ID"
$clientSecret = Read-Host "Enter your Gmail Client Secret" -AsSecureString
$refreshToken = Read-Host "Enter your Gmail Refresh Token" -AsSecureString
$userEmail = Read-Host "Enter your Gmail email address"

# Convert secure strings to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
$plainClientSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($refreshToken)
$plainRefreshToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Yellow

[Environment]::SetEnvironmentVariable("GMAIL_CLIENT_ID", $clientId, "Machine")
[Environment]::SetEnvironmentVariable("GMAIL_CLIENT_SECRET", $plainClientSecret, "Machine")
[Environment]::SetEnvironmentVariable("GMAIL_REFRESH_TOKEN", $plainRefreshToken, "Machine")
[Environment]::SetEnvironmentVariable("GMAIL_USER_EMAIL", $userEmail, "Machine")

Write-Host "✅ Environment variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration Summary:" -ForegroundColor Cyan
Write-Host "   GMAIL_CLIENT_ID: $clientId" -ForegroundColor White
Write-Host "   GMAIL_CLIENT_SECRET: [HIDDEN]" -ForegroundColor White
Write-Host "   GMAIL_REFRESH_TOKEN: [HIDDEN]" -ForegroundColor White
Write-Host "   GMAIL_USER_EMAIL: $userEmail" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Please restart your server for changes to take effect!" -ForegroundColor Yellow
Write-Host ""

# Test the configuration
Write-Host "🧪 Testing Gmail API configuration..." -ForegroundColor Cyan
try {
    $env:GMAIL_CLIENT_ID = $clientId
    $env:GMAIL_CLIENT_SECRET = $plainClientSecret
    $env:GMAIL_REFRESH_TOKEN = $plainRefreshToken
    $env:GMAIL_USER_EMAIL = $userEmail
    
    Write-Host "✅ Environment variables set in current session" -ForegroundColor Green
} catch {
    Write-Host "❌ Error setting environment variables: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. Restart your CodeArena server" -ForegroundColor White
Write-Host "2. Test the Gmail API connection" -ForegroundColor White
Write-Host "3. Test sending a test email" -ForegroundColor White
Write-Host "4. Check server logs for Gmail API status" -ForegroundColor White

Write-Host ""
Write-Host "📚 Gmail API Setup Guide:" -ForegroundColor Cyan
Write-Host "For detailed setup instructions, see:" -ForegroundColor White
Write-Host "https://developers.google.com/gmail/api/quickstart/nodejs" -ForegroundColor Cyan

pause 