import { RegisterForm } from "@/components/auth/RegisterForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import lightLogo from "../../assests/light_logo.png";
import lightName from "../../assests/light_name.png";
import darkLogo from "../../assests/dark_logo.png";
import darkName from "../../assests/dark_name.png";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect based on role
    if (isAuthenticated && user) {
      console.log('[DEBUG] User already authenticated, redirecting...');
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [isAuthenticated, user, setLocation]);

  return (
    <div className="min-h-screen">
      <AuthSplitLayout title="Create an Account!">
        <RegisterForm plain />
      </AuthSplitLayout>
    </div>
  );
} 