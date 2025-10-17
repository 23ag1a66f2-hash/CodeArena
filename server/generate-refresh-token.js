// Generate Gmail API Refresh Token
// This script helps you generate a refresh token for Gmail API integration

import { google } from 'googleapis';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateRefreshToken() {
  try {
    console.log('🚀 Gmail API Refresh Token Generator');
    console.log('=====================================');
    console.log('');
    
    // Get credentials from user
    const clientId = await question('Enter your Gmail Client ID: ');
    const clientSecret = await question('Enter your Gmail Client Secret: ');
    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    
    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose'
      ],
      prompt: 'consent' // Force consent to get refresh token
    });
    
    console.log('');
    console.log('🔗 Authorization URL:');
    console.log(authUrl);
    console.log('');
    console.log('📋 Instructions:');
    console.log('1. Copy the URL above and paste it in your browser');
    console.log('2. Sign in with your Google account');
    console.log('3. Grant permission to the application');
    console.log('4. Copy the authorization code from the browser');
    console.log('');
    
    const authCode = await question('Enter the authorization code: ');
    
    // Exchange authorization code for tokens
    console.log('');
    console.log('🔄 Exchanging authorization code for tokens...');
    
    const { tokens } = await oauth2Client.getToken(authCode);
    
    console.log('');
    console.log('✅ Tokens generated successfully!');
    console.log('');
    console.log('📋 Your Gmail API Configuration:');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GMAIL_USER_EMAIL=${tokens.email || 'your-email@gmail.com'}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Set these as environment variables');
    console.log('2. Run the setup script: setup-gmail-api.ps1');
    console.log('3. Test the integration: node test-gmail-api.js');
    console.log('');
    
    // Test the connection
    console.log('🧪 Testing the connection...');
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    console.log(`✅ Connected successfully as: ${profile.data.emailAddress}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error generating refresh token:', error.message);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('1. Verify your Client ID and Client Secret are correct');
    console.error('2. Ensure Gmail API is enabled in your Google Cloud project');
    console.error('3. Check that you have proper OAuth consent screen setup');
    console.error('4. Make sure you copied the authorization code correctly');
  } finally {
    rl.close();
  }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateRefreshToken();
} 