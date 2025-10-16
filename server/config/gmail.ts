// Gmail API Configuration for Email Service

// --- MODIFICATION START ---
// The configuration now directly references environment variables.
// If any of these are missing, the validation check below will stop the server.
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_USER_EMAIL = process.env.GMAIL_USER_EMAIL;

// Validate that all required Gmail environment variables are provided.
if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER_EMAIL) {
  throw new Error(
    'Missing required Gmail API environment variables. ' +
    'Please ensure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_USER_EMAIL are set in your .env file.'
  );
}
// --- MODIFICATION END ---


export interface GmailAPIConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  userEmail: string;
}

export const gmailConfig: GmailAPIConfig = {
  clientId: GMAIL_CLIENT_ID,
  clientSecret: GMAIL_CLIENT_SECRET,
  refreshToken: GMAIL_REFRESH_TOKEN,
  userEmail: GMAIL_USER_EMAIL
};

// --- MODIFICATION START ---
// This function is now simplified, as there's only one configuration source.
export const getCurrentGmailConfig = (): GmailAPIConfig => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🔧 Environment: ${env} - Loading Gmail API config from environment variables.`);
  return gmailConfig;
};
// --- MODIFICATION END ---


// Gmail API Scopes required for sending emails
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
];

// Gmail API discovery URL
export const GMAIL_DISCOVERY_URL = 'https://gmail.googleapis.com/$discovery/rest?version=v1';