import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Users, 
  Trophy,
  Activity,
  Clock
} from 'lucide-react';
import { config } from '@/config';

interface AnalyticsOverviewData {
  assignments: {
    total: number;
    active: number;
    averageScore: number;
    completionRate: number;
  };
  courses: {
    total: number;
    active: number;
    averageScore: number;
    enrollmentRate: number;
  };
  students: {
    total: number;
    active: number;
    averageScore: number;
    improvementRate: number;
  };
}

export function AnalyticsOverview() {
  const [, setLocation] = useLocation();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/analytics/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch analytics overview');
      }
      return res.json() as Promise<AnalyticsOverviewData>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
          <CardDescription>Loading analytics data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Analytics Overview
          </h2>
          <p className="text-muted-foreground">Key performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/assignments')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Assignment Analytics
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/courses')}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Course Analytics
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Assignments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.assignments.total || 0}</div>
            <p className="text-xs text-muted-foreground mb-2">
              {analytics?.assignments.active || 0} active assignments
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Average Score</span>
                <span className="font-medium">{analytics?.assignments.averageScore || 0}%</span>
              </div>
              <Progress value={analytics?.assignments.averageScore || 0} className="h-2" />
            </div>
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setLocation('/admin/assignments')}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Courses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.courses.total || 0}</div>
            <p className="text-xs text-muted-foreground mb-2">
              {analytics?.courses.active || 0} active courses
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Enrollment Rate</span>
                <span className="font-medium">{analytics?.courses.enrollmentRate || 0}%</span>
              </div>
              <Progress value={analytics?.courses.enrollmentRate || 0} className="h-2" />
            </div>
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setLocation('/admin/courses')}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.students.total || 0}</div>
            <p className="text-xs text-muted-foreground mb-2">
              {analytics?.students.active || 0} active students
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Improvement Rate</span>
                <span className="font-medium">{analytics?.students.improvementRate || 0}%</span>
              </div>
              <Progress value={analytics?.students.improvementRate || 0} className="h-2" />
            </div>
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setLocation('/admin/users')}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Access detailed analytics and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => setLocation('/admin/assignments')}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">Assignment Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => setLocation('/admin/courses')}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium">Course Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => setLocation('/admin/problems')}
            >
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">Problem Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => setLocation('/admin/users')}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Student Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Performance
          </CardTitle>
          <CardDescription>Latest performance trends and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics?.assignments.averageScore || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Assignment Success Rate</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics?.courses.enrollmentRate || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Course Enrollment Rate</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analytics?.students.improvementRate || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Student Improvement Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsOverview; 