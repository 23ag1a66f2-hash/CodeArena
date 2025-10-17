import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Clock, BookOpen, User, Plus, BarChart3, Lock, CheckCircle } from "lucide-react";

interface ProblemSet {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  category?: string;
  tags?: string[];
  problemIds: string[];
  isPublic: boolean;
  estimatedTime?: number;
  totalProblems: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isEnrolled?: boolean;
  isCompleted?: boolean;
}

export default function ProblemSets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { user } = useAuth();

  const { data: problemSets, isLoading } = useQuery<ProblemSet[]>({
    queryKey: user ? ["/api/problem-sets-with-enrollment"] : ["/api/problem-sets"],
    staleTime: 30000,
  });

  const filteredProblemSets = problemSets?.filter((problemSet) => {
    const matchesSearch = problemSet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         problemSet.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || problemSet.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === "all" || problemSet.category === categoryFilter;
    return matchesSearch && matchesDifficulty && matchesCategory;
  }) || [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = Array.from(new Set(problemSets?.map(set => set.category).filter((cat): cat is string => Boolean(cat)))) || [];

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Problem Sets</h1>
          <p className="text-muted-foreground mt-1">
            Curated collections of programming challenges
          </p>
        </div>
        {user?.role === 'admin' && (
          <Link href="/admin/problem-sets/">
            <Button>
              <User className="w-4 h-4 mr-2" />
              Manage Assignments
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problem sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Problem Sets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProblemSets.map((problemSet) => (
            <Card key={problemSet.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 flex items-center gap-2">
                      {problemSet.title}
                      {!problemSet.isEnrolled && user?.role !== 'admin' && (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                      {problemSet.isCompleted && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {problemSet.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Difficulty and Category */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={getDifficultyColor(problemSet.difficulty)}>
                      {problemSet.difficulty.charAt(0).toUpperCase() + problemSet.difficulty.slice(1)}
                    </Badge>
                    {problemSet.category && (
                      <Badge variant="outline">{problemSet.category}</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{problemSet.totalProblems} problems</span>
                    </div>
                    {problemSet.estimatedTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{problemSet.estimatedTime}min</span>
                      </div>
                    )}
                    {problemSet.isCompleted && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {problemSet.tags && problemSet.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {problemSet.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {problemSet.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{problemSet.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {problemSet.isEnrolled || user?.role === 'admin' ? (
                      <Link href={`/problem-sets/${problemSet.id}`} className="flex-1">
                        <Button className="w-full" variant={problemSet.isCompleted ? "secondary" : "default"}>
                          {problemSet.isCompleted ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            "Start Solving"
                          )}
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        disabled
                        title="This assignment requires enrollment. Please contact your instructor for access."
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Locked
                      </Button>
                    )}
                    {/* {user?.role === 'admin' && (
                      <Link href={`/admin/problem-sets`}>
                        <Button variant="outline" size="icon" title="Manage users and enrollments">
                          <User className="w-4 h-4" />
                        </Button>
                      </Link>
                    )} */}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredProblemSets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No problem sets found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || difficultyFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search criteria"
                : "No problem sets have been created yet"}
            </p>
            
          </CardContent>
        </Card>
      )}
    </div>
  );
}