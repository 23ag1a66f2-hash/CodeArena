# SMTP Email Setup for CodeArena Password Reset

This guide will help you set up SMTP email functionality for the password reset feature in CodeArena.

## 🚀 Features Implemented

✅ **OTP-based Password Reset** - Secure 6-digit verification codes  
✅ **Beautiful Email Templates** - Professional HTML emails with CodeArena branding  
✅ **SMTP Integration** - Works with Gmail, Outlook, Yahoo, and custom SMTP servers  
✅ **Rate Limiting** - 60-second cooldown between OTP requests  
✅ **Security Features** - OTP expires in 10 minutes, max 3 attempts  
✅ **Works for All Users** - Both logged-in and non-logged-in users can reset passwords  

## 📧 SMTP Configuration

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Set Environment Variables**:

```bash
# Create .env file in server directory
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
```

### Option 2: Outlook/Hotmail

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Option 3: Yahoo

```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Option 4: Custom SMTP Server

```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## 🔧 Installation

1. **Install Dependencies** (already done):
```bash
cd server
npm install nodemailer crypto-js
npm install --save-dev @types/nodemailer
```

2. **Set Environment Variables**:
   - Copy the example above
   - Replace with your actual SMTP credentials
   - Restart the server

3. **Test Connection**:
   The server will automatically test the SMTP connection on startup.

## 📱 User Flow

### For Non-Logged-In Users:
1. **Login Page** → Click "Forgot password?"
2. **Email Input** → Enter email address
3. **OTP Verification** → Enter 6-digit code from email
4. **Password Reset** → Enter new password + confirm
5. **Success** → Redirected to login page

### For Logged-In Users:
1. **Settings Page** → Click "Change password?"
2. **Email Input** → Enter email address
3. **OTP Verification** → Enter 6-digit code from email
4. **Password Reset** → Enter new password + confirm
5. **Success** → Returned to settings page

## 🎨 Email Template Features

- **Professional Design** - Clean, modern HTML template
- **CodeArena Branding** - Logo, colors, and branding
- **Responsive Layout** - Works on all devices
- **Clear Instructions** - Step-by-step guidance
- **Security Information** - 10-minute expiration notice
- **Social Links** - Easy access to CodeArena resources

## 🔒 Security Features

- **OTP Expiration** - Codes expire after 10 minutes
- **Rate Limiting** - 60-second cooldown between requests
- **Attempt Limiting** - Max 3 failed attempts per OTP
- **Secure Storage** - OTPs stored in memory (production: use Redis)
- **Password Validation** - Enhanced requirements enforced

## 🚨 Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Check your SMTP credentials
   - For Gmail: Use App Password, not regular password
   - Enable "Less secure app access" (if available)

2. **"Connection timeout"**
   - Check firewall settings
   - Verify SMTP host and port
   - Try different ports (587, 465, 25)

3. **"OTP not sent"**
   - Check server logs for SMTP errors
   - Verify email address exists in database
   - Check spam folder

### Testing:

1. **Test SMTP Connection**:
```bash
# Check server logs for connection status
```

2. **Test Email Flow**:
   - Use a real email address
   - Check spam/junk folders
   - Verify OTP delivery

## 📁 Files Modified

- `server/services/otpService.ts` - OTP generation and validation
- `server/services/emailService.ts` - SMTP email service
- `server/routes/auth.ts` - New OTP endpoints
- `client/src/pages/auth/ForgotPassword.tsx` - Updated UI
- `server/config/gmail.ts` - Gmail API configuration

## 🔄 API Endpoints

- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp-reset-password` - Verify OTP and reset password
- `POST /api/auth/resend-otp` - Resend OTP

## 🎯 Next Steps

1. **Set Environment Variables** with your SMTP credentials
2. **Test the Flow** with a real email address
3. **Customize Email Template** if needed
4. **Monitor Logs** for any SMTP issues
5. **Production Deployment** - Consider using Redis for OTP storage

## 📞 Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify SMTP credentials and settings
3. Test with different email providers
4. Check firewall and network settings

---

**Note**: For production use, consider implementing additional security measures like IP rate limiting, CAPTCHA verification, and using Redis for OTP storage instead of in-memory storage. 