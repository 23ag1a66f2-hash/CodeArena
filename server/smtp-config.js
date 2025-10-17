// SMTP Configuration for CodeArena
// Edit this file with your SMTP credentials and restart the server

module.exports = {
  // Gmail Configuration (Recommended)
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',        // Replace with your Gmail
      pass: 'your-app-password'            // Replace with your App Password
    }
  },

  // Outlook/Hotmail Configuration
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@outlook.com',      // Replace with your Outlook email
      pass: 'your-password'                // Replace with your password
    }
  },

  // Yahoo Configuration
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@yahoo.com',        // Replace with your Yahoo email
      pass: 'your-app-password'            // Replace with your App Password
    }
  },

  // Custom SMTP Server
  custom: {
    host: 'your-smtp-server.com',          // Replace with your SMTP server
    port: 587,
    secure: false,
    auth: {
      user: 'your-username',               // Replace with your username
      pass: 'your-password'                // Replace with your password
    }
  }
};

// INSTRUCTIONS:
// 1. Choose one of the configurations above (gmail, outlook, yahoo, or custom)
// 2. Replace the placeholder values with your actual credentials
// 3. Copy the chosen configuration to your .env file or set environment variables
// 4. Restart the server

// For Gmail:
// - Enable 2-Factor Authentication
// - Generate App Password (not your regular password)
// - Use the App Password in the 'pass' field

// Example .env file:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=your-email@gmail.com
// SMTP_PASS=your-16-digit-app-password 