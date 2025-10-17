import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "wouter";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { useQuery } from "@tanstack/react-query";
import { RecentProblems } from "@/components/dashboard/recent-problems";
import { UpcomingContests } from "@/components/dashboard/upcoming-contests";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { Button } from "@/components/ui/button";
import { Plus, HelpCircle } from "lucide-react";
import { MaintenanceMessage } from "@/components/MaintenanceMessage";
import AdminDashboard from "./admin-dashboard";

function SubmissionsHeatmap() {
  const { data } = useQuery({
    queryKey: ['/api/users/me/stats'],
    queryFn: async () => {
      const res = await fetch('/api/users/me/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return { total: 0, activeDays: 0, maxStreak: 0, byDate: {} };
      return res.json();
    }
  });

  const byDate: Record<string, number> = data?.byDate || {};
  const total = data?.total || 0;
  const activeDays = data?.activeDays || 0;
  const maxStreak = data?.maxStreak || 0;

  // Build last 53 weeks grid (7x53)
  const today = new Date();
  const days: { key: string; count: number }[] = [];
  for (let i = 0; i < 7 * 53; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (7 * 53 - 1 - i));
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: byDate[key] || 0 });
  }

  // Colors: light theme -> white bg with light gray boxes; dark theme -> light blue bg and darker greens
  const emptyClass = 'bg-gray-200 dark:bg-[#163a6b]';
  const level = (c: number) => (
    c === 0
      ? emptyClass
      : c < 2
        ? 'bg-green-300 dark:bg-green-700'
        : c < 4
          ? 'bg-green-400 dark:bg-green-600'
          : 'bg-green-600 dark:bg-green-500'
  );

  return (
    <div className="bg-white dark:bg-[#072a57] border border-gray-200 dark:border-[#87a0c4]/30 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3 text-gray-900 dark:text-white">
        <div className="text-lg"><span className="font-bold">{total}</span> submissions in the past one year</div>
        <div className="text-sm text-gray-700 dark:text-blue-100">Total active days: <span className="font-bold">{activeDays}</span> &nbsp; Max streak: <span className="font-bold">{maxStreak}</span></div>
      </div>
      {/* Heatmap grid with small gaps inside months and larger gap at month boundaries */}
      <div className="flex w-full">
        {(() => {
          const cols: JSX.Element[] = [];
          let prevMonth = -1;
          for (let col = 0; col < 53; col++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (7 * 53 - 1 - col * 7));
            const month = weekStart.getMonth();
            const isNewMonth = month !== prevMonth;
            prevMonth = month;
            cols.push(
              <div key={col} className={`flex flex-col gap-1 ${col < 52 ? (isNewMonth ? 'mr-4' : 'mr-1') : ''}`}>
                {Array.from({ length: 7 }).map((__, row) => {
                  const idx = col * 7 + row;
                  const cell = days[idx];
                  return <div key={row} className={`w-3 h-3 rounded-sm ${level(cell.count)}`} title={`${cell.key}: ${cell.count} submissions`}></div>
                })}
              </div>
            );
          }
          return cols;
        })()}
      </div>
      {/* Month labels */}
      <div className="flex w-full mt-2 text-xs text-gray-600 dark:text-blue-100">
        {(() => {
          const labels: JSX.Element[] = [];
          let prevMonth = -1;
          for (let col = 0; col < 53; col++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (7 * 53 - 1 - col * 7));
            const month = weekStart.getMonth();
            const isNewMonth = month !== prevMonth;
            prevMonth = month;
            const label = isNewMonth ? weekStart.toLocaleString('default', { month: 'short' }) : '';
            labels.push(<div key={col} className={`w-3 ${col < 52 ? (isNewMonth ? 'mr-4' : 'mr-1') : ''}`}>{label}</div>);
          }
          return labels;
        })()}
      </div>
    </div>
  );
}

function UserDashboard({ user }: { user: any }) {
  return (
    <div>
      {/* Maintenance Message Banner */}
      <MaintenanceMessage />
      
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.firstName || "student"}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Continue your coding journey and track your progress.
          </p>
        </div>

      {/* Stats Grid */}
      <StatsGrid />

      <div className="mb-8">
        <SubmissionsHeatmap />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        {/* <div className="lg:col-span-2">
          <RecentProblems />
        </div> */}

        {/* Sidebar Content */}
        {/* <div className="space-y-6">
          <UpcomingContests />
          <Leaderboard />
        </div> */}
      </div>

        {/* Floating Action Buttons */}
        {/* <div className="fixed bottom-6 right-6 space-y-3">
          <Button 
            size="icon"
            className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <Button 
            size="icon"
            className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <HelpCircle className="h-6 w-6" />
          </Button>
        </div> */}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Handle authentication data from URL parameters (Google OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');

    if (token && userStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userStr));
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Show success message
        toast({
          title: "Successfully signed in",
          description: `Welcome back${userData.firstName ? ', ' + userData.firstName : ''}!`
        });
      } catch (error) {
        console.error('[DEBUG] Error processing auth data:', error);
      }
    }
  }, []); // Run only once on mount

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, setLocation]); // Only depend on isAuthenticated and setLocation

  if (!isAuthenticated || !user) {
    return null;
  }

  // Render different dashboards based on user role
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  return <UserDashboard user={user} />;
}
