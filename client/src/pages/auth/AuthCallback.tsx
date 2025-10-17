import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/components/ui/use-toast';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    try {
      console.log('[DEBUG] Auth callback mounted');
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userStr = params.get('user');
      const error = params.get('error');

      if (error) {
        console.error('[DEBUG] Auth error:', error);
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Could not sign in with Google. Please try again."
        });
        setLocation('/login');
        return;
      }

      if (!token || !userStr) {
        console.error('[DEBUG] Missing token or user data');
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Invalid authentication response. Please try again."
        });
        setLocation('/login');
        return;
      }

      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        console.log('[DEBUG] Parsed user data:', user);
        
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Show success message
        toast({
          title: "Successfully signed in",
          description: `Welcome back${user.firstName ? ', ' + user.firstName : ''}!`
        });

        // Check for returnTo parameter and redirect accordingly
        const returnTo = params.get('returnTo');
        
        if (returnTo) {
          console.log('[DEBUG] Redirecting to returnTo URL:', returnTo);
          window.location.href = returnTo;
        } else {
          // Role-based redirection
          if (user.role === 'admin') {
            console.log('[DEBUG] Redirecting admin to admin dashboard');
            setLocation('/admin');
          } else {
            console.log('[DEBUG] Redirecting user to dashboard');
            setLocation('/dashboard');
          }
        }
      } catch (error) {
        console.error('[DEBUG] Error parsing user data:', error);
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Could not process login response. Please try again."
        });
        setLocation('/login');
      }
    } catch (error) {
      console.error('[DEBUG] Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "An unexpected error occurred. Please try again."
      });
      setLocation('/login');
    }
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Completing sign in...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we redirect you
        </p>
      </div>
    </div>
  );
} 