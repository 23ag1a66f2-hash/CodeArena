import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

interface RoleBasedRouteProps {
  component: React.ComponentType;
  adminComponent: React.ComponentType;
}

interface User {
  role: string;
  id: number;
  name: string;
  email: string;
}

export function RoleBasedRoute({ component: Component, adminComponent: AdminComponent }: RoleBasedRouteProps) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return user.role === "admin" ? <AdminComponent /> : <Component />;
} 