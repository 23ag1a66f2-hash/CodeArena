import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Code, Bell, Moon, Sun, LogOut, User, Settings as SettingsIcon, Menu, X } from "lucide-react";
import lightLogo from "../../assests/light_logo.png";
import lightName from "../../assests/light_name.png";
import darkLogo from "../../assests/dark_logo.png";
import darkName from "../../assests/dark_name.png";

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isAuthenticated || !user) return null;

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/assignments", label: "Assignments" },
    { path: "/contests", label: "Contests" },
    { path: "/courses", label: "Courses" },
    // { path: "/leaderboard", label: "Leaderboard" },
  ];

  // Add admin-only nav items
  const adminNavItems = user?.role === 'admin' ? [
    { path: "/admin/problems", label: "Problems" },
    { path: "/admin/version-history", label: "Version History" },
  ] : [];

  const isActive = (path: string) => {
    if (path === "/dashboard" && location === "/") return true;
    if (path === "/assignments" && location.startsWith("/problems")) return true;
    return location === path || (path !== "/dashboard" && location.startsWith(path));
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="flex items-center space-x-2">
                <img src={lightLogo} alt="CodeArena logo" className="h-10 w-auto dark:hidden" />
                <img src={darkLogo} alt="CodeArena logo" className="h-10 w-auto hidden dark:block" />
                <img src={lightName} alt="CodeArena" className="h-8 w-auto dark:hidden" />
                <img src={darkName} alt="CodeArena" className="h-9 w-auto hidden dark:block" />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {[...navItems, ...adminNavItems].map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`pb-2 pt-2 transition-colors ${
                  isActive(item.path)
                    ? "text-green-500 font-medium border-b-2 border-green-500"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side Menu */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <span className="text-lg font-semibold">Navigation</span>
                  </div>
                  
                  <div className="flex-1 py-6">
                    <nav className="space-y-2">
                      {[...navItems, ...adminNavItems].map((item) => (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block px-3 py-2 rounded-md text-base transition-colors ${
                            isActive(item.path)
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-3 px-3 py-2">
                      <UserAvatar user={user} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-1">
                      <Link href="/profile">
                        <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link href="/settings">
                        <Button variant="ghost" className="w-full justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                          <SettingsIcon className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-600 dark:text-red-400" 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Icons */}
            {/* <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-gray-600 dark:text-gray-300"
            >
              <Bell className="h-5 w-5" />
            </Button> */}
            
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="text-gray-600 dark:text-gray-300"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button> */}
            
            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex items-center space-x-3 h-auto p-2">
                  <UserAvatar user={user} size="sm" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
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
