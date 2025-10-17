import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from 'wouter';
import { config, endpoints } from '@/config';
import { Eye, EyeOff } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: (token: string) => void;
  plain?: boolean;
}

export function RegisterForm({ onSuccess, plain = false }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();

  // New state for email verification
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationOTP, setVerificationOTP] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Helper function to check if password contains special characters
  const hasSpecialChar = (password: string) => {
    return /[!@#$%^&*()\-_=+[\]{};:'",.<>?/|\\]/.test(password);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(endpoints.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Registration failed');
      }

      const data = await response.json();

      if (data.requiresVerification) {
        // Move to verification step
        setVerificationEmail(data.email);
        setVerificationStep(true);
        setIsLoading(false);
      } else {
        // Direct registration (fallback)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onSuccess?.(data.token);
        setLocation('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerificationLoading(true);

    try {
      const response = await fetch(endpoints.verifyEmail, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail,
          otp: verificationOTP,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Email verification failed');
      }

      const data = await response.json();

      // Registration completed successfully
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onSuccess?.(data.token);
      setLocation('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email verification failed');
      setVerificationLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    try {
      const response = await fetch(endpoints.resendVerification, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to resend verification');
      }

      // Show success message
      setError('Verification code resent successfully! Please check your email.');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification');
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = endpoints.googleAuth;
  };

  // If we're in verification step, show the OTP input form
  if (verificationStep) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a verification code to <strong>{verificationEmail}</strong>
          </p>
        </div>

        {error && (
          <Alert variant={error.includes('successfully') ? "default" : "destructive"}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-gray-700 dark:text-gray-300">
              Verification Code
            </Label>
            <Input
              id="otp"
              value={verificationOTP}
              onChange={(e) => setVerificationOTP(e.target.value)}
              required
              placeholder="Enter 6-digit code"
              className="bg-white dark:bg-gray-800 text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={verificationLoading || verificationOTP.length !== 6}
          >
            {verificationLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email & Complete Registration'
            )}
          </Button>

          <div className="text-center space-y-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResendVerification}
              className="text-sm"
            >
              Didn't receive the code? Resend
            </Button>

            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setVerificationStep(false)}
                className="text-sm"
              >
                ← Back to registration
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Original registration form
  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            placeholder="John"
            className="bg-white dark:bg-gray-800"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder="Doe"
            className="bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="john.doe@example.com"
          className="bg-white dark:bg-gray-800"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Create a strong password"
            minLength={8}
            className="bg-white dark:bg-gray-800 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </Button>
          
          {/* Password constraints tooltip - only show while typing */}
          {formData.password.length > 0 && (
            <div className="absolute left-full top-0 z-10 w-64 p-4 text-xs text-muted-foreground bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg space-y-1 transform -translate-x-24">
              <p className="font-medium text-gray-700 dark:text-gray-300">Password must contain:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className={formData.password.length >= 8 ? 'text-green-600' : 'text-red-500'}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-red-500'}>
                  One uppercase letter (A-Z)
                </li>
                <li className={/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-red-500'}>
                  One lowercase letter (a-z)
                </li>
                <li className={/\d/.test(formData.password) ? 'text-green-600' : 'text-red-500'}>
                  One digit (0-9)
                </li>
                <li className={hasSpecialChar(formData.password) ? 'text-green-600' : 'text-red-500'}>
                  One special character (!@#$%^&*()-_=+[]{ };:&apos;&quot;,&lt;&gt;?/|)
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleRegister}
        className="w-full"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Google
      </Button>

      <div className="text-center mt-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Already Signed Up? </span>
        <Button
          type="button"
          variant="link"
          className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
          onClick={() => setLocation('/login')}
        >
          Login
        </Button>
      </div>
    </form>
  );

  if (plain) return form;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Sign up to get started with CodeArena
        </CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  );
} 