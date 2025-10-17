import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, Moon, Sun, Code, User, LogOut } from "lucide-react";
import lightLogo from "../assests/light_logo.png";
import lightName from "../assests/light_name.png";
import darkLogo from "../assests/dark_logo.png";
import darkName from "../assests/dark_name.png";

export function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  // const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { path: "/", label: "Dashboard", active: location === "/" },
    { path: "/problems", label: "Problems", active: location === "/problems" },
    { path: "/contests", label: "Contests", active: location === "/contests" },
    { path: "/leaderboard", label: "Leaderboard", active: location === "/leaderboard" },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50 shadow-sm">
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
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`font-medium pb-4 -mb-px transition-colors ${
                    link.active
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className={`font-medium pb-4 -mb-px transition-colors ${
                    location === "/admin"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
            </Button> */}
            
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                    <AvatarFallback>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
