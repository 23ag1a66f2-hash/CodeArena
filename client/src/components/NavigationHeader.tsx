import { Link, useLocation } from "wouter";
import { Bell, Moon, Sun, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "./ThemeProvider";
import lightLogo from "../assests/light_logo.png";
import lightName from "../assests/light_name.png";
import darkLogo from "../assests/dark_logo.png";
import darkName from "../assests/dark_name.png";

const navigationItems = [
  { path: "/", label: "Dashboard", exact: true },
  { path: "/problems", label: "Problems" },
  { path: "/contests", label: "Contests" },
  { path: "/leaderboard", label: "Leaderboard" },
];

export function NavigationHeader() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActiveLink = (path: string, exact = false) => {
    if (exact) {
      return location === path;
    }
    return location.startsWith(path);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <img src={lightLogo} alt="CodeArena logo" className="h-10 w-auto dark:hidden" />
                <img src={darkLogo} alt="CodeArena logo" className="h-10 w-auto hidden dark:block" />
                <img src={lightName} alt="CodeArena" className="h-8 w-auto dark:hidden" />
                <img src={darkName} alt="CodeArena" className="h-9 w-auto hidden dark:block" />
              </div>
            </Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`transition-colors pb-4 -mb-px ${
                    isActiveLink(item.path, item.exact)
                      ? "text-green-600 font-medium border-b-2 border-green-600"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button> */}
            
            {/* <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button> */}
            
            {user && (
              <div className="flex items-center space-x-3">
                <UserAvatar user={user} size="sm" />
                <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:block">
                  {user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = "/api/logout"}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
