import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MonacoEditor } from "@/components/MonacoEditor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, Send, X, CheckCircle, XCircle } from "lucide-react";
import type { Problem, Submission } from "@shared/schema";

interface ProblemModalProps {
  problemId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { value: "python", label: "Python", starter: "def solution():\n    # Write your code here\n    pass" },
  { value: "javascript", label: "JavaScript", starter: "function solution() {\n    // Write your code here\n}" },
  { value: "java", label: "Java", starter: "public class Solution {\n    public void solution() {\n        // Write your code here\n    }\n}" },
  { value: "cpp", label: "C++", starter: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}" },
  { value: "c", label: "C", starter: "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}" },
];

export function ProblemModal({ problemId, isOpen, onClose }: ProblemModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState(LANGUAGES[0].starter);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: problem, isLoading } = useQuery({
    queryKey: ["/api/problems", problemId],
    enabled: !!problemId && isOpen,
  });

  const { data: submissions } = useQuery({
    queryKey: ["/api/submissions", { problemId }],
    enabled: !!problemId && isOpen,
  });

  const runCodeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/problems/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          code: code,
          language: selectedLanguage,
          problemId: problem?.id
        })
      });
      
      const data = await response.json();
      
      // Return data for both success and error cases
      return data;
    },
    onSuccess: (results) => {
      if (results.testResults) {
        // Test case results
        const testResults = {
          passed: results.status === "success",
          testCases: results.testResults,
          visibleTestsPassed: results.visibleTestsPassed,
          hiddenTestsPassed: results.hiddenTestsPassed,
          runtime: results.runtime || 0,
          memory: results.memory || 0,
        };
        setTestResults(testResults);

        // Show test case summary
        const visibleTests = results.testResults.filter(t => t.input !== '(hidden)');
        const passedVisible = visibleTests.filter(t => t.passed).length;
        const totalVisible = visibleTests.length;
        
        toast({
          title: testResults.passed ? "All Tests Passed!" : "Some Tests Failed",
          description: `Passed ${passedVisible}/${totalVisible} visible tests.\n` +
                      (results.hiddenTestsPassed ? "Hidden tests passed!" : "Hidden tests failed.") +
                      `\nRuntime: ${results.runtime}ms, Memory: ${results.memory}MB`,
          variant: testResults.passed ? "default" : "destructive",
        });
      } else {
        // Single execution result
        const testResults = {
          passed: results.status === "success",
          output: results.output || "No output",
          error: results.error,
          runtime: results.runtime || 0,
          memory: results.memory || 0,
        };
        setTestResults(testResults);
        
        toast({
          title: testResults.passed ? "Code Executed Successfully" : "Execution Error",
          description: testResults.error 
            ? testResults.error
            : `Output: ${testResults.output}\nRuntime: ${testResults.runtime}ms, Memory: ${testResults.memory}MB`,
          variant: testResults.passed ? "default" : "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/submissions", {
        problemId,
        code,
        language: selectedLanguage,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Submission Successful",
        description: "Your code has been submitted for evaluation.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isOpen && problem) {
      const language = LANGUAGES.find(lang => lang.value === selectedLanguage);
      if (language && problem.starterCode && problem.starterCode[selectedLanguage]) {
        setCode(problem.starterCode[selectedLanguage]);
      } else if (language) {
        setCode(language.starter);
      }
      setTestResults(null);
    }
  }, [isOpen, problem, selectedLanguage]);

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    const language = LANGUAGES.find(lang => lang.value === value);
    if (language) {
      if (problem?.starterCode && problem.starterCode[value]) {
        setCode(problem.starterCode[value]);
      } else {
        setCode(language.starter);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (!isOpen || !problemId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading problem...</p>
            </div>
          </div>
        ) : !problem ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-600 dark:text-red-400">Problem not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    {problem.title}
                  </DialogTitle>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge className={getDifficultyColor(problem.difficulty)}>
                      {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {problem.tags?.join(", ")}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="flex h-[70vh]">
              {/* Problem Description */}
              <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold mb-4">Problem Statement</h3>
                  <div className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                    {problem.description}
                  </div>
                  
                  {problem.examples && problem.examples.length > 0 && (
                    <>
                      <h4 className="font-semibold mb-2">Examples:</h4>
                      {problem.examples.map((example: any, index: number) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm mb-4">
                          <div><strong>Input:</strong> {example.input}</div>
                          <div><strong>Output:</strong> {example.output}</div>
                          {example.explanation && (
                            <div><strong>Explanation:</strong> {example.explanation}</div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {problem.constraints && (
                    <>
                      <h4 className="font-semibold mb-2">Constraints:</h4>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {problem.constraints}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Code Editor */}
              <div className="w-1/2 flex flex-col">
                {/* Editor Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runCodeMutation.mutate()}
                        disabled={runCodeMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        {runCodeMutation.isPending ? "Running..." : "Run"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitCodeMutation.mutate()}
                        disabled={submitCodeMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        {submitCodeMutation.isPending ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1">
                  <MonacoEditor
                    value={code}
                    onChange={setCode}
                    language={selectedLanguage === "cpp" ? "cpp" : selectedLanguage}
                    height="100%"
                    theme="vs-dark"
                  />
                </div>

                {/* Test Results */}
                {testResults && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                    <div className="text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        {testResults.passed ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          Sample Test: {testResults.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 text-xs space-y-1">
                        <div>Runtime: {testResults.runtime}ms</div>
                        <div>Memory: {testResults.memory}KB</div>
                        {testResults.output && (
                          <div>Output: {testResults.output}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
