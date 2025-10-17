import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string; isSignup: boolean }) => {
      const endpoint = credentials.isSignup ? '/api/auth/signup' : '/api/auth/login';
      const { isSignup, email, password } = credentials;
      const resp = isSignup
        ? await authService.signup(email, password)
        : await authService.login(email, password);
      if (!resp.ok || !resp.data) throw new Error(resp.error || 'Request failed');
      return resp.data;
    },
    onSuccess: (data: any) => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        toast({
          title: "Success",
          description: isSignup ? "Account created successfully!" : "Logged in successfully!",
        });
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password, isSignup });
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isSignup ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignup 
              ? "Enter your details to create a new account" 
              : "Enter your credentials to access your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleLogin}
            type="button"
          >
            Continue with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending 
                ? "Please wait..." 
                : isSignup 
                  ? "Create Account" 
                  : "Sign In"
              }
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"
            }
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}