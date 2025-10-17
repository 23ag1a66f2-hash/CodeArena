// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/ui/avatar";
import { Calendar, Trophy, Code, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { Submission, Problem } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions"],
  });

  const { data: problems } = useQuery({
    queryKey: ["/api/problems"],
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["/api/leaderboard"],
  });

  if (!user) return null;

  const userRank = leaderboard?.findIndex((entry: any) => entry.user.id === user.id) + 1 || 0;
  const acceptedSubmissions = submissions?.filter((s: Submission) => s.status === 'accepted') || [];
  const totalSubmissions = submissions?.length || 0;
  const solvedProblems = new Set(acceptedSubmissions.map((s: Submission) => s.problemId)).size;
  const accuracyRate = totalSubmissions > 0 ? (acceptedSubmissions.length / totalSubmissions) * 100 : 0;

  const difficultyStats = problems?.reduce((acc: any, problem: Problem) => {
    const solved = acceptedSubmissions.some((s: Submission) => s.problemId === problem.id);
    if (solved) {
      acc[problem.difficulty] = (acc[problem.difficulty] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  const recentSubmissions = submissions?.slice(0, 10) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setLocation('/dashboard')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-start gap-6">
        <UserAvatar user={user} size="lg" />
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{user.firstName} {user.lastName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-4 mt-4">
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
              {user.role || 'Student'}
            </Badge>
            {userRank > 0 && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Rank #{userRank}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Joined {new Date(user.createdAt!).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{solvedProblems}</div>
            <p className="text-xs text-muted-foreground">
              out of {problems?.length || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {acceptedSubmissions.length} accepted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracyRate.toFixed(1)}%</div>
            <Progress value={accuracyRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.streak || 0}</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Problem Difficulty Breakdown</CardTitle>
                <CardDescription>Problems solved by difficulty level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Easy</span>
                  <div className="flex items-center gap-2">
                    <Progress value={(difficultyStats.easy || 0) / Math.max(1, problems?.filter((p: Problem) => p.difficulty === 'easy').length || 1) * 100} className="w-20" />
                    <span className="text-sm font-medium">{difficultyStats.easy || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium</span>
                  <div className="flex items-center gap-2">
                    <Progress value={(difficultyStats.medium || 0) / Math.max(1, problems?.filter((p: Problem) => p.difficulty === 'medium').length || 1) * 100} className="w-20" />
                    <span className="text-sm font-medium">{difficultyStats.medium || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hard</span>
                  <div className="flex items-center gap-2">
                    <Progress value={(difficultyStats.hard || 0) / Math.max(1, problems?.filter((p: Problem) => p.difficulty === 'hard').length || 1) * 100} className="w-20" />
                    <span className="text-sm font-medium">{difficultyStats.hard || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Language Distribution</CardTitle>
                <CardDescription>Submissions by programming language</CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div>Loading language stats...</div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(
                      submissions?.reduce((acc: any, sub: Submission) => {
                        acc[sub.language] = (acc[sub.language] || 0) + 1;
                        return acc;
                      }, {}) || {}
                    ).map(([language, count]) => (
                      <div key={language} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{language}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={(count as number) / totalSubmissions * 100} className="w-20" />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Your latest coding submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div>Loading submissions...</div>
              ) : (
                <div className="space-y-4">
                  {recentSubmissions.map((submission: Submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Problem #{submission.problemId}</p>
                        <p className="text-sm text-muted-foreground">
                          {submission.language} • {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={submission.status === 'accepted' ? 'default' : 'secondary'}>
                        {submission.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>Your coding milestones and badges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {solvedProblems >= 1 && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">First Solution</p>
                      <p className="text-sm text-muted-foreground">Solved your first problem</p>
                    </div>
                  </div>
                )}
                
                {solvedProblems >= 10 && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Problem Solver</p>
                      <p className="text-sm text-muted-foreground">Solved 10 problems</p>
                    </div>
                  </div>
                )}

                {accuracyRate >= 80 && totalSubmissions >= 5 && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium">High Accuracy</p>
                      <p className="text-sm text-muted-foreground">80%+ accuracy rate</p>
                    </div>
                  </div>
                )}

                {userRank > 0 && userRank <= 10 && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium">Top 10</p>
                      <p className="text-sm text-muted-foreground">Ranked in top 10</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}