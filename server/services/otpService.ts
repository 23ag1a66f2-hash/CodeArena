import crypto from 'crypto';
import { User } from '../models/User.js';

interface OTPData {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

interface EmailVerificationOTPData {
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  userData: {
    firstName: string;
    lastName: string;
    password: string;
    role: string;
  };
}

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map<string, OTPData>();
const emailVerificationOTPStore = new Map<string, EmailVerificationOTPData>();

export class OTPService {
  private static instance: OTPService;
  
  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService();
    }
    return OTPService.instance;
  }

  // Generate a 6-digit OTP - ALWAYS random
  generateOTP(): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 Generated OTP: ${otp}`);
    return otp;
  }

  // Store OTP with expiration (10 minutes)
  storeOTP(email: string, otp: string): void {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    otpStore.set(email, {
      email,
      otp,
      expiresAt,
      attempts: 0
    });
  }

  // Store email verification OTP for new user registration
  storeEmailVerificationOTP(email: string, otp: string, userData: {
    firstName: string;
    lastName: string;
    password: string;
    role: string;
  }): void {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    emailVerificationOTPStore.set(email, {
      email,
      otp,
      expiresAt,
      attempts: 0,
      userData
    });
    console.log(`🔐 Stored email verification OTP for ${email}: ${otp}`);
  }

  // Validate OTP
  validateOTP(email: string, otp: string): { valid: boolean; message: string } {
    const otpData = otpStore.get(email);
    
    if (!otpData) {
      return { valid: false, message: 'OTP not found or expired' };
    }

    if (otpData.expiresAt < new Date()) {
      otpStore.delete(email);
      return { valid: false, message: 'OTP has expired' };
    }

    if (otpData.attempts >= 3) {
      otpStore.delete(email);
      return { valid: false, message: 'Too many attempts. Please request a new OTP' };
    }

    if (otpData.otp !== otp) {
      otpData.attempts++;
      return { valid: false, message: 'Invalid OTP' };
    }

    // OTP is valid, remove it from store
    otpStore.delete(email);
    return { valid: true, message: 'OTP validated successfully' };
  }

  // Validate email verification OTP for new user registration
  validateEmailVerificationOTP(email: string, otp: string): { 
    valid: boolean; 
    message: string; 
    userData?: any;
  } {
    const otpData = emailVerificationOTPStore.get(email);
    
    if (!otpData) {
      return { valid: false, message: 'Verification code not found or expired' };
    }

    if (otpData.expiresAt < new Date()) {
      emailVerificationOTPStore.delete(email);
      return { valid: false, message: 'Verification code has expired' };
    }

    if (otpData.attempts >= 3) {
      emailVerificationOTPStore.delete(email);
      return { valid: false, message: 'Too many attempts. Please request a new verification code' };
    }

    if (otpData.otp !== otp) {
      otpData.attempts++;
      return { valid: false, message: 'Invalid verification code' };
    }

    // OTP is valid, remove it from store and return user data
    const userData = otpData.userData;
    emailVerificationOTPStore.delete(email);
    return { 
      valid: true, 
      message: 'Email verified successfully',
      userData
    };
  }

  // Check if OTP exists and is not expired
  hasValidOTP(email: string): boolean {
    const otpData = otpStore.get(email);
    return otpData ? otpData.expiresAt > new Date() : false;
  }

  // Check if email verification OTP exists and is not expired
  hasValidEmailVerificationOTP(email: string): boolean {
    const otpData = emailVerificationOTPStore.get(email);
    return otpData ? otpData.expiresAt > new Date() : false;
  }

  // Clean expired OTPs
  cleanupExpiredOTPs(): void {
    const now = new Date();
    for (const [email, otpData] of otpStore.entries()) {
      if (otpData.expiresAt < now) {
        otpStore.delete(email);
      }
    }
    
    for (const [email, otpData] of emailVerificationOTPStore.entries()) {
      if (otpData.expiresAt < now) {
        emailVerificationOTPStore.delete(email);
      }
    }
  }
}

export const otpService = OTPService.getInstance();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 5 * 60 * 1000); 