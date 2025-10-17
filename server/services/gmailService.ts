import { google } from 'googleapis';
import { getCurrentGmailConfig, GMAIL_SCOPES } from '../config/gmail';

export class GmailService {
  private gmail: any;
  private config: any;

  constructor() {
    this.config = getCurrentGmailConfig();
    this.initializeGmailAPI();
  }

  private initializeGmailAPI() {
    try {
      // *** START DEBUG SECTION ***
      console.log('[DEBUG] Gmail API Credentials from .env:');
      console.log('CLIENT_ID:', this.config.clientId);
      console.log('CLIENT_SECRET:', this.config.clientSecret);
      console.log('REFRESH_TOKEN:', this.config.refreshToken);
      console.log('USER_EMAIL:', this.config.userEmail);
      // *** END DEBUG SECTION ***

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        // *** CRITICAL CHANGE: Use the correct redirect URI for web applications ***
        // This URI must be registered in the Google Cloud Console.
        // It's typically the one used for the OAuth Playground to get a refresh token.
        'https://developers.google.com/oauthplayground' 
      );

      // Set credentials using refresh token
      oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken
      });

      // Create Gmail API client
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      console.log('📧 Gmail API Service initialized successfully');
      console.log(`📧 Using email: ${this.config.userEmail}`);
    } catch (error) {
      console.error('❌ Failed to initialize Gmail API:', error);
      throw error;
    }
  }

  // Generate beautiful HTML email template (same as before)
  private generateOTPEmailTemplate(otp: string, userName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your CodeArena password reset</title>
        <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f8fafc;
        color: #1e293b;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .email-card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        margin: 20px 0;
      }
      .header {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        padding: 40px 30px;
        text-align: center;
        color: white;
      }
      .logo {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .logo-icon {
        width: 50px;
        height: 50px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      .title {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
        opacity: 0.95;
      }
      .content {
        padding: 40px 30px;
        text-align: center;
      }
      .instruction {
        font-size: 16px;
        line-height: 1.6;
        color: #475569;
        margin-bottom: 30px;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }
      .otp-container {
        background: #f1f5f9;
        border-radius: 12px;
        padding: 30px;
        margin: 30px 0;
        border: 2px solid #e2e8f0;
      }
      .otp-code {
        font-size: 48px;
        font-weight: bold;
        color: #1e293b;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        margin: 0;
        text-align: center;
      }
      .otp-label {
        font-size: 14px;
        color: #64748b;
        margin-top: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .disclaimer {
        font-size: 14px;
        color: #64748b;
        line-height: 1.5;
        margin: 30px 0;
        padding: 20px;
        background: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid #10b981;
      }
      .footer {
        background: #f8fafc;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e2e8f0;
      }
      .tagline {
        font-size: 16px;
        color: #475569;
        margin-bottom: 20px;
        font-weight: 500;
      }
      .social-links {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 20px;
      }
      .social-icon {
        width: 40px;
        height: 40px;
        background: #e2e8f0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        text-decoration: none;
        transition: all 0.2s;
      }
      .social-icon:hover {
        background: #10b981;
        color: white;
        transform: translateY(-2px);
      }
      .copyright {
        font-size: 12px;
        color: #94a3b8;
      }
      @media (max-width: 600px) {
        .container { padding: 10px; }
        .header { padding: 30px 20px; }
        .content { padding: 30px 20px; }
        .otp-code { font-size: 36px; letter-spacing: 6px; }
      }
        </style>
    </head>
    <body>
        <div class="container">
      <div class="email-card">
            <div class="header">
          <div class="logo" >
            <div class="logo-icon">
              <div style="width: 50px; height: 50px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                🚀
              </div>
            </div>
            <div style="text-align: center; margin:0 auto;">
                CodeArena
            </div>
            </div>
          <h1 class="title">Verify your password reset</h1>
        </div>
        
            <div class="content">
          <p class="instruction">
            Hi ${userName}, we received a password reset request for your CodeArena account. 
            Please enter the verification code below in the browser window where you requested the reset.
          </p>
          
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">Verification Code</div>
                </div>
                
          <div class="disclaimer">
            <strong>Important:</strong> If you didn't request a password reset, please ignore this email. 
            The verification code will expire in <strong>10 minutes</strong> for security reasons.
          </div>
                </div>
                
        <div class="footer">
          <div class="tagline">
            CodeArena - Master coding challenges, compete with peers, and advance your programming skills
                </div>
                
                
          
          <div class="copyright">
            © ${new Date().getFullYear()} CodeArena. All rights reserved.
                </div>
            </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Send OTP email using Gmail API
  async sendOTPEmail(email: string, otp: string, userName: string): Promise<boolean> {
    try {
      console.log(`📧 Sending OTP email to ${email} via Gmail API...`);

      // Create email message
      const message = this.createEmailMessage(email, otp, userName);
      
      // Send email via Gmail API
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log(`✅ OTP email sent successfully to ${email} via Gmail API`);
      console.log(`📧 Message ID: ${response.data.id}`);
      return true;

    } catch (error: any) {
      console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
      
      // Try to provide more detailed error information
      if (error.code === 401) {
        console.error('❌ Authentication failed. Please check your Gmail API credentials.');
      } else if (error.code === 403) {
        console.error('❌ Permission denied. Please check Gmail API scopes and permissions.');
      } else if (error.code === 429) {
        console.error('❌ Rate limit exceeded. Please wait before sending more emails.');
      }
      
      return false;
    }
  }

  // Create email message in Gmail API format
  private createEmailMessage(to: string, otp: string, userName: string): string {
    const subject = 'CodeArena Password Reset - Verification Code';
    const htmlContent = this.generateOTPEmailTemplate(otp, userName);
    
    // Create email headers
    const headers = [
      `From: "CodeArena" <${this.config.userEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8'
    ].join('\r\n');

    // Combine headers and content
    const email = `${headers}\r\n\r\n${htmlContent}`;
    
    // Encode to base64 and make URL-safe
    return Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Test Gmail API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Gmail API connection...');
      
      // Try to get user profile to test authentication
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      console.log('✅ Gmail API connection verified successfully');
      console.log(`📧 Connected as: ${response.data.emailAddress}`);
      return true;
      
    } catch (error: any) {
      console.error('❌ Gmail API connection test failed:', error.message);
      return false;
    }
  }

  // Send a simple test email
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      console.log(`🧪 Sending test email to ${to}...`);
      
      const testMessage = this.createTestEmailMessage(to);
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: testMessage
        }
      });

      console.log(`✅ Test email sent successfully to ${to}`);
      console.log(`📧 Message ID: ${response.data.id}`);
      return true;
      
    } catch (error: any) {
      console.error(`❌ Failed to send test email to ${to}:`, error.message);
      return false;
    }
  }

  // Create test email message
  private createTestEmailMessage(to: string): string {
    const subject = 'Gmail API Test - CodeArena';
    const htmlContent = `
      <html>
        <body>
          <h1>Gmail API Test</h1>
          <p>This is a test email to verify that the Gmail API integration is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
          <p>If you received this email, the Gmail API integration is working!</p>
        </body>
      </html>
    `;
    
    const headers = [
      `From: "CodeArena" <${this.config.userEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8'
    ].join('\r\n');

    const email = `${headers}\r\n\r\n${htmlContent}`;
    
    return Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

export const gmailService = new GmailService();