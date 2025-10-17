# Email Verification - Quick Start Guide

## 🚀 What's New

Your CodeArena now requires email verification for new user registrations! Users must verify their email before they can log in.

## ✅ What Works

- **New Users**: Must verify email during registration
- **Existing Users**: Continue working normally
- **Google OAuth**: No verification needed (already verified)
- **Password Reset**: Still works as before

## 🔧 Setup Required

### 1. Check SMTP Configuration
Your Gmail API is configured in `server/config/gmail.ts`:
```typescript
export const gmailConfig = {
  clientId: 'your-gmail-client-id',
  clientSecret: 'your-gmail-client-secret',
  refreshToken: 'your-gmail-refresh-token',
  userEmail: 'your-email@gmail.com'
};
```

### 2. Restart Server
```bash
cd server
npm run dev
```

## 🧪 Test the System

### Test Script
```bash
cd server
node test-email-verification.js
```

### Manual Testing
1. Go to registration page
2. Fill out form with real email
3. Check email for verification code
4. Enter code to complete registration
5. Try logging in

## 📧 Email Templates

- **Registration**: Welcome email with verification code
- **Password Reset**: Existing password reset emails
- **Both**: Beautiful HTML templates with CodeArena branding

## 🔒 Security Features

- 6-digit OTP codes
- 10-minute expiration
- Max 3 attempts per code
- Rate limiting protection

## 🚨 Troubleshooting

### Emails Not Sending
- Check SMTP credentials
- Verify firewall settings
- Check server logs

### OTP Not Working
- Check expiration time
- Verify attempt limits
- Check server time sync

## 📚 Full Documentation

See `EMAIL_VERIFICATION_IMPLEMENTATION.md` for complete details.

## 🎯 Next Steps

1. Test with real email
2. Monitor server logs
3. Check user registration flow
4. Verify login restrictions work

---

**Note**: This system only affects NEW user registrations. Existing users and Google OAuth users are unaffected. 