// Test Gmail API integration
import { gmailService } from './services/gmailService.js';

async function testGmailAPI() {
  try {
    console.log('🧪 Testing Gmail API integration...');
    
    // Test connection
    console.log('\n1️⃣ Testing Gmail API connection...');
    const connectionResult = await gmailService.testConnection();
    
    if (!connectionResult) {
      console.error('❌ Gmail API connection failed');
      return;
    }
    
    // Test sending email
    console.log('\n2️⃣ Testing email sending...');
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    if (testEmail === 'test@example.com') {
      console.log('⚠️  Set TEST_EMAIL environment variable to test actual email sending');
      console.log('   Example: TEST_EMAIL=your-email@gmail.com node test-gmail-api.js');
      return;
    }
    
    const emailResult = await gmailService.sendTestEmail(testEmail);
    
    if (emailResult) {
      console.log('✅ Gmail API integration test completed successfully!');
      console.log(`📧 Test email sent to: ${testEmail}`);
    } else {
      console.error('❌ Email sending test failed');
    }
    
  } catch (error) {
    console.error('❌ Gmail API test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Check if environment variables are set
console.log('🔍 Checking Gmail API configuration...');
const requiredVars = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_USER_EMAIL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Run the setup script: setup-gmail-api.ps1');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
testGmailAPI(); 