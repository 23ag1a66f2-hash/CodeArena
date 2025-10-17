import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  BookOpen,
  Lightbulb,
  Download,
  Calendar,
  Activity
} from 'lucide-react';
import { config } from '@/config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AssignmentAnalyticsData {
  assignmentId: number;
  assignmentTitle: string;
  totalSubmissions: number;
  uniqueStudents: number;
  averageScore: number;
  medianScore: number;
  standardDeviation: number;
  passRate: number;
  averageTimeSpent: number;
  averageAttempts: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  questionAnalytics: Array<{
    questionId: string;
    questionType: string;
    averageScore: number;
    successRate: number;
    averageTimeSpent: number;
    difficultyRating: number;
    mostCommonMistakes: string[];
  }>;
  learningOutcomes: Array<{
    outcome: string;
    achievementRate: number;
    averageConfidence: number;
    averageTimeToMastery: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    submissions: number;
    averageScore: number;
  }>;
  comparativeMetrics: {
    classAverage: number;
    classMedian: number;
    classStandardDeviation: number;
    performanceGaps: Array<{
      category: string;
      gap: number;
      studentsAffected: number;
    }>;
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export function AssignmentAnalytics() {
  const [match, params] = useRoute('/admin/assignments/:assignmentId/analytics');
  const assignmentId = params?.assignmentId;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['assignment-analytics', assignmentId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/analytics/assignments/${assignmentId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch assignment analytics');
      }
      return res.json() as Promise<AssignmentAnalyticsData>;
    },
    enabled: !!assignmentId,
  });

  const { data: timeSeriesData } = useQuery({
    queryKey: ['assignment-timeline', assignmentId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/analytics/assignments/${assignmentId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch timeline data');
      }
      return res.json();
    },
    enabled: !!assignmentId,
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
          <h1 className="text-2xl font-bold text-red-600">Failed to load analytics</h1>
          <p className="text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <Link href="/admin/assignments">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const scoreDistributionData = [
    { name: 'Excellent (90-100%)', value: analytics.scoreDistribution?.excellent || 0, color: '#10b981' },
    { name: 'Good (80-89%)', value: analytics.scoreDistribution?.good || 0, color: '#3b82f6' },
    { name: 'Average (70-79%)', value: analytics.scoreDistribution?.average || 0, color: '#f59e0b' },
    { name: 'Needs Improvement (<70%)', value: analytics.scoreDistribution?.needsImprovement || 0, color: '#ef4444' },
  ];

  const questionPerformanceData = analytics.questionAnalytics?.map(q => ({
    question: `Q${q.questionId}`,
    averageScore: q.averageScore,
    successRate: q.successRate,
    averageTime: q.averageTimeSpent,
  })) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/assignments">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{analytics.assignmentTitle || 'Assignment Analytics'}</h1>
          <p className="text-muted-foreground">Assignment Analytics & Performance Insights</p>
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
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubmissions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.uniqueStudents || 0} unique students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Median: {analytics.medianScore || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.passRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {(analytics.standardDeviation || 0).toFixed(1)} std dev
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageTimeSpent || 0}m</div>
            <p className="text-xs text-muted-foreground">
              {analytics.averageAttempts || 0} avg attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="learning">Learning Outcomes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="comparative">Comparative</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Performance breakdown by score ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scoreDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {scoreDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Score progression over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="averageScore" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Gaps */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Gaps Analysis</CardTitle>
              <CardDescription>Areas where students need additional support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.comparativeMetrics?.performanceGaps?.map((gap, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={gap.category === 'excellent' ? 'default' : 'secondary'}>
                        {gap.category}
                      </Badge>
                      <span className="font-medium">{gap.studentsAffected} students affected</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Average gap</div>
                      <div className="text-lg font-bold">{gap.gap.toFixed(1)}%</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance gaps data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question Performance Analysis</CardTitle>
              <CardDescription>Detailed breakdown of each question's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Question Performance Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={questionPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="question" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="averageScore" fill="#3b82f6" name="Average Score (%)" />
                      <Bar dataKey="successRate" fill="#10b981" name="Success Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Question Details Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Avg Time</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Common Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.questionAnalytics?.map((question, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">Q{question.questionId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{question.questionType}</Badge>
                        </TableCell>
                        <TableCell>{question.averageScore.toFixed(1)}%</TableCell>
                        <TableCell>{question.successRate.toFixed(1)}%</TableCell>
                        <TableCell>{question.averageTimeSpent.toFixed(1)}m</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{question.difficultyRating}/5</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(question.difficultyRating / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {question.mostCommonMistakes?.slice(0, 2).map((mistake, i) => (
                              <div key={i} className="text-xs text-muted-foreground truncate">
                                {mistake}
                              </div>
                            )) || <span className="text-xs text-muted-foreground">No data</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No question analytics data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Outcomes Tab */}
        <TabsContent value="learning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Outcomes Analysis</CardTitle>
              <CardDescription>Assessment of learning objectives achievement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.learningOutcomes?.map((outcome, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{outcome.outcome}</h3>
                      <Badge 
                        variant={outcome.achievementRate >= 80 ? 'default' : outcome.achievementRate >= 60 ? 'secondary' : 'destructive'}
                      >
                        {outcome.achievementRate.toFixed(1)}% achieved
                      </Badge>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {outcome.achievementRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Achievement Rate</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {outcome.averageConfidence.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Confidence</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {outcome.averageTimeToMastery.toFixed(1)}m
                        </div>
                        <div className="text-sm text-muted-foreground">Time to Mastery</div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{outcome.achievementRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={outcome.achievementRate} className="h-2" />
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No learning outcomes data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submission Timeline</CardTitle>
              <CardDescription>Activity patterns and submission trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.timeSeriesData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={2} name="Submissions" />
                    <Line yAxisId="right" type="monotone" dataKey="averageScore" stroke="#10b981" strokeWidth={2} name="Average Score (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparative Tab */}
        <TabsContent value="comparative" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Class Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Class Statistics</CardTitle>
                <CardDescription>Overall class performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Class Average</span>
                    <span className="font-bold">{analytics.comparativeMetrics?.classAverage || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Class Median</span>
                    <span className="font-bold">{analytics.comparativeMetrics?.classMedian || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Standard Deviation</span>
                    <span className="font-bold">{analytics.comparativeMetrics?.classStandardDeviation || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Score Range</span>
                    <span className="font-bold">
                      {Math.min(...analytics.timeSeriesData.map(d => d.averageScore))}% - {Math.max(...analytics.timeSeriesData.map(d => d.averageScore))}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>Key insights and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Strong Performance</div>
                      <div className="text-sm text-muted-foreground">
                        {analytics.scoreDistribution.excellent + analytics.scoreDistribution.good} students scored 80% or higher
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-medium">Needs Attention</div>
                      <div className="text-sm text-muted-foreground">
                        {analytics.scoreDistribution.needsImprovement} students need additional support
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Time Management</div>
                      <div className="text-sm text-muted-foreground">
                        Average completion time: {analytics.averageTimeSpent} minutes
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssignmentAnalytics; 