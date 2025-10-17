import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, CheckCircle, UserX, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp' | 'password'>('email');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Check if user came from settings page
  const isFromSettings = window.location.search.includes('from=settings') || 
                        document.referrer.includes('/settings');

  // Helper function to check if password contains special characters
  const hasSpecialChar = (password: string) => {
    return /[!@#$%^&*()\-_=+[\]{};:'",.<>?/|\\]/.test(password);
  };

  // Start countdown for resend OTP
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await apiRequest('POST', '/api/auth/request-otp', { email });
      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setCurrentStep('otp');
        startCountdown();
        setMessage('OTP sent successfully! Check your email.');
      } else {
        setMessage(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await apiRequest('POST', '/api/auth/resend-otp', { email });
      const data = await response.json();

      if (response.ok) {
        startCountdown();
        setMessage('New OTP sent successfully!');
      } else {
        setMessage(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and proceed to password reset
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setMessage('Please enter the OTP');
      return;
    }

    console.log('🔐 Verifying OTP:', { email, otp });
    setIsLoading(true);
    setMessage('');

    try {
      // Validate OTP against backend
      const response = await apiRequest('POST', '/api/auth/verify-otp', { 
        email, 
        otp 
      });
      const data = await response.json();

      console.log('📧 OTP verification response:', { status: response.status, data });

      if (response.ok) {
        // OTP is valid, proceed to password reset
        console.log('✅ OTP verified successfully, proceeding to password reset');
        setCurrentStep('password');
        setMessage('');
      } else {
        // OTP is invalid
        console.log('❌ OTP verification failed:', data.message);
        setMessage(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error during OTP verification:', error);
      setMessage('An error occurred while verifying OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setMessage('Password must contain at least one uppercase letter (A-Z)');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setMessage('Password must contain at least one lowercase letter (a-z)');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setMessage('Password must contain at least one digit (0-9)');
      return;
    }
    if (!hasSpecialChar(newPassword)) {
      setMessage('Password must contain at least one special character (!@#$%^&*()-_=+[]{};:\'",.<>?/|)');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await apiRequest('POST', '/api/auth/verify-otp-reset-password', { 
        email, 
        otp, 
        newPassword 
      });
      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage(data.message);
      } else {
        setMessage(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep === 'otp') {
      setCurrentStep('email');
      setOtp('');
      setOtpSent(false);
      setCountdown(0);
    } else if (currentStep === 'password') {
      setCurrentStep('otp');
      setNewPassword('');
      setConfirmPassword('');
    }
    setMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(isFromSettings ? '/settings' : '/login')}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {currentStep === 'email' && "Enter your email to receive a verification code"}
            {currentStep === 'otp' && "Enter the 6-digit code sent to your email"}
            {currentStep === 'password' && "Enter your new password"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!isSuccess ? (
            <>
              {/* Step 1: Email Input */}
              {currentStep === 'email' && (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email address"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>

                  {message && (
                    <Alert variant="destructive">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        <AlertDescription>{message}</AlertDescription>
                      </div>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {currentStep === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="Enter 6-digit code"
                      className="bg-white dark:bg-gray-800 text-center text-2xl font-mono tracking-widest"
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      We've sent a 6-digit code to {email}
                    </p>
                    
                  </div>

                  {message && (
                    <Alert variant={message.includes('successfully') ? 'default' : 'destructive'}>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <Button type="submit" className="w-full" disabled={!otp || otp.length !== 6 || isLoading}>
                      {isLoading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={goBack}
                      >
                        Back
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleResendOTP}
                        disabled={isLoading || countdown > 0}
                      >
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : countdown > 0 ? (
                          `Resend (${countdown}s)`
                        ) : (
                          'Resend Code'
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 3: Password Reset */}
              {currentStep === 'password' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter your new password"
                        className="bg-white dark:bg-gray-800 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Password must contain:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-red-500'}>
                          At least 8 characters
                        </li>
                        <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-500'}>
                          One uppercase letter (A-Z)
                        </li>
                        <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-red-500'}>
                          One lowercase letter (a-z)
                        </li>
                        <li className={/\d/.test(newPassword) ? 'text-green-600' : 'text-red-500'}>
                          One digit (0-9)
                        </li>
                        <li className={hasSpecialChar(newPassword) ? 'text-green-600' : 'text-red-500'}>
                          One special character (!@#$%^&*()-_=+[]{};:&apos;&quot;,&lt;&gt;?/|)
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your new password"
                        className="bg-white dark:bg-gray-800 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {message && (
                    <Alert variant="destructive">
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={goBack}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            // Success message
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Password Reset Successful
                </h3>
                <p className="text-sm text-muted-foreground">
                  {message}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => setLocation(isFromSettings ? '/settings' : '/login')}
                >
                  {isFromSettings ? 'Back to Settings' : 'Sign In'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 