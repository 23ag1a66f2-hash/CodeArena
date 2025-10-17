// Sucessfully Resolved Google OAuth2.0 Authentication
import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// FIX: Added .js extensions to all local/relative imports
import { User, IUser } from '../models/User.js';
import { generateToken, protect, AuthRequest } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { Document, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { otpService } from '../services/otpService.js';
import { gmailService } from '../services/gmailService.js';
import { configDotenv } from 'dotenv';

configDotenv();

// Passport serialization
passport.serializeUser((user: any, done) => {
  console.log('[DEBUG] Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    console.log('[DEBUG] Deserializing user:', id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('[DEBUG] Deserialize error:', error);
    done(error);
  }
});

const router = Router();

// Debug middleware for auth routes
router.use((req, res, next) => {
  console.log('[DEBUG] Auth middleware:', req.method, req.originalUrl);
  console.log('[DEBUG] Session:', req.session);
  console.log('[DEBUG] User:', req.user);
  next();
});

// Validation middleware
const validateRegistration = [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }).custom((value) => {
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(value)) {
      throw new Error('Password must contain at least one uppercase letter (A-Z)');
    }
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(value)) {
      throw new Error('Password must contain at least one lowercase letter (a-z)');
    }
    // Check for at least one digit
    if (!/\d]/.test(value)) {
      throw new Error('Password must contain at least one digit (0-9)');
    }
    // Check for at least one special character
    if (!/[!@#$%^&*()\-_=+[\]{};:'",.<>?/|\\]/.test(value)) {
      throw new Error('Password must contain at least one special character (!@#$%^&*()-_=+[]{};:\'",.<>?/|)');
    }
    return true;
  }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
];

interface UserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

// Register with email/password
router.post('/register', validateRegistration, async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Registration attempt:', { 
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      hasPassword: !!req.body.password
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[DEBUG] Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!firstName) missingFields.push('firstName');
      if (!lastName) missingFields.push('lastName');
      
      console.log('[DEBUG] Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }

    // Check if user exists
    console.log('[DEBUG] Checking for existing user with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[DEBUG] User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if there's already a pending verification for this email
    if (otpService.hasValidEmailVerificationOTP(email)) {
      console.log('[DEBUG] Email verification already pending for:', email);
      return res.status(400).json({ 
        message: 'Email verification already pending. Please check your email or wait a few minutes before requesting a new code.' 
      });
    }

    // Generate OTP for email verification
    const otp = otpService.generateOTP();
    
    // Store OTP with user data for later verification
    otpService.storeEmailVerificationOTP(email, otp, {
      firstName,
      lastName,
      password,
      role: 'student'
    });

    console.log(`[DEBUG] Email verification OTP generated for ${email}: ${otp}`);

    // Send email verification email
            const emailSent = await gmailService.sendOTPEmail(email, otp, firstName);

    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    console.log(`[DEBUG] Email verification email sent successfully to ${email}`);

    // Send response indicating verification email was sent
    res.status(200).json({
      message: 'Verification email sent successfully. Please check your email and enter the verification code to complete registration.',
      email: email,
      requiresVerification: true
    });
  } catch (error) {
    console.error('[DEBUG] Registration error:', error);
    
    // Check for mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      console.error('[DEBUG] Mongoose validation error');
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values((error as any).errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    // Check for MongoDB duplicate key error
    if (error instanceof Error && 
        (error as any).code === 11000 && 
        (error as any).keyPattern?.email) {
      console.error('[DEBUG] Duplicate email error');
      return res.status(400).json({ 
        message: 'Email already exists',
        field: 'email'
      });
    }

    console.error('[DEBUG] Unexpected error:', error);
    console.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({ 
      message: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Verify email and complete registration
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    console.log(`[DEBUG] Email verification attempt for: ${email}`);

    // Validate email verification OTP
    const otpValidation = otpService.validateEmailVerificationOTP(email, otp);
    if (!otpValidation.valid) {
      console.log(`[DEBUG] Email verification failed for ${email}: ${otpValidation.message}`);
      return res.status(400).json({ message: otpValidation.message });
    }

    // OTP is valid, create the user
    const { userData } = otpValidation;
    console.log(`[DEBUG] Creating user after email verification for ${email}`);

    const user = await User.create({
      email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      isEmailVerified: true
    }) as UserDocument;

    console.log(`[DEBUG] User created successfully after email verification:`, { 
      id: user._id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Generate token
    const token = generateToken(user._id.toString());
    console.log('[DEBUG] Generated authentication token for verified user');

    // Send response
    res.status(201).json({
      message: 'Email verified successfully! Welcome to CodeArena!',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
    });
  } catch (error) {
    console.error('[DEBUG] Email verification error:', error);
    
    // Check for mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      console.error('[DEBUG] Mongoose validation error');
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values((error as any).errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    // Check for MongoDB duplicate key error
    if (error instanceof Error && 
        (error as any).code === 11000 && 
        (error as any).keyPattern?.email) {
      console.error('[DEBUG] Duplicate email error');
      return res.status(400).json({ 
        message: 'Email already exists',
        field: 'email'
      });
    }

    console.error('[DEBUG] Unexpected error:', error);
    console.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({ 
      message: 'Server error during email verification',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Resend email verification OTP
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log(`[DEBUG] Resend verification requested for email: ${email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(400).json({ message: 'Email is already verified. You can log in directly.' });
      }
      // If user exists but not verified, we can resend verification
    }

    // Check if there's already a valid verification OTP
    if (otpService.hasValidEmailVerificationOTP(email)) {
      return res.status(400).json({ 
        message: 'Please wait a few minutes before requesting a new verification code' 
      });
    }

    // For resend, we need to get the user data from the original registration
    // Since we don't store it permanently, we'll need the user to provide it again
    // For now, we'll return an error asking them to register again
    return res.status(400).json({ 
      message: 'Please complete the registration process again to receive a new verification code.' 
    });
  } catch (error: any) {
    console.error('Error resending verification:', error);
    res.status(500).json({ message: 'Failed to resend verification. Please try again.' });
  }
});

// Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Login attempt:', { email: req.body.email });
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password') as UserDocument;
    if (!user || !(await user.comparePassword(password))) {
      console.log('[DEBUG] Invalid credentials for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified (only for non-Google OAuth users)
    if (!user.googleId && !user.isEmailVerified) {
      console.log('[DEBUG] Email not verified for:', email);
      return res.status(401).json({ 
        message: 'Please verify your email address before logging in. Check your email for a verification code.',
        requiresEmailVerification: true,
        email: email
      });
    }

    console.log('[DEBUG] User authenticated:', { id: user._id, email: user.email });
    const token = generateToken(user._id.toString());

    console.log('[DEBUG] Token generated');

    // Send response
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        isEmailVerified: user.isEmailVerified
      },
    });
  } catch (error) {
    console.error('[DEBUG] Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user endpoint
router.get('/user', protect, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[DEBUG] /user endpoint hit with authenticated user');
    console.log('[DEBUG] User from middleware:', req.user);
    
    if (!req.user) {
      console.log('[DEBUG] No user found in request after auth middleware');
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      profileImageUrl: req.user.profileImageUrl
    });
  } catch (error) {
    console.error('[DEBUG] Error in /user endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Clear any server-side session/token if needed
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});



// Request OTP for password reset
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log(`[DEBUG] OTP requested for email: ${email}`);

    // Check if user exists
    const user = await User.findOne({ email }).select('firstName lastName');
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate and store OTP
    const otp = otpService.generateOTP();
    otpService.storeOTP(email, otp);

    console.log(`[DEBUG] OTP generated and stored for ${email}: ${otp}`);

    // Send OTP email
    const userName = user.firstName || user.email.split('@')[0];
    const emailSent = await gmailService.sendOTPEmail(email, otp, userName);

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    res.json({ 
      message: 'OTP sent successfully to your email',
      email: email // Return email for frontend reference
    });
  } catch (error: any) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP (without resetting password yet)
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Validate OTP
    const otpValidation = otpService.validateOTP(email, otp);
    if (!otpValidation.valid) {
      return res.status(400).json({ message: otpValidation.message });
    }

    // OTP is valid
    res.json({ 
      message: 'OTP verified successfully',
      email: email
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP. Please try again.' });
  }
});

// Verify OTP and reset password
router.post('/verify-otp-reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter (A-Z)' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least one lowercase letter (a-z)' });
    }
    if (!/\d]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least one digit (0-9)' });
    }
    if (!/[!@#$%^&*()\-_=+[\]{};:'",.<>?/|\\]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least one special character (!@#$%^&*()-_=+[]{};:\'",.<>?/|)' });
    }

    // Validate OTP
    // const otpValidation = otpService.validateOTP(email, otp);
    // if (!otpValidation.valid) {
    //   return res.status(400).json({ message: otpValidation.message });
    // }

    // Update user password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    console.error('Error verifying OTP and resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

// Resend OTP (if user didn't receive it)
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('firstName lastName');
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Check if there's already a valid OTP
    if (otpService.hasValidOTP(email)) {
      return res.status(400).json({ message: 'Please wait a few minutes before requesting a new OTP' });
    }

    // Generate and store new OTP
    const otp = otpService.generateOTP();
    otpService.storeOTP(email, otp);

    // Send new OTP email
    const userName = user.firstName || user.email.split('@')[0];
    const emailSent = await gmailService.sendOTPEmail(email, otp, userName);

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    res.json({ 
      message: 'New OTP sent successfully to your email',
      email: email
    });
  } catch (error: any) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '524898025855-g1n4oa8h1nu3mnc96c7aeotroilgi1bv.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const APP_NAME = 'Code Arena';

console.log('[DEBUG] Setting up Google OAuth with:');
console.log('- Client ID:', GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
console.log('- Client Secret:', GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('- Callback URL:', GOOGLE_CALLBACK_URL);
console.log('- Frontend URL:', FRONTEND_URL);
console.log('- Application Name:', APP_NAME);

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: GOOGLE_CALLBACK_URL,
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
  scope: ['profile', 'email']
}, async (accessToken: string, refreshToken: string, profile: passport.Profile, done: (error: any, user?: any) => void) => {
  try {
    console.log('[DEBUG] Google callback received');
    console.log('[DEBUG] Profile:', {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails,
      photos: profile.photos
    });
    
    if (profile.photos && profile.photos.length > 0) {
      console.log('[DEBUG] Profile image URL from Google:', profile.photos[0].value);
    } else {
      console.log('[DEBUG] No profile photos in Google profile');
    }
    
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      console.log('[DEBUG] Creating new user from Google profile');
      // Check if this email is registered as an admin
      const email = profile.emails?.[0]?.value;
      const existingUser = await User.findOne({ email });
      const role = existingUser?.role || 'student'; // Use existing user's role or default to student

      user = await User.create({
        googleId: profile.id,
        email: email,
        firstName: profile.name?.givenName || profile.displayName.split(' ')[0],
        lastName: profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' '),
        profileImageUrl: profile.photos?.[0]?.value,
        role: role, // Assign role based on existing user or default
      });
      console.log('[DEBUG] New user created:', { ...user.toObject(), role });
    } else {
      console.log('[DEBUG] Existing user found, updating profile image');
      // Update existing user's profile image URL if available
      if (profile.photos?.[0]?.value && user.profileImageUrl !== profile.photos[0].value) {
        user.profileImageUrl = profile.photos[0].value;
        await user.save();
        console.log('[DEBUG] Profile image updated for existing user:', profile.photos[0].value);
      }
      console.log('[DEBUG] Existing user:', { ...user.toObject(), role: user.role });
    }

    return done(null, user);
  } catch (error) {
    console.error('[DEBUG] Google strategy error:', error);
    return done(error as Error, undefined);
  }
}));

// Google OAuth routes
router.get('/google', (req, res, next) => {
  console.log('[DEBUG] Starting Google OAuth flow');
  
  // Store returnTo parameter in session for callback
  const returnTo = req.query.returnTo;
  if (returnTo) {
    console.log('[DEBUG] Storing returnTo in session:', returnTo);
    (req.session as any).returnTo = returnTo as string;
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`
  }),
  (req: Request, res: Response) => {
    try {
      console.log('[DEBUG] Google authentication successful');
      const user = req.user as UserDocument;
      const token = generateToken(user._id.toString());
      
      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl
      };

      console.log('[DEBUG] User data:', userData);
      console.log('[DEBUG] User role:', user.role);
      
      // Check for returnTo parameter first, then fall back to role-based redirect
      const returnTo = (req.query.returnTo as string) || (req.session as any)?.returnTo as string | undefined;
      let redirectPath: string;
      
      if (returnTo) {
        redirectPath = returnTo;
        console.log('[DEBUG] Found returnTo parameter, redirecting to:', redirectPath);
        if ((req.session as any)?.returnTo) {
          delete (req.session as any).returnTo;
        }
      } else {
        redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';
        console.log('[DEBUG] No returnTo found, redirecting based on role to:', redirectPath);
      }
      
      // Use the configured frontend URL
      const redirectUrl = `${FRONTEND_URL}/auth-callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userData))}&returnTo=${encodeURIComponent(redirectPath)}`;
      console.log('[DEBUG] Redirecting to client callback URL:', redirectUrl);
      res.set('Cache-Control', 'no-store');
      return res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('[DEBUG] Error in callback handler:', error);
      res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  }
);

console.warn('[DEBUG] End of auth routes configuration');
// Debug endpoint to check user profile images (remove in production)
router.get('/debug/users-profile-images', async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, 'email firstName lastName profileImageUrl googleId').limit(10);
    const userInfo = users.map(user => ({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      hasProfileImage: !!user.profileImageUrl,
      profileImageUrl: user.profileImageUrl,
      isGoogleUser: !!user.googleId
    }));
    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
