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
  Target, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trophy,
  BookOpen,
  Lightbulb,
  Users,
  Activity,
  Calendar,
  Zap,
  HardDrive
} from 'lucide-react';
import { config } from '@/config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface UserAssignmentAnalyticsData {
  userId: string;
  userName: string;
  assignmentId: number;
  assignmentTitle: string;
  overallPerformance: {
    bestScore: number;
    totalAttempts: number;
    averageScore: number;
    improvementTrend: number;
    timeEfficiency: number;
    consistencyScore: number;
  };
  questionPerformance: Array<{
    questionId: string;
    questionType: string;
    bestScore: number;
    attempts: number;
    timeSpent: number;
    isCorrect: boolean;
    learningGaps: string[];
  }>;
  learningProgress: {
    outcomesAchieved: number;
    totalOutcomes: number;
    confidenceLevel: number;
    timeToMastery: number;
    areasForImprovement: string[];
  };
  engagementMetrics: {
    totalTimeSpent: number;
    completionRate: number;
    revisits: number;
    lastActivity: Date;
    engagementScore: number;
  };
  comparativePosition: {
    classRank: number;
    percentile: number;
    performanceCategory: string;
    relativeToClass: number;
  };
  recommendations: Array<{
    type: 'practice' | 'review' | 'challenge' | 'support';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    resources?: string[];
  }>;
}

export function UserAssignmentAnalytics() {
  const [match, params] = useRoute('/admin/assignments/:assignmentId/users/:userId/analytics');
  const { assignmentId, userId } = params || {};
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['user-assignment-analytics', assignmentId, userId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/analytics/assignments/${assignmentId}/users/${userId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user assignment analytics');
      }
      return res.json() as Promise<UserAssignmentAnalyticsData>;
    },
    enabled: !!assignmentId && !!userId,
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
          <h1 className="text-2xl font-bold text-red-600">Failed to load user analytics</h1>
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

  const performanceData = [
    { metric: 'Best Score', value: analytics.overallPerformance.bestScore, max: 100 },
    { metric: 'Time Efficiency', value: analytics.overallPerformance.timeEfficiency, max: 10 },
    { metric: 'Consistency', value: analytics.overallPerformance.consistencyScore, max: 100 },
    { metric: 'Engagement', value: analytics.engagementMetrics.engagementScore, max: 100 },
  ];

  const questionPerformanceData = analytics.questionPerformance.map(q => ({
    question: `Q${q.questionId}`,
    score: q.bestScore,
    attempts: q.attempts,
    timeSpent: q.timeSpent,
  }));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'practice': return <BookOpen className="h-4 w-4" />;
      case 'review': return <AlertCircle className="h-4 w-4" />;
      case 'challenge': return <Trophy className="h-4 w-4" />;
      case 'support': return <Lightbulb className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/assignments/${assignmentId}/analytics`}>
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignment Analytics
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{analytics.userName}</h1>
          <p className="text-muted-foreground">
            Performance Analysis for {analytics.assignmentTitle}
          </p>
        </div>
        <div className="text-right">
          <Badge 
            variant={
              analytics.comparativePosition.performanceCategory === 'excellent' ? 'default' :
              analytics.comparativePosition.performanceCategory === 'good' ? 'secondary' :
              analytics.comparativePosition.performanceCategory === 'average' ? 'outline' : 'destructive'
            }
            className="text-lg px-4 py-2"
          >
            {analytics.comparativePosition.performanceCategory.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overallPerformance.bestScore}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overallPerformance.totalAttempts} attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{analytics.comparativePosition.classRank}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.comparativePosition.percentile}th percentile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.totalTimeSpent}m</div>
            <p className="text-xs text-muted-foreground">
              {analytics.engagementMetrics.revisits} revisits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.engagementMetrics.engagementScore}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.engagementMetrics.completionRate}% completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Profile</CardTitle>
                <CardDescription>Multi-dimensional performance assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={performanceData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Comparative Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Comparative Analysis</CardTitle>
                <CardDescription>How you compare to the class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span>Class Rank</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold">#{analytics.comparativePosition.classRank}</span>
                      <Badge variant="outline">{analytics.comparativePosition.percentile}th percentile</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Performance vs Class</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg font-bold ${analytics.comparativePosition.relativeToClass >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.comparativePosition.relativeToClass >= 0 ? '+' : ''}{analytics.comparativePosition.relativeToClass}%
                      </span>
                      {analytics.comparativePosition.relativeToClass >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Improvement Trend</span>
                      <span className={`font-bold ${analytics.overallPerformance.improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.overallPerformance.improvementTrend >= 0 ? '+' : ''}{analytics.overallPerformance.improvementTrend}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, Math.max(0, analytics.overallPerformance.improvementTrend + 50))} 
                      className="h-2" 
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Time Efficiency</span>
                      <span className="font-bold">{analytics.overallPerformance.timeEfficiency.toFixed(1)}</span>
                    </div>
                    <Progress value={Math.min(100, analytics.overallPerformance.timeEfficiency * 10)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question Performance</CardTitle>
              <CardDescription>Detailed breakdown of each question</CardDescription>
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
                      <Bar dataKey="score" fill="#3b82f6" name="Score (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Question Details Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Best Score</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Learning Gaps</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.questionPerformance.map((question, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">Q{question.questionId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{question.questionType}</Badge>
                        </TableCell>
                        <TableCell>{question.bestScore}%</TableCell>
                        <TableCell>{question.attempts}</TableCell>
                        <TableCell>{question.timeSpent}m</TableCell>
                        <TableCell>
                          {question.isCorrect ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Incorrect
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {question.learningGaps.slice(0, 2).map((gap, i) => (
                              <div key={i} className="text-xs text-muted-foreground truncate">
                                {gap}
                              </div>
                            ))}
                          </div>
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
              <CardTitle>Learning Progress</CardTitle>
              <CardDescription>Assessment of learning outcomes achievement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Learning Outcomes Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {analytics.learningProgress.outcomesAchieved}/{analytics.learningProgress.totalOutcomes}
                    </div>
                    <div className="text-sm text-muted-foreground">Outcomes Achieved</div>
                    <Progress 
                      value={(analytics.learningProgress.outcomesAchieved / analytics.learningProgress.totalOutcomes) * 100} 
                      className="mt-2" 
                    />
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {analytics.learningProgress.confidenceLevel}%
                    </div>
                    <div className="text-sm text-muted-foreground">Confidence Level</div>
                    <Progress value={analytics.learningProgress.confidenceLevel} className="mt-2" />
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {analytics.learningProgress.timeToMastery}m
                    </div>
                    <div className="text-sm text-muted-foreground">Time to Mastery</div>
                  </div>
                </div>

                {/* Areas for Improvement */}
                {analytics.learningProgress.areasForImprovement.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Areas for Improvement</h3>
                    <div className="space-y-2">
                      {analytics.learningProgress.areasForImprovement.map((area, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Analysis of student engagement and activity patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Time Spent</span>
                    <span className="font-bold">{analytics.engagementMetrics.totalTimeSpent} minutes</span>
                  </div>
                  <Progress value={Math.min(100, analytics.engagementMetrics.totalTimeSpent / 10)} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Completion Rate</span>
                    <span className="font-bold">{analytics.engagementMetrics.completionRate}%</span>
                  </div>
                  <Progress value={analytics.engagementMetrics.completionRate} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Engagement Score</span>
                    <span className="font-bold">{analytics.engagementMetrics.engagementScore}%</span>
                  </div>
                  <Progress value={analytics.engagementMetrics.engagementScore} className="h-2" />
                </div>
                
                <div className="space-y-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.engagementMetrics.revisits}
                    </div>
                    <div className="text-sm text-muted-foreground">Assignment Revisits</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Last Activity</div>
                    <div className="text-lg font-semibold">
                      {new Date(analytics.engagementMetrics.lastActivity).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personalized Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions for improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recommendations.map((recommendation, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(recommendation.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{recommendation.title}</h3>
                          <Badge 
                            variant="outline" 
                            className={getPriorityColor(recommendation.priority)}
                          >
                            {recommendation.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {recommendation.description}
                        </p>
                        {recommendation.resources && recommendation.resources.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Suggested Resources:</div>
                            <div className="flex flex-wrap gap-2">
                              {recommendation.resources.map((resource, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UserAssignmentAnalytics; 