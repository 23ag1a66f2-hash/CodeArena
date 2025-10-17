# 🚀 Gmail API Integration Setup Guide

This guide will help you set up Gmail API integration to replace the previous SMTP email functionality in CodeArena.

## ✅ What's New

- **Gmail API Integration**: Modern, reliable email sending via Google's Gmail API
- **No More SMTP**: Eliminates SMTP configuration issues and limitations
- **Better Reliability**: Gmail API is more stable than SMTP connections
- **Rate Limiting**: Built-in rate limiting and quota management
- **Security**: OAuth 2.0 authentication instead of app passwords

## 🔧 Prerequisites

1. **Google Account**: A Gmail account you want to use for sending emails
2. **Google Cloud Project**: Access to Google Cloud Console
3. **Administrator Access**: To run the setup script on Windows

## 📋 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID** for later use

### Step 2: Enable Gmail API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on **Gmail API** and click **Enable**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Desktop application** as the application type
4. Give it a name (e.g., "CodeArena Email Service")
5. Click **Create**
6. Download the JSON file with your credentials

### Step 4: Generate Refresh Token

1. **Option A: Use the provided script (Recommended)**
   ```bash
   cd server
   node generate-refresh-token.js
   ```

2. **Option B: Manual generation**
   - Use the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Set your OAuth 2.0 credentials
   - Select Gmail API v1 scope: `https://www.googleapis.com/auth/gmail.send`
   - Exchange authorization code for refresh token

### Step 5: Set Environment Variables

Run the setup script as Administrator:

```powershell
# Right-click PowerShell and "Run as Administrator"
cd server
.\setup-gmail-api.ps1
```

Or manually set these environment variables:

```bash
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_USER_EMAIL=your-email@gmail.com
```

## 🧪 Testing the Integration

### Test Connection

```bash
cd server
node test-gmail-api.js
```

### Test Email Sending

```bash
cd server
# Set test email address
$env:TEST_EMAIL="your-test-email@gmail.com"
node test-gmail-api.js
```

### Test from Application

1. Restart your CodeArena server
2. Try the password reset functionality
3. Check server logs for Gmail API status

## 📧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GMAIL_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud | `123456789-abcdef.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | OAuth 2.0 Client Secret | `GOCSPX-abcdefghijklmnop` |
| `GMAIL_REFRESH_TOKEN` | OAuth 2.0 Refresh Token | `1//04abcdefghijklmnop` |
| `GMAIL_USER_EMAIL` | Gmail address for sending emails | `team.codeareena@gmail.com` |

## 🔒 Security Considerations

- **Never commit credentials** to version control
- **Use environment variables** for all sensitive data
- **Rotate refresh tokens** periodically
- **Monitor API usage** in Google Cloud Console
- **Set up alerts** for quota limits

## 🚨 Troubleshooting

### Common Issues

#### 1. "Invalid Credentials" Error
- Verify your Client ID and Client Secret
- Ensure the refresh token is valid and not expired
- Check that the Gmail API is enabled in your project

#### 2. "Insufficient Permission" Error
- Verify the OAuth scope includes `https://www.googleapis.com/auth/gmail.send`
- Check that the user account has permission to send emails
- Ensure the OAuth consent screen is configured properly

#### 3. "Quota Exceeded" Error
- Check your Gmail API quota in Google Cloud Console
- Gmail API has daily sending limits (typically 100 emails/day for free tier)
- Consider upgrading to a paid Google Workspace account for higher limits

#### 4. "Rate Limit Exceeded" Error
- Gmail API has rate limits (typically 250 requests/second)
- Implement exponential backoff in your application
- Monitor your API usage patterns

### Debug Steps

1. **Check Environment Variables**
   ```bash
   echo $env:GMAIL_CLIENT_ID
   echo $env:GMAIL_CLIENT_SECRET
   echo $env:GMAIL_REFRESH_TOKEN
   echo $env:GMAIL_USER_EMAIL
   ```

2. **Test API Connection**
   ```bash
   node test-gmail-api.js
   ```

3. **Check Server Logs**
   Look for Gmail API initialization and error messages

4. **Verify Google Cloud Setup**
   - Check API is enabled
   - Verify OAuth consent screen
   - Confirm credential configuration

## 📊 Monitoring and Analytics

### Google Cloud Console
- **APIs & Services** → **Dashboard**: View API usage
- **APIs & Services** → **Quotas**: Monitor quota limits
- **IAM & Admin** → **IAM**: Check permissions

### Application Logs
The application logs detailed information about:
- Gmail API initialization
- Email sending attempts
- Success/failure status
- Error details and recovery attempts

## 🔄 Migration from SMTP

### What Changed
- **Service**: `gmailService.ts` now handles all email functionality via Gmail API
- **Configuration**: Gmail API credentials instead of SMTP settings
- **Authentication**: OAuth 2.0 instead of username/password

### What Remains the Same
- **Email templates**: Beautiful HTML emails are preserved
- **API interface**: Same method signatures for sending emails
- **Error handling**: Comprehensive error handling and fallbacks
- **Logging**: Detailed logging for debugging and monitoring

### Rollback Plan
If you need to revert to SMTP:
1. Restore the original SMTP-based email service
2. Set SMTP environment variables
3. Restart the server

## 🎯 Next Steps

1. **Complete Setup**: Follow all steps above
2. **Test Integration**: Verify emails are sending correctly
3. **Monitor Usage**: Check Google Cloud Console for API usage
4. **Update Documentation**: Update any deployment guides
5. **Train Team**: Ensure team members understand the new system

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Gmail API Quotas](https://developers.google.com/gmail/api/reference/quota)

## 🆘 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review Google Cloud Console logs
3. Check application logs for detailed error messages
4. Verify all environment variables are set correctly
5. Ensure you have proper permissions in Google Cloud

---

**Note**: This integration replaces the previous SMTP-based email system. All existing email functionality (password reset, verification, etc.) will continue to work with the new Gmail API backend. 