import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Target, 
  TrendingUp, 
  Clock, 
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trophy
} from 'lucide-react';
import { config } from '@/config';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface CourseAnalyticsData {
  courseId: number;
  courseTitle: string;
  totalAssignments: number;
  totalStudents: number;
  averageCourseScore: number;
  completionRate: number;
  assignmentPerformance: Array<{
    assignmentId: number;
    assignmentTitle: string;
    averageScore: number;
    completionRate: number;
    difficulty: number;
  }>;
  studentPerformance: Array<{
    userId: string;
    userName: string;
    averageScore: number;
    assignmentsCompleted: number;
    improvementTrend: number;
  }>;
  learningOutcomes: Array<{
    outcome: string;
    overallAchievementRate: number;
    averageConfidence: number;
    assignmentsCovered: number;
  }>;
  engagementMetrics: {
    averageTimeSpent: number;
    averageRevisits: number;
    peakActivityTimes: string[];
    dropoffPoints: Array<{
      assignmentId: number;
      dropoffRate: number;
    }>;
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function CourseAnalytics() {
  const [match, params] = useRoute('/admin/courses/:courseId/analytics');
  const courseId = params?.courseId;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['course-analytics', courseId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/analytics/courses/${courseId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch course analytics');
      }
      return res.json() as Promise<CourseAnalyticsData>;
    },
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Failed to load course analytics</h1>
          <p className="text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <Link href="/admin/courses">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const assignmentPerformanceData = analytics.assignmentPerformance.map(assignment => ({
    name: assignment.assignmentTitle,
    averageScore: assignment.averageScore,
    completionRate: assignment.completionRate,
    difficulty: assignment.difficulty,
  }));

  const studentPerformanceData = analytics.studentPerformance
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 10);

  const learningOutcomesData = analytics.learningOutcomes.map(outcome => ({
    name: outcome.outcome,
    achievementRate: outcome.overallAchievementRate,
    confidence: outcome.averageConfidence,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/courses">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{analytics.courseTitle}</h1>
          <p className="text-muted-foreground">Course Analytics & Performance Overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalAssignments} assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Course Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageCourseScore}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.averageTimeSpent}m</div>
            <p className="text-xs text-muted-foreground">
              {analytics.engagementMetrics.averageRevisits} avg revisits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Outcomes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.learningOutcomes.length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(analytics.learningOutcomes.reduce((sum, o) => sum + o.overallAchievementRate, 0) / analytics.learningOutcomes.length)}% avg achievement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Assignment Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Performance Overview</CardTitle>
                <CardDescription>Average scores across all assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assignmentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Student Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Student Performance Distribution</CardTitle>
                <CardDescription>Distribution of student scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Excellent (90-100%)', value: studentPerformanceData.filter(s => s.averageScore >= 90).length },
                          { name: 'Good (80-89%)', value: studentPerformanceData.filter(s => s.averageScore >= 80 && s.averageScore < 90).length },
                          { name: 'Average (70-79%)', value: studentPerformanceData.filter(s => s.averageScore >= 70 && s.averageScore < 80).length },
                          { name: 'Needs Improvement (<70%)', value: studentPerformanceData.filter(s => s.averageScore < 70).length },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Insights</CardTitle>
              <CardDescription>Student engagement patterns and activity analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.engagementMetrics.averageTimeSpent}m
                  </div>
                  <div className="text-sm text-muted-foreground">Average Time Spent</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.engagementMetrics.averageRevisits}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Revisits</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics.engagementMetrics.peakActivityTimes?.length > 0 ? analytics.engagementMetrics.peakActivityTimes[0] : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Peak Activity Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Performance Analysis</CardTitle>
              <CardDescription>Detailed breakdown of each assignment's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Assignment Performance Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assignmentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score (%)" />
                      <Bar dataKey="completionRate" fill="#10b981" name="Completion Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Assignment Details Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Average Score</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.assignmentPerformance.map((assignment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{assignment.assignmentTitle}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{assignment.averageScore}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${assignment.averageScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{assignment.completionRate}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${assignment.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.difficulty >= 4 ? 'destructive' : assignment.difficulty >= 3 ? 'secondary' : 'outline'}>
                            {assignment.difficulty}/5
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              assignment.averageScore >= 80 ? 'default' :
                              assignment.averageScore >= 70 ? 'secondary' : 'destructive'
                            }
                          >
                            {assignment.averageScore >= 80 ? 'Excellent' :
                             assignment.averageScore >= 70 ? 'Good' : 'Needs Attention'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Student Performance</CardTitle>
              <CardDescription>Best performing students in the course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Student Performance Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="userName" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Student Details Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Average Score</TableHead>
                      <TableHead>Assignments Completed</TableHead>
                      <TableHead>Improvement Trend</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentPerformanceData.map((student, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{student.userName}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{student.averageScore}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${student.averageScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {student.assignmentsCompleted}/{analytics.totalAssignments}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold ${student.improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {student.improvementTrend >= 0 ? '+' : ''}{student.improvementTrend}%
                            </span>
                            {student.improvementTrend >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              student.averageScore >= 90 ? 'default' :
                              student.averageScore >= 80 ? 'secondary' :
                              student.averageScore >= 70 ? 'outline' : 'destructive'
                            }
                          >
                            {student.averageScore >= 90 ? 'Excellent' :
                             student.averageScore >= 80 ? 'Good' :
                             student.averageScore >= 70 ? 'Average' : 'Needs Improvement'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Outcomes Analysis</CardTitle>
              <CardDescription>Assessment of learning objectives achievement across the course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Learning Outcomes Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={learningOutcomesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="achievementRate" fill="#3b82f6" name="Achievement Rate (%)" />
                      <Bar dataKey="confidence" fill="#10b981" name="Confidence (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Learning Outcomes Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  {analytics.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{outcome.outcome}</h3>
                        <Badge 
                          variant={
                            outcome.overallAchievementRate >= 80 ? 'default' :
                            outcome.overallAchievementRate >= 60 ? 'secondary' : 'destructive'
                          }
                        >
                          {outcome.overallAchievementRate.toFixed(1)}% achieved
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Achievement Rate</span>
                            <span>{outcome.overallAchievementRate.toFixed(1)}%</span>
                          </div>
                          <Progress value={outcome.overallAchievementRate} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Average Confidence</span>
                            <span>{outcome.averageConfidence.toFixed(1)}%</span>
                          </div>
                          <Progress value={outcome.averageConfidence} className="h-2" />
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Covered in {outcome.assignmentsCovered} assignment(s)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CourseAnalytics; 