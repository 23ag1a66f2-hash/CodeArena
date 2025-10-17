import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { 
  LayoutDashboard, 
  Code, 
  Trophy, 
  GraduationCap, 
  ClipboardList,
  Flame,
  Settings,
  Users
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const progress = user?.progress;
  const problemsProgress = progress ? (progress.problemsSolved / 120) * 100 : 0;

  const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", active: location === "/" },
    { path: "/problems", icon: Code, label: "Practice Problems", active: location === "/problems" },
    { path: "/contests", icon: Trophy, label: "Contests", active: location === "/contests" },
    { path: "/courses", icon: GraduationCap, label: "Courses", active: location === "/courses" },
    { path: "/assignments", icon: ClipboardList, label: "Assignments", active: location === "/assignments" },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 hidden lg:block">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  item.active
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 font-medium"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user?.role === 'admin' && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Admin
            </h3>
            <nav className="space-y-2">
              <Link
                href="/admin/contest-management"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  location === "/admin/contest-management"
                    ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 font-medium"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>Contest Management</span>
              </Link>
              <Link
                href="/admin"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  location === "/admin"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Admin Panel</span>
              </Link>
            </nav>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Progress
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">Problems Solved</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {progress?.problemsSolved || 0}/120
                </span>
              </div>
              <Progress value={problemsProgress} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300 flex items-center">
                  <Flame className="w-4 h-4 mr-1 text-orange-500" />
                  Current Streak
                </span>
                <span className="font-medium text-orange-500">
                  {progress?.currentStreak || 0} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
