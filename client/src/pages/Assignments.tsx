import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Clock, BookOpen, FileText, Search, Lock, CheckCircle } from "lucide-react";

interface Assignment {
  id: number;
  title: string;
  description?: string;
  courseTag: string;
  deadline?: string;
  questions: any[];
  maxAttempts: number;
  isVisible: boolean;
  autoGrade: boolean;
  isEnrolled?: boolean;
  isCompleted?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Assignments() {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: assignments, isLoading } = useQuery<Assignment[]>({
    queryKey: user ? ["/api/problem-sets-with-enrollment"] : ["/api/assignments"],
    enabled: true, // Always enabled, but will use different endpoints based on user state
  });

  // Debug logging
  console.log('[DEBUG] Assignments page:', {
    user: user ? { id: user.id, email: user.email } : null,
    queryKey: user ? ["/api/problem-sets-with-enrollment"] : ["/api/assignments"],
    assignmentsCount: assignments?.length || 0,
    assignments: assignments?.map(a => ({ id: a.id, title: a.title, isEnrolled: a.isEnrolled }))
  });

  const courseTags = Array.from(new Set(assignments?.map(a => a.courseTag) || []));

  const filteredAssignments = assignments?.filter(assignment => {
    const matchesCourse = selectedCourse === "all" || assignment.courseTag === selectedCourse;
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  }) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDeadlineStatus = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: "overdue", text: "Overdue", variant: "destructive" as const };
    if (diffDays === 0) return { status: "today", text: "Due Today", variant: "destructive" as const };
    if (diffDays <= 3) return { status: "soon", text: `Due in ${diffDays} days`, variant: "secondary" as const };
    return { status: "upcoming", text: `Due in ${diffDays} days`, variant: "outline" as const };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Assignments</h1>
        <p className="text-muted-foreground">Complete assignments to test your knowledge and skills</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courseTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignments Grid */}
      <div className="grid gap-6">
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="text-muted-foreground mb-2">No assignments found</div>
              <p className="text-sm text-muted-foreground text-center">
                {searchQuery || selectedCourse !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Check back later for new assignments"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssignments.map((assignment: Assignment) => {
            const deadlineStatus = getDeadlineStatus(assignment.deadline);
            const totalPoints = assignment.questions.reduce((sum, q) => sum + (q.points || 1), 0);
            
            return (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{assignment.title}</CardTitle>
                        <Badge variant="outline">{assignment.courseTag}</Badge>
                        {deadlineStatus && (
                          <Badge variant={deadlineStatus.variant}>
                            <Clock className="h-3 w-3 mr-1" />
                            {deadlineStatus.text}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-base">
                        {assignment.description || "No description provided"}
                      </CardDescription>
                    </div>
                    {assignment.isEnrolled ? (
                      <Button 
                        onClick={() => navigate(`/assignments/${assignment.id}`)}
                        variant={assignment.isCompleted ? "secondary" : "default"}
                      >
                        {assignment.isCompleted ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completed
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Start Solving
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        disabled
                        title="This assignment requires enrollment. Please contact your instructor for access."
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Questions:</span>
                      <div className="font-medium">{assignment.questions.length}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Total Points:</span>
                      <div className="font-medium">{totalPoints}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Max Attempts:</span>
                      <div className="font-medium">{assignment.maxAttempts}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Created:</span>
                      <div className="font-medium">{formatDate(assignment.createdAt)}</div>
                    </div>
                  </div>
                  
                  {assignment.deadline && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Deadline: </span>
                        {new Date(assignment.deadline).toLocaleString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}