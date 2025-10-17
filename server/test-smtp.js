// Test SMTP connection
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'pearai095@gmail.com',
    pass: 'vtrs fznp jzis fupr',
  },
});

async function testSMTP() {
  try {
    console.log('🧪 Testing SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Test sending email
    console.log('📧 Testing email sending...');
    const info = await transporter.sendMail({
      from: '"CodeArena" <pearai095@gmail.com>',
      to: 'pearai095@gmail.com',
      subject: 'SMTP Test - CodeArena',
      text: 'This is a test email to verify SMTP is working.',
      html: '<h1>SMTP Test</h1><p>This is a test email to verify SMTP is working.</p>'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    console.error('Error details:', error);
  }
}

testSMTP(); 