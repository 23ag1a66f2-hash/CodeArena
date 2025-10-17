import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { config } from "@/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Download } from "lucide-react";
import { useState } from "react";

interface AssignmentSubmissionRow {
  id: number;
  assignmentId: number;
  userId: string;
  userEmail?: string;
  problemId: string;
  problemTitle: string;
  problemDifficulty?: string;
  totalScore: number;
  maxScore: number;
  status: string;
  updatedAt?: string;
  createdAt?: string;
  // Additional fields from actual submission data
  code?: string;
  language?: string;
  runtime?: number;
  memory?: number;
  feedback?: string;
  testResults?: any[];
}

interface Problem {
  id: string;
  title: string;
  difficulty: string;
}

export default function AssignmentSubmissions() {
  const [match, params] = useRoute("/admin/assignments/:assignmentId/submissions");
  const assignmentId = params?.assignmentId;
  const [selectedProblem, setSelectedProblem] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-assignment-submissions", assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiUrl}/api/assignments/${assignmentId}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return (await res.json()) as AssignmentSubmissionRow[];
    },
  });

  // Get unique problems for filter
  const problems = data ? Array.from(new Set(data.map(sub => sub.problemId))).map(problemId => {
    const submission = data.find(sub => sub.problemId === problemId);
    return {
      id: problemId,
      title: submission?.problemTitle || `Problem ${problemId}`,
      difficulty: "medium" // Default difficulty
    };
  }) : [];

  // Filter submissions based on selected filters
  const filteredData = data?.filter(submission => {
    const matchesProblem = selectedProblem === "all" || submission.problemId === selectedProblem;
    const matchesStatus = selectedStatus === "all" || submission.status === selectedStatus;
    return matchesProblem && matchesStatus;
  }) || [];

  const exportSubmissions = () => {
    if (!filteredData.length) return;
    
    const csvContent = [
      ["ID", "User", "Email", "Problem", "Difficulty", "Score", "Language", "Runtime", "Status", "Submitted", "Feedback"],
      ...filteredData.map(sub => [
        sub.id,
        sub.userId,
        sub.userEmail || 'N/A',
        sub.problemTitle,
        sub.problemDifficulty || 'N/A',
        `${sub.totalScore}/${sub.maxScore}`,
        sub.language || 'N/A',
        sub.runtime ? `${(sub.runtime / 1000).toFixed(3)}s` : 'N/A',
        sub.status,
        sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : '-',
        sub.feedback || 'No feedback'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-${assignmentId}-submissions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/assignments">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Submissions</h1>
          <p className="text-muted-foreground">All submissions for assignment {assignmentId}</p>
        </div>
        <Button onClick={exportSubmissions} disabled={!filteredData.length}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Problem</label>
              <Select value={selectedProblem} onValueChange={setSelectedProblem}>
                <SelectTrigger>
                  <SelectValue placeholder="All problems" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All problems</SelectItem>
                  {problems.map((problem) => (
                    <SelectItem key={problem.id} value={problem.id}>
                      {problem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredData.length} of {data?.length || 0} submissions
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission List</CardTitle>
          <CardDescription>Latest first</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{(error as Error).message}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                                  {filteredData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{row.userId}</div>
                          {row.userEmail && (
                            <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{row.problemTitle}</div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {row.problemId}
                            </Badge>
                            {row.problemDifficulty && (
                              <Badge 
                                variant={row.problemDifficulty === 'easy' ? 'default' : 
                                        row.problemDifficulty === 'medium' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {row.problemDifficulty}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    <TableCell>
                      {row.totalScore ?? 0} / {row.maxScore ?? 100}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {row.language || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.runtime ? `${(row.runtime / 1000).toFixed(3)}s` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        row.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        row.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={row.feedback}>
                        {row.feedback || 'No feedback'}
                      </div>
                    </TableCell>
                    <TableCell>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
                {(!filteredData || filteredData.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {data && data.length > 0 ? 'No submissions match the selected filters' : 'No submissions yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

