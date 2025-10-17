// Test script for OTP functionality
import { otpService } from './services/otpService.js';
import { gmailService } from './services/gmailService.js';

async function testOTP() {
  console.log('🧪 Testing OTP functionality...\n');

  // Test 1: Generate OTP
  console.log('1. Testing OTP generation...');
  const otp = otpService.generateOTP();
  console.log(`   Generated OTP: ${otp}`);
  console.log(`   OTP length: ${otp.length}`);
  console.log(`   Is 6 digits: ${/^\d{6}$/.test(otp)}\n`);

  // Test 2: Store and validate OTP
  console.log('2. Testing OTP storage and validation...');
  const testEmail = 'test@example.com';
  otpService.storeOTP(testEmail, otp);
  console.log(`   Stored OTP for ${testEmail}`);
  
  const validation = otpService.validateOTP(testEmail, otp);
  console.log(`   Validation result: ${validation.valid}`);
  console.log(`   Validation message: ${validation.message}\n`);

  // Test 3: Test email service
  console.log('3. Testing email service...');
  try {
    const emailSent = await gmailService.sendOTPEmail(testEmail, otp, 'Test User');
    console.log(`   Email sent successfully: ${emailSent}`);
  } catch (error) {
    console.log(`   Email service error: ${error.message}`);
  }

  console.log('\n✅ OTP testing completed!');
}

// Run the test
testOTP().catch(console.error); 