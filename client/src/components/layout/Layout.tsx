import { Navigation } from "./navigation";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="relative">
        <Sidebar />
        <main className="min-h-[calc(100vh-4rem)] pt-2 sm:pt-4 overflow-auto transition-all duration-300 ease-in-out">
          <div className="w-full max-w-full overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 