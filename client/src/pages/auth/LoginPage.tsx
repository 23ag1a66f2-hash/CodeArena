import { LoginForm } from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import lightLogo from "../../assests/light_logo.png";
import lightName from "../../assests/light_name.png";
import darkLogo from "../../assests/dark_logo.png";
import darkName from "../../assests/dark_name.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // COMPLETELY DISABLE LoginPage redirects - let LoginForm handle ALL redirects
  // This prevents conflicts between LoginPage and LoginForm
  console.log('[DEBUG] LoginPage rendered, auth state:', isAuthenticated);

  return (
    <div className="min-h-screen ">
      <AuthSplitLayout title="Welcome Back!">
        <LoginForm plain />
      </AuthSplitLayout>
    </div>
  );
} 