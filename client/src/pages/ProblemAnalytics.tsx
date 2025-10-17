import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, CheckCircle, XCircle, Clock, Trophy, Filter } from "lucide-react";
import { config } from "@/config";

export function ProblemAnalytics() {
  const [match, params] = useRoute("/admin/problems/:problemId/analytics");
  const problemId = params?.problemId;
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "problem-analytics", problemId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${config.apiUrl}/api/admin/problems/${problemId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch problem analytics');
      }
      return res.json();
    },
    enabled: !!problemId,
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
          <h1 className="text-2xl font-bold text-red-600">Problem not found</h1>
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

  // Filter users based on status
  const filteredUsers = analytics.userStats?.filter((user: any) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "passed") return user.status === "passed";
    if (statusFilter === "failed") return user.status === "failed";
    return true;
  }) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{analytics.problemTitle}</h1>
          <p className="text-muted-foreground">Problem Analytics & Student Performance</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Students who attempted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.passedUsers}</div>
            <p className="text-xs text-muted-foreground">Students who solved it</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.failedUsers}</div>
            <p className="text-xs text-muted-foreground">Students still working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.passRate}%</div>
            <p className="text-xs text-muted-foreground">Success percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Performance</span>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="passed">Passed Only</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
          <CardDescription>Detailed breakdown of student attempts and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Attempts</TableHead>
                  <TableHead>Passed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Best Score</TableHead>
                  <TableHead>Last Attempt</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user: any) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.userName}</div>
                          <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'passed' ? 'default' : 'destructive'}>
                          {user.status === 'passed' ? 'Solved' : 'Working'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.totalAttempts}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{user.passedAttempts}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">{user.failedAttempts}</span>
                      </TableCell>
                      <TableCell>{user.bestScore || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.lastAttempt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/problems/${problemId}/users/${user.userId}/analytics`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      {statusFilter === "all" ? "No student attempts found for this problem" : 
                       statusFilter === "passed" ? "No students have passed this problem yet" :
                       "No students have failed this problem"}
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