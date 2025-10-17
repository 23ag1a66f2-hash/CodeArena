# SMTP Setup Script for CodeArena
# Run this script as Administrator to set environment variables

Write-Host "🚀 CodeArena SMTP Setup Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "📧 Choose your email provider:" -ForegroundColor Cyan
Write-Host "1. Gmail (Recommended)" -ForegroundColor White
Write-Host "2. Outlook/Hotmail" -ForegroundColor White
Write-Host "3. Yahoo" -ForegroundColor White
Write-Host "4. Custom SMTP Server" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-4)"

$smtpHost = ""
$smtpPort = "587"
$smtpUser = ""
$smtpPass = ""

switch ($choice) {
    "1" {
        $smtpHost = "smtp.gmail.com"
        Write-Host "📧 Gmail Configuration" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANT: You need to enable 2-Factor Authentication and generate an App Password!" -ForegroundColor Yellow
        Write-Host "   Go to: https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
        $smtpUser = Read-Host "Enter your Gmail address"
        $smtpPass = Read-Host "Enter your App Password (16 characters)" -AsSecureString
    }
    "2" {
        $smtpHost = "smtp-mail.outlook.com"
        Write-Host "📧 Outlook/Hotmail Configuration" -ForegroundColor Green
        $smtpUser = Read-Host "Enter your Outlook email address"
        $smtpPass = Read-Host "Enter your password" -AsSecureString
    }
    "3" {
        $smtpHost = "smtp.mail.yahoo.com"
        Write-Host "📧 Yahoo Configuration" -ForegroundColor Green
        Write-Host "⚠️  You may need to generate an App Password for Yahoo!" -ForegroundColor Yellow
        $smtpUser = Read-Host "Enter your Yahoo email address"
        $smtpPass = Read-Host "Enter your password or App Password" -AsSecureString
    }
    "4" {
        $smtpHost = Read-Host "Enter your SMTP server hostname"
        $smtpPort = Read-Host "Enter your SMTP port (default: 587)"
        if (-not $smtpPort) { $smtpPort = "587" }
        $smtpUser = Read-Host "Enter your SMTP username"
        $smtpPass = Read-Host "Enter your SMTP password" -AsSecureString
    }
    default {
        Write-Host "❌ Invalid choice!" -ForegroundColor Red
        pause
        exit
    }
}

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPass)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Yellow

[Environment]::SetEnvironmentVariable("SMTP_HOST", $smtpHost, "Machine")
[Environment]::SetEnvironmentVariable("SMTP_PORT", $smtpPort, "Machine")
[Environment]::SetEnvironmentVariable("SMTP_USER", $smtpUser, "Machine")
[Environment]::SetEnvironmentVariable("SMTP_PASS", $plainPassword, "Machine")

Write-Host "✅ Environment variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration Summary:" -ForegroundColor Cyan
Write-Host "   SMTP_HOST: $smtpHost" -ForegroundColor White
Write-Host "   SMTP_PORT: $smtpPort" -ForegroundColor White
Write-Host "   SMTP_USER: $smtpUser" -ForegroundColor White
Write-Host "   SMTP_PASS: [HIDDEN]" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Please restart your server for changes to take effect!" -ForegroundColor Yellow
Write-Host ""

# Test the configuration
Write-Host "🧪 Testing SMTP connection..." -ForegroundColor Cyan
try {
    $env:SMTP_HOST = $smtpHost
    $env:SMTP_PORT = $smtpPort
    $env:SMTP_USER = $smtpUser
    $env:SMTP_PASS = $plainPassword
    
    Write-Host "✅ Environment variables set in current session" -ForegroundColor Green
} catch {
    Write-Host "❌ Error setting environment variables: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. Restart your CodeArena server" -ForegroundColor White
Write-Host "2. Test the password reset functionality" -ForegroundColor White
Write-Host "3. Check server logs for SMTP connection status" -ForegroundColor White

pause 