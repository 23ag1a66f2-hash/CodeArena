import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Search, Filter, Edit, Trash2, Copy } from "lucide-react";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { config } from "@/config";

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  constraints?: string;
  inputFormat: string;
  outputFormat: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    timeLimit?: number;
    memoryLimit?: number;
    explanation?: string;
  }>;
  timeLimit: number;
  memoryLimit: number;
  starterCode: {
    python?: string;
    c?: string;
    java?: string;
    cpp?: string;
  };
  notes?: string;
  difficulty_rating?: number;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  timeLimit?: number;
  memoryLimit?: number;
  explanation?: string;
}

const LANGUAGES = ["c", "cpp", "python", "java", "javascript"] as const;

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
  constraints: z.string().optional(),
  inputFormat: z.string().min(1, "Input format is required"),
  outputFormat: z.string().min(1, "Output format is required"),
  examples: z.array(z.object({
    input: z.string().min(1, "Input is required"),
    output: z.string().min(1, "Output is required"),
    explanation: z.string().optional()
  })).min(1, "At least one example is required"),
  testCases: z.array(z.object({
    input: z.string().min(1, "Input is required"),
    expectedOutput: z.string().min(1, "Expected output is required"),
    explanation: z.string().optional(),
    isHidden: z.boolean().default(false),
    timeLimit: z.number().optional(),
    memoryLimit: z.number().optional()
  })).min(1, "At least one test case is required"),
  timeLimit: z.number().min(100, "Time limit must be at least 100ms"),
  memoryLimit: z.number().min(16, "Memory limit must be at least 16MB"),
  starterCode: z.object({
    c: z.string().optional(),
    cpp: z.string().optional(),
    python: z.string().optional(),
    java: z.string().optional(),
    javascript: z.string().optional()
  }),
  notes: z.string().optional(),
  difficulty_rating: z.number().min(1).max(5).optional()
});

export default function AdminProblems() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);

  // Memoize token and fetch options to prevent recreation on every render
  const token = useMemo(() => localStorage.getItem('token'), []);
  const fetchOptions = useMemo(() => ({
    credentials: 'include' as const,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }), [token]);

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
      setLocation('/problems');
    }
  }, [isAuthenticated, user, setLocation, toast]);

  // Early return if not authenticated or not admin
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }

  const form = useForm<z.infer<typeof problemSchema>>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      description: "",
      difficulty: "medium",
      tags: [],
      constraints: "",
      inputFormat: "",
      outputFormat: "",
      examples: [{
        input: "",
        output: "",
        explanation: ""
      }],
      testCases: [{
        input: "",
        expectedOutput: "",
        explanation: "",
        isHidden: false,
        timeLimit: 1000,
        memoryLimit: 256
      }],
      timeLimit: 1000,
      memoryLimit: 256,
      starterCode: {
        c: "#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
        cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
        python: "def solution():\n    pass",
        java: "public class Solution {\n    public void solution() {\n    }\n}",
        javascript: "function solution() {\n  // Your code here\n}"
      },
      notes: "",
      difficulty_rating: 1
    }
  });

  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/problems`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json() as Promise<Problem[]>;
    },
    retry: false,
    enabled: !!token && isAuthenticated && user.role === 'admin',
    staleTime: 30000,
  });

  const createProblemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof problemSchema>) => {
      const formattedData = {
        ...data,
        tags: data.tags.filter(tag => tag.trim() !== ""),
        isPublic: true,
        examples: data.examples.map(example => ({
          input: example.input.trim(),
          output: example.output.trim(),
          explanation: example.explanation?.trim() || ""
        })),
        testCases: data.testCases.map(testCase => ({
          input: testCase.input.trim(),
          expectedOutput: testCase.expectedOutput.trim(),
          explanation: testCase.explanation?.trim() || "",
          isHidden: testCase.isHidden,
          timeLimit: testCase.timeLimit || data.timeLimit,
          memoryLimit: testCase.memoryLimit || data.memoryLimit
        })),
        starterCode: {
          c: data.starterCode.c?.trim() || "",
          cpp: data.starterCode.cpp?.trim() || "",
          python: data.starterCode.python?.trim() || "",
          java: data.starterCode.java?.trim() || "",
          javascript: data.starterCode.javascript?.trim() || ""
        },
        constraints: data.constraints?.trim() || "",
        inputFormat: data.inputFormat.trim(),
        outputFormat: data.outputFormat.trim(),
        notes: data.notes?.trim() || "",
        difficulty_rating: data.difficulty_rating || 1,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit
      };

      try {
        const response = await fetch(`${config.apiUrl}/api/problems`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(formattedData),
          credentials: 'include'
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to create problem");
          } else {
            throw new Error(`Failed to create problem (${response.status})`);
            }
          }

        return response.json();
      } catch (error) {
        console.error("Problem creation error details:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("An unexpected error occurred while creating the problem");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Problem created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Problem creation error:", error);
        toast({
        title: "Error",
        description: error.message || "Failed to create problem",
          variant: "destructive",
        });
    },
  });

  const updateProblemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof problemSchema> & { id: number }) => {
      const { id, ...problemData } = data;
      const formattedData = {
        ...problemData,
        tags: problemData.tags.filter(tag => tag.trim() !== ""),
        isPublic: true,
        examples: problemData.examples.map(example => ({
          input: example.input.trim(),
          output: example.output.trim(),
          explanation: example.explanation?.trim() || ""
        })),
        testCases: problemData.testCases.map(testCase => ({
          input: testCase.input.trim(),
          expectedOutput: testCase.expectedOutput.trim(),
          explanation: testCase.explanation?.trim() || "",
          isHidden: testCase.isHidden,
          timeLimit: testCase.timeLimit || problemData.timeLimit,
          memoryLimit: testCase.memoryLimit || problemData.memoryLimit
        })),
        starterCode: {
          c: problemData.starterCode?.c?.trim() || "#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
          cpp: problemData.starterCode?.cpp?.trim() || "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
          python: problemData.starterCode?.python?.trim() || "def solution():\n    pass",
          java: problemData.starterCode?.java?.trim() || "public class Solution {\n    public void solution() {\n    }\n}",
          javascript: problemData.starterCode?.javascript?.trim() || "function solution() {\n  // Your code here\n}"
        },
        constraints: problemData.constraints?.trim() || "",
        inputFormat: problemData.inputFormat.trim(),
        outputFormat: problemData.outputFormat.trim(),
        notes: problemData.notes?.trim() || "",
        difficulty_rating: problemData.difficulty_rating || 1,
        timeLimit: problemData.timeLimit,
        memoryLimit: problemData.memoryLimit
      };

      console.log('[DEBUG] Updating problem:', { id, data: formattedData });

      const response = await fetch(`${config.apiUrl}/api/problems/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formattedData),
        credentials: 'include'
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to update problem (${response.status})`);
        } else {
          throw new Error(`Failed to update problem (${response.status})`);
        }
      }

      const result = await response.json();
      console.log('[DEBUG] Problem updated successfully:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      setIsCreateDialogOpen(false);
      setEditingProblem(null);
      form.reset();
      toast({
        title: "Success",
        description: "Problem updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Problem update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update problem",
        variant: "destructive",
      });
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${config.apiUrl}/api/problems/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete problem");
        } else {
          throw new Error(`Failed to delete problem (${response.status})`);
        }
      }

      // Check if there's actually content to parse
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }
      
      // If no content or not JSON, just return success status
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      toast({
        title: "Success",
        description: "Problem deleted successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Problem deletion error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete problem",
        variant: "destructive",
      });
    },
  });

  const duplicateProblemMutation = useMutation({
    mutationFn: async (problem: Problem) => {
      // Create a copy of the problem with modified title
      const duplicatedProblem = {
        ...problem,
        title: `${problem.title} (Copy)`,
        tags: problem.tags.filter(tag => tag.trim() !== ""),
        isPublic: true,
        examples: problem.examples.map(example => ({
          input: example.input.trim(),
          output: example.output.trim(),
          explanation: example.explanation?.trim() || ""
        })),
        testCases: problem.testCases.map(testCase => ({
          input: testCase.input.trim(),
          expectedOutput: testCase.expectedOutput.trim(),
          explanation: testCase.explanation?.trim() || "",
          isHidden: testCase.isHidden,
          timeLimit: testCase.timeLimit || problem.timeLimit,
          memoryLimit: testCase.memoryLimit || problem.memoryLimit
        })),
        starterCode: {
          c: problem.starterCode?.c?.trim() || "#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
          cpp: problem.starterCode?.cpp?.trim() || "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
          python: problem.starterCode?.python?.trim() || "def solution():\n    pass",
          java: problem.starterCode?.java?.trim() || "public class Solution {\n    public void solution() {\n    }\n}",
          javascript: problem.starterCode?.javascript?.trim() || "function solution() {\n  // Your code here\n}"
        },
        constraints: problem.constraints?.trim() || "",
        inputFormat: problem.inputFormat.trim(),
        outputFormat: problem.outputFormat.trim(),
        notes: problem.notes?.trim() || "",
        difficulty_rating: problem.difficulty_rating || 1,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit
      };

      // Remove the ID since we're creating a new problem
      const { id, ...problemWithoutId } = duplicatedProblem;

      const response = await fetch(`${config.apiUrl}/api/problems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(problemWithoutId),
        credentials: 'include'
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to duplicate problem");
        } else {
          throw new Error(`Failed to duplicate problem (${response.status})`);
        }
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      toast({
        title: "Success",
        description: "Problem duplicated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Problem duplication error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate problem",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof problemSchema>) => {
    try {
      // Validate required fields
      if (!data.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Title is required",
          variant: "destructive",
        });
        return;
      }

      if (!data.description.trim()) {
        toast({
          title: "Validation Error",
          description: "Description is required",
          variant: "destructive",
        });
        return;
      }

      if (!data.inputFormat?.trim() || !data.outputFormat?.trim()) {
        toast({
          title: "Validation Error",
          description: "Input and output formats are required",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: editingProblem ? "Updating Problem" : "Creating Problem",
        description: `Please wait while we ${editingProblem ? 'save your changes' : 'create your problem'}...`,
      });

      // Submit the data
      if (editingProblem) {
        await updateProblemMutation.mutateAsync({
          ...data,
          id: editingProblem.id
        });
      } else {
        await createProblemMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : editingProblem 
            ? "Failed to update problem" 
            : "Failed to create problem",
        variant: "destructive",
      });
    }
  };

  const addExample = () => {
    const examples = form.getValues("examples");
    form.setValue("examples", [
      ...examples,
      { input: "", output: "", explanation: "" }
    ]);
  };

  const removeExample = (index: number) => {
    const examples = form.getValues("examples");
    if (examples.length > 1) {
      form.setValue("examples", examples.filter((_, i) => i !== index));
    }
  };

  const addTestCase = () => {
    const testCases = form.getValues("testCases");
    form.setValue("testCases", [
      ...testCases,
      { input: "", expectedOutput: "", explanation: "", isHidden: false, timeLimit: undefined, memoryLimit: undefined }
    ]);
  };

  const removeTestCase = (index: number) => {
    const testCases = form.getValues("testCases");
    if (testCases.length > 1) {
      form.setValue("testCases", testCases.filter((_, i) => i !== index));
    }
  };

  const filteredProblems = problems?.filter((problem: Problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || problem.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  }) || [];

  const handleCloseDialog = () => {
    const isDirty = form.formState.isDirty;
    if (isDirty) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        setIsCreateDialogOpen(false);
        setEditingProblem(null);
        form.reset();
      }
    } else {
      setIsCreateDialogOpen(false);
      setEditingProblem(null);
      form.reset();
    }
  };

  return (
    <div className="container mx-auto py-6 px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Problems Management</h1>
        <Button
  onClick={() => {
    setEditingProblem(null); // No problem selected => creating new
    form.reset({
      title: "",
      description: "",
      difficulty: "medium",
      tags: [],
      constraints: "",
      inputFormat: "",
      outputFormat: "",
      examples: [{
        input: "",
        output: "",
        explanation: ""
      }],
      testCases: [{
        input: "",
        expectedOutput: "",
        explanation: "",
        isHidden: false,
        timeLimit: 1000,
        memoryLimit: 256
      }],
      timeLimit: 1000,
      memoryLimit: 256,
      starterCode: {
        python: "def solution():\n    pass",
        c: "#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
        java: "public class Solution {\n    public void solution() {\n    }\n}",
        cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
        javascript: "function solution() {\n    // Your solution here\n}"
    },    
      notes: "",
      difficulty_rating: 1
    });
    setIsCreateDialogOpen(true);
  }}
  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
>
  <Plus className="w-4 h-4 mr-2" />
  Add Problem
</Button>
      </div>

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

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProblems.map((problem: Problem) => (
            <Card key={problem.id} className="hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {problem.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {problem.description}
                    </p>
                    <div className="flex items-center space-x-3">
                      <Badge className={
                        problem.difficulty === "easy" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" :
                        problem.difficulty === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" :
                        "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }>
                        {problem.difficulty}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
        </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/admin/problems/${problem.id}/analytics`);
                      }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      📊
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProblem(problem);
                        form.reset({
                          title: problem?.title || "",
                          description: problem?.description || "",
                          difficulty: problem?.difficulty || "medium",
                          tags: problem?.tags || [],
                          constraints: problem?.constraints || "",
                          inputFormat: problem?.inputFormat || "",
                          outputFormat: problem?.outputFormat || "",
                          examples: problem?.examples?.length > 0 ? problem.examples : [{
                            input: "",
                            output: "",
                            explanation: ""
                          }],
                          testCases: problem?.testCases?.length > 0 ? problem.testCases : [{
                            input: "",
                            expectedOutput: "",
                            explanation: "",
                            isHidden: false,
                            timeLimit: 1000,
                            memoryLimit: 256
                          }],
                          timeLimit: problem?.timeLimit || 1000,
                          memoryLimit: problem?.memoryLimit || 256,
                          starterCode: {
                            c: problem?.starterCode?.c || "#include <stdio.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
                            cpp: problem?.starterCode?.cpp || "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
                            python: problem?.starterCode?.python || "def solution():\n    pass",
                            java: problem?.starterCode?.java || "public class Solution {\n    public void solution() {\n    }\n}",
                            javascript: problem?.starterCode?.javascript || "function solution() {\n  // Your code here\n}"
                          },
                          notes: problem?.notes || "",
                          difficulty_rating: problem?.difficulty_rating || 1
                        });
                        setIsCreateDialogOpen(true);
                      }}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to duplicate "${problem.title}"? This will create a copy with "(Copy)" added to the title.`)) {
                          duplicateProblemMutation.mutate(problem);
                        }
                      }}
                      disabled={duplicateProblemMutation.isPending}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Duplicate Problem"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        
                        // Check if problem is used in problem sets
                        try {
                          const response = await fetch(`${config.apiUrl}/api/problems/${problem.id}/usage`, {
                            credentials: 'include',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          
                          if (response.ok) {
                            const usage = await response.json();
                            if (usage.problemSetCount > 0) {
                              const proceed = confirm(
                                `Warning: This problem is used in ${usage.problemSetCount} problem set(s). ` +
                                `Deleting it will remove it from all problem sets. ` +
                                `Are you sure you want to continue?`
                              );
                              if (!proceed) return;
                            }
                          }
                          
                          // Final confirmation
                          if (confirm("Are you sure you want to delete this problem? This action cannot be undone.")) {
                            deleteProblemMutation.mutate(problem.id);
                          }
                        } catch (error) {
                          // If usage check fails, still allow deletion with warning
                          if (confirm("Are you sure you want to delete this problem? This action cannot be undone.")) {
                            deleteProblemMutation.mutate(problem.id);
                          }
                        }
                      }}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredProblems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No problems found</h3>
              <p>Try adjusting your search criteria or create a new problem.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseDialog();
        } else {
          setIsCreateDialogOpen(true);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProblem ? 'Edit Problem' : 'Create New Problem'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter problem title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter problem description with Markdown support"
                            className="min-h-[200px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="difficulty_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty Rating (1-5)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              max={5} 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter tags separated by commas"
                            onChange={(e) => field.onChange(e.target.value.split(",").map(tag => tag.trim()))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timeLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Limit (ms)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={100} 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="memoryLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Memory Limit (MB)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={16} 
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="inputFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Input Format</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe the input format"
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outputFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Output Format</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe the output format"
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="constraints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Constraints</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="List the constraints"
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Add any notes about the problem (only visible to admins)"
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Examples</h3>
                  <Button type="button" variant="outline" onClick={addExample}>
                    Add Example
                  </Button>
                </div>
                
                {form.watch("examples").map((_, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Example {index + 1}</h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExample(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`examples.${index}.input`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Input</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Example input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`examples.${index}.output`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Output</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Example output" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`examples.${index}.explanation`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Explanation</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Explain this example" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Test Cases</h3>
                  <Button type="button" variant="outline" onClick={addTestCase}>
                    Add Test Case
                  </Button>
                </div>
                
                {form.watch("testCases").map((_, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Test Case {index + 1}</h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestCase(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`testCases.${index}.input`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Input</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Test case input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`testCases.${index}.expectedOutput`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expected Output</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Expected output" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`testCases.${index}.explanation`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Explanation</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Explain this test case" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`testCases.${index}.isHidden`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="!mt-0">Hidden test case</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`testCases.${index}.timeLimit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time Limit (ms)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`testCases.${index}.memoryLimit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Memory Limit (MB)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Starter Code</h3>
                {LANGUAGES.map((lang) => (
                  <FormField
                    key={lang}
                    control={form.control}
                    name={`starterCode.${lang}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="capitalize">{lang}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder={`${lang} starter code`}
                            className="font-mono min-h-[150px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={createProblemMutation.isPending || updateProblemMutation.isPending}
                >
                  {createProblemMutation.isPending || updateProblemMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {editingProblem ? 'Saving...' : 'Creating...'}
                    </div>
                  ) : (
                    editingProblem ? 'Save Changes' : 'Create Problem'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 