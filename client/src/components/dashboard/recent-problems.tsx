import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Lock } from "lucide-react";
import { Link } from "wouter";

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  tags?: string[];
}

interface Submission {
  id: number;
  problemId: number;
  status: string;
  submittedAt: string;
}

export function RecentProblems() {
  const { data: problems, isLoading: problemsLoading } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
    retry: false,
  });

  const { data: userSubmissions, isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    retry: false,
  });

  const isLoading = problemsLoading || submissionsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Problems</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get first 3 problems for recent display
  const recentProblems = problems?.slice(0, 3) || [];

  const getProblemStatus = (problemId: number) => {
    if (!userSubmissions) return { icon: Lock, text: "Locked", color: "text-gray-500" };
    
    const problemSubmissions = userSubmissions.filter(s => s.problemId === problemId);
    if (problemSubmissions.length === 0) {
      return { icon: Lock, text: "Not Started", color: "text-gray-500" };
    }

    const hasAccepted = problemSubmissions.some(s => s.status === "accepted");
    if (hasAccepted) {
      return { icon: CheckCircle, text: "Solved", color: "text-green-600 dark:text-green-400" };
    }

    return { icon: Clock, text: "In Progress", color: "text-yellow-600 dark:text-yellow-400" };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 dark:border-gray-800">
        <CardTitle>Recent Problems</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {recentProblems.map((problem: Problem) => {
            const status = getProblemStatus(problem.id);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={problem.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <StatusIcon className={`h-4 w-4 ${status.text === "Solved" ? "text-green-500" : status.text === "In Progress" ? "text-yellow-500" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {problem.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getDifficultyColor(problem.difficulty)}>
                        {problem.difficulty}
                      </Badge>
                      {problem.tags && problem.tags.length > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {problem.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${status.color}`}>
                    {status.text}
                  </p>
                  {status.text === "Solved" && userSubmissions && (
                    <p className="text-xs text-gray-500">
                      {new Date(userSubmissions.find(s => s.problemId === problem.id && s.status === "accepted")?.submittedAt || '').toLocaleString()}
                    </p>
                  )}
                  {status.text === "In Progress" && userSubmissions && (
                    <p className="text-xs text-gray-500">
                      Last attempt {new Date(userSubmissions.find(s => s.problemId === problem.id)?.submittedAt || '').toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 text-center">
          <Button asChild className="bg-green-500 hover:bg-green-600 text-white">
            <Link href="/problems">View All Problems</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
