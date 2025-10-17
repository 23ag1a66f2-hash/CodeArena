import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Code, Bell, Moon, Sun, Settings, LogOut, User } from "lucide-react";
import lightLogo from "../../assests/light_logo.png";
import lightName from "../../assests/light_name.png";
import darkLogo from "../../assests/dark_logo.png";
import darkName from "../../assests/dark_name.png";

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/problems", label: "Problems" },
    { path: "/contests", label: "Contests" },
    { path: "/leaderboard", label: "Leaderboard" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
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
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a className={`pb-4 -mb-px border-b-2 transition-colors ${
                    isActive(item.path)
                      ? "text-arena-green border-arena-green font-medium"
                      : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-100"
                  }`}>
                    {item.label}
                  </a>
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            {/* <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-red-500 text-white">
                3
              </Badge>
            </Button> */}

            {/* Theme Toggle */}
            {/* <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button> */}

            {/* User Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 h-auto p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback>
                      {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 hidden sm:block">
                    {user?.firstName || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 dark:text-red-400"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
