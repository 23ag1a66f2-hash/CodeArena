import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Target, CheckCircle, XCircle, Clock, Zap, HardDrive, TrendingUp } from "lucide-react";
import { config } from "@/config";

export function UserProblemAnalytics() {
  const [match, params] = useRoute("/admin/problems/:problemId/users/:userId/analytics");
  const { problemId, userId } = params || {};

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "user-problem-analytics", problemId, userId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/admin/problems/${problemId}/users/${userId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user problem analytics');
      }
      return res.json();
    },
    enabled: !!problemId && !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Data not found</h1>
          <Link href="/admin">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/problems/${problemId}/analytics`}>
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Problem Analytics
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{analytics.userName}</h1>
          <p className="text-muted-foreground">
            Performance on: <span className="font-medium">{analytics.problemTitle}</span>
          </p>
          <p className="text-sm text-muted-foreground">{analytics.userEmail}</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.passedAttempts}</div>
            <p className="text-xs text-muted-foreground">Successful attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.failedAttempts}</div>
            <p className="text-xs text-muted-foreground">Failed attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate}%</div>
            <p className="text-xs text-muted-foreground">Pass percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Target className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bestScore || '-'}</div>
            <p className="text-xs text-muted-foreground">Highest score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Runtime</CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRuntime || '-'}ms</div>
            <p className="text-xs text-muted-foreground">Average execution</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Attempt:</span>
              <span className="font-medium">
                {analytics.firstAttempt ? new Date(analytics.firstAttempt).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Attempt:</span>
              <span className="font-medium">
                {analytics.lastAttempt ? new Date(analytics.lastAttempt).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Span:</span>
              <span className="font-medium">
                {analytics.firstAttempt && analytics.lastAttempt ? 
                  Math.ceil((new Date(analytics.lastAttempt).getTime() - new Date(analytics.firstAttempt).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
                  : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Memory:</span>
              <span className="font-medium">{analytics.averageMemory || '-'} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best Performance:</span>
              <span className="font-medium">
                {analytics.attempts?.find((a: any) => a.status === 'accepted')?.runtime || '-'} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attempts Until Pass:</span>
              <span className="font-medium">
                {analytics.attempts?.findIndex((a: any) => a.status === 'accepted') + 1 || 'Not yet passed'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Attempt History */}
      <Card>
        <CardHeader>
          <CardTitle>Attempt History</CardTitle>
          <CardDescription>Chronological breakdown of all submission attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attempt #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Test Cases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.attempts?.length > 0 ? (
                  analytics.attempts.map((attempt: any) => (
                    <TableRow key={attempt.attemptNumber}>
                      <TableCell className="font-medium">#{attempt.attemptNumber}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(attempt.submittedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{attempt.language}</TableCell>
                      <TableCell>
                        <Badge variant={attempt.status === 'accepted' ? 'default' : 
                                      attempt.status === 'error' ? 'destructive' : 'secondary'}>
                          {attempt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{attempt.runtime ? `${attempt.runtime}ms` : '-'}</TableCell>
                      <TableCell>{attempt.memory ? `${attempt.memory}KB` : '-'}</TableCell>
                      <TableCell>{attempt.score || '-'}</TableCell>
                      <TableCell>
                        {attempt.testCasesPassed !== undefined ? 
                          `${attempt.testCasesPassed}/${attempt.totalTestCases}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      No attempts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}