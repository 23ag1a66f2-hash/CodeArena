import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProblemModal } from "@/components/problems/problem-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, CheckCircle, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { config } from "@/config";
import { useToast } from "@/hooks/use-toast";
import type { Problem } from "@/types/problem";
import { Link } from "wouter";

interface Submission {
  id: number;
  problemId: number;
  status: string;
  submittedAt: string;
}

export default function Problems() {
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  // Memoize token and fetch options
  const token = useMemo(() => localStorage.getItem('token'), []);
  const fetchOptions = useMemo(() => ({
    credentials: 'include' as const,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }), [token]);

  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
    retry: false,
    staleTime: 30000,
  });

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    queryFn: async () => {
      try {
        if (!isAuthenticated || !token) {
          return [];
        }
        const res = await fetch(`${config.apiUrl}/api/submissions`, fetchOptions);
        if (!res.ok) {
          return [];
        }
        return res.json();
      } catch (error) {
        console.error("Error fetching submissions:", error);
        return [];
      }
    },
    retry: false,
    enabled: isAuthenticated && !!token,
    staleTime: 30000,
  });

  const filteredProblems = problems?.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         problem.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || problem.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  }) || [];

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

  const isProblemSolved = (problemId: number) => {
    return submissions?.some(s => s.problemId === problemId && s.status === "accepted") || false;
  };

  const handleProblemClick = (problem: Problem) => {
    setSelectedProblem(problem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProblem(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Practice Problems
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose from our collection of coding challenges to improve your skills.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter Problems</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search problems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    <div className="flex space-x-2">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProblems.map((problem) => {
            const solved = isProblemSolved(problem.id);
            return (
              <Card 
                key={problem.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {problem.title}
                        </h3>
                        {solved && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {problem.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                      <div className="flex items-center space-x-3">
                        <Badge className={getDifficultyColor(problem.difficulty)}>
                          {problem.difficulty}
                        </Badge>
                        {problem.tags && problem.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {problem.tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {solved ? (
                        <Button
                          variant="outline"
                          onClick={() => handleProblemClick(problem)}
                          className="flex-1"
                        >
                          Try Again
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleProblemClick(problem)}
                          className="flex-1"
                        >
                          Solve Problem
                        </Button>
                      )}
                      {user?.role === 'admin' && (
                        <Link href={`/admin/problems/${problem.id}/analytics`}>
                          <Button variant="outline" size="icon" title="View Analytics">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredProblems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No problems found</h3>
              <p>Try adjusting your search criteria or filters.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProblem && (
        <ProblemModal
          problem={selectedProblem}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
