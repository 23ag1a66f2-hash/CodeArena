import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonacoEditor } from "@/components/MonacoEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Send, CheckCircle, XCircle, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { Link } from "wouter";

interface StarterCode {
  python?: string;
  javascript?: string;
  cpp?: string;
  java?: string;
  c?: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category?: string;
  tags: string[];
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  testCases: TestCase[];
  timeLimit: number;
  memoryLimit: number;
  starterCode: StarterCode;
  problemNumber?: number;
}

interface Submission {
  id: number;
  status: string;
  language: string;
  submittedAt: string;
  runtime?: number;
  memory?: number;
}

interface TestResult {
  passed: boolean;
  output: string;
  expectedOutput: string;
  isHidden: boolean;
  error?: string;
  input: string;
  runtime: number;
  memory: number;
}

interface RunCodeResponse {
  success?: boolean;
  status?: string;
  output?: string;
  results: any[];
  error?: string;
  message?: string;
}

export default function ProblemDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState("description");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmissionResults, setIsSubmissionResults] = useState(false);
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // Get problemSet from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const problemSetId = urlParams.get('problemSet');
  const problemInstanceId = urlParams.get('instanceId');

  // Fetch problem: if coming from an assignment with an instance, use the instance-aware endpoint
  const { data: problem, isLoading } = useQuery<Problem | null>({
    queryKey: [problemSetId && problemInstanceId ? `/api/problem-sets/${problemSetId}/problems/${problemInstanceId}` : `/api/problems/${id}`],
    queryFn: async () => {
      const url = problemSetId && problemInstanceId
        ? `/api/problem-sets/${problemSetId}/problems/${problemInstanceId}`
        : `/api/problems/${id}`;
      const response = await apiRequest("GET", url);
      if (!response) throw new Error("Problem not found");
      return (await response.json()) as Problem;
    },
    retry: false,
  });

  // Initialize code with problem's starter code when language changes
  useEffect(() => {
    if (problem?.starterCode && selectedLanguage in problem.starterCode) {
      const starterCodeValue = problem.starterCode[selectedLanguage as keyof StarterCode];
      setCode(starterCodeValue || '');
    }
    // If C is selected but only CPP starter is available, fallback to CPP
    else if (problem?.starterCode && selectedLanguage === 'c') {
       const scAny = problem.starterCode as Record<string, string>;
       if (scAny['c'] || scAny['cpp']) {
         setCode(scAny['c'] || scAny['cpp'] || '');
       }
    }
  }, [problem, selectedLanguage]);

  const effectiveProblemId = problem?.id ?? (id ? parseInt(id) : 0);
  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions", { problemId: effectiveProblemId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/submissions?problemId=${effectiveProblemId}`);
      if (!response) return [];
      const data = await response.json();
      return data as Submission[];
    },
    enabled: !!effectiveProblemId,
    retry: false,
  });

  const runCodeMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) {
        throw new Error("Please write some code before running");
      }

      if (!problem) {
        throw new Error("Problem data not loaded");
      }

      try {
        console.log('[FRONTEND] 🚀 Sending code execution request (RUN CODE)');
        console.log('[FRONTEND] Language:', selectedLanguage);
        console.log('[FRONTEND] Visible test cases count:', problem.testCases?.filter(tc => !tc.isHidden).length || 0);
        
        const payload = {
          code: code.trim(),
          language: selectedLanguage,
          problemId: problem.id,
          timeLimit: problem.timeLimit || 5000,
          memoryLimit: problem.memoryLimit || 256
        };

        console.log('[FRONTEND] Payload:', JSON.stringify(payload, null, 2));
        
              const response = await apiRequest("POST", "/api/problems/run", payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run code");
      }
      const data = await response.json();
      console.log('[FRONTEND] ✅ Received API response:', data);
      return data as RunCodeResponse;
      } catch (error) {
        console.error('[FRONTEND] ❌ Error running code:', error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to run code. Please try again.");
      }
    },
    onSuccess: (data: RunCodeResponse) => {
      console.log('[FRONTEND] 📝 Processing test results (RUN CODE):', data);
      
      // Check if the response has the expected structure
      if (!data || typeof data !== 'object') {
        console.error('[FRONTEND] ❌ Invalid response data:', data);
        setTestResults([]);
        toast({
          title: "Error",
          description: "Invalid response format from server",
          variant: "destructive",
        });
        return;
      }

      // Handle error response - check for specific error types
      if (data.success === false || data.error) {
        const errorMessage = data.error || data.message || "Unknown error occurred";
        console.error('[FRONTEND] ❌ API returned error:', errorMessage);
        
        // Check if it's an EOFError (input() related error)
        if (errorMessage.includes('EOFError') || errorMessage.includes('EOF when reading a line')) {
          setTestResults([]);
          toast({
            title: "Input Error",
            description: "Your code is trying to read input using input() but no input was provided. Make sure your code matches the expected input format for the problem.",
            variant: "destructive",
          });
          return;
        }
        
        // Check if it's a syntax error
        if (errorMessage.includes('SyntaxError') || errorMessage.includes('IndentationError')) {
          setTestResults([]);
          toast({
            title: "Syntax Error",
            description: "There's a syntax error in your code. Please check your code for any syntax issues.",
            variant: "destructive",
          });
          return;
        }
        
        // General error handling
        setTestResults([]);
        toast({
          title: "Execution Error",
          description: errorMessage.length > 100 ? "Code execution failed. Check the console for details." : errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Handle both array format (data.results) and single result format
      let resultsArray: any[] = [];
      
      if (data.results && Array.isArray(data.results)) {
        // Standard format with results array
        resultsArray = data.results;
      } else if (data.status || data.output !== undefined || data.error !== undefined) {
        // Single result format - convert to array
        console.log('[FRONTEND] 🔄 Converting single result to array format');
        resultsArray = [data];
      } else {
        console.error('[FRONTEND] ❌ Invalid results format:', data.results);
        console.log('[FRONTEND] Full response:', JSON.stringify(data, null, 2));
        
        setTestResults([]);
        toast({
          title: "Error",
          description: "Invalid test results format from server",
          variant: "destructive",
        });
        return;
      }
      
      console.log('[FRONTEND] 📋 Processing results array:', resultsArray);
      
      // Map backend results to frontend TestResult format
      const testResults: TestResult[] = resultsArray.map((result: any, index: number) => {
        const testCase = problem?.testCases?.filter(tc => !tc.isHidden)[index];
        
        // Ensure result is an object
        if (!result || typeof result !== 'object') {
          console.warn(`[FRONTEND] Invalid result at index ${index}:`, result);
          return {
            passed: false,
            output: "Invalid result format",
            expectedOutput: testCase?.expectedOutput || "N/A",
            isHidden: testCase?.isHidden || false,
            input: testCase?.input || "",
            runtime: 0,
            memory: 0,
            error: "Invalid result format from server"
          };
        }
        
        // Handle execution errors in results
        const hasRuntimeError = result.status === 'error' || result.status === 'runtime_error' || 
                               result.status === 'failed' || result.status === 'timeout' || // Add timeout status
                               (result.error && String(result.error).trim() !== '');
        
        const actualOutput = String(result.output || "").trim();
        const expectedOutput = String(result.expectedOutput || testCase?.expectedOutput || "").trim();
        
        // Check for timeout issues
        const isTimeout = result.runtime > (problem?.timeLimit || 5000) || result.status === 'timeout';
        
        // Check if output is truly empty or just "No output"
        const hasNoRealOutput = actualOutput === "" || actualOutput === "No output" || actualOutput === "null";
        
        // For single result format, we might not have expected output, so handle accordingly
        const outputMatches = !hasRuntimeError && !hasNoRealOutput && actualOutput === expectedOutput;
        
        // If this is a successful run but no expected output, consider it passed for now
        const isSuccessfulRun = result.status === 'success' && !hasRuntimeError && !isTimeout;
        const shouldPass = isSuccessfulRun && outputMatches;
        
        // Format error message for better readability
        let errorMessage = undefined;
        if (hasRuntimeError) {
          const rawError = String(result.error || "Runtime error");
          if (rawError.includes('EOFError') || rawError.includes('EOF when reading a line')) {
            errorMessage = "EOFError: Your code tried to read input but none was provided for this test case";
          } else if (rawError.includes('SyntaxError')) {
            errorMessage = "SyntaxError: Check your code syntax";
          } else if (rawError.includes('IndentationError')) {
            errorMessage = "IndentationError: Check your code indentation";
          } else if (rawError.includes('NameError')) {
            errorMessage = "NameError: Check for undefined variables";
          } else if (rawError.trim() === '') {
            errorMessage = result.status === 'error' ? "Runtime error occurred" : undefined;
          } else {
            errorMessage = rawError.length > 200 ? rawError.substring(0, 200) + "..." : rawError;
          }
        } else if (isTimeout) {
          errorMessage = `Time limit exceeded (${result.runtime}ms > ${problem?.timeLimit || 5000}ms)`;
        } else if (hasNoRealOutput && expectedOutput !== "" && expectedOutput !== "N/A") {
          errorMessage = "No output produced - your program may not be printing the result or there's an input/output issue";
        } else if (!shouldPass && expectedOutput !== "" && expectedOutput !== "N/A") {
          errorMessage = "Output doesn't match expected result";
        }
        
        return {
          passed: shouldPass,
          output: hasNoRealOutput ? "No output produced" : result.output,
          expectedOutput: result.expectedOutput || testCase?.expectedOutput || "N/A",
          isHidden: result.isHidden || testCase?.isHidden || false,
          input: result.input || testCase?.input || "",
          runtime: Math.max(0, Number(result.runtime) || 0),
          memory: Math.max(0, Number(result.memory) || 0),
          error: errorMessage
        };
      });

      console.log('[FRONTEND] ✅ Created test results:', testResults);
      setTestResults(testResults);
      setActiveTab("results");
      setIsSubmissionResults(false); // Reset to normal run results
      
      // Show appropriate toast based on results
      if (testResults.length === 0) {
        toast({
          title: "No Results",
          description: "No test results were returned",
          variant: "destructive",
        });
        return;
      }

      // Calculate statistics for visible tests only (since this is "Run Code")
      const visibleTests = testResults.filter(r => !r.isHidden);
      const totalVisibleTests = visibleTests.length;
      const passedVisibleTests = visibleTests.filter(r => r.passed).length;
      const failedVisibleTests = totalVisibleTests - passedVisibleTests;
      const hasExecutionErrors = testResults.some(r => r.error && (
        r.error.includes('EOFError') || 
        r.error.includes('SyntaxError') || 
        r.error.includes('IndentationError') ||
        r.error.includes('NameError')
      ));

      if (hasExecutionErrors) {
        toast({
          title: "Code Execution Issues",
          description: "Some test cases failed due to runtime errors. Check the results tab for details.",
          variant: "destructive",
        });
      } else if (failedVisibleTests === 0) {
        toast({
          title: "All Visible Test Cases Passed! 🎉",
          description: `Passed all ${totalVisibleTests} visible test cases. Click "Submit" to test against all cases including hidden ones.`,
        });
      } else {
        toast({
          title: "Some Visible Test Cases Failed",
          description: `Failed ${failedVisibleTests} out of ${totalVisibleTests} visible test cases. Fix these before submitting.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('[FRONTEND] ❌ Mutation error:', error);
      setTestResults([]);
      toast({
        title: "Error",
        description: error.message || "Failed to run code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const customInputExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) {
        throw new Error("Please write some code before executing");
      }

      if (!customInput.trim()) {
        throw new Error("Please provide custom input");
      }

      try {
        console.log('[FRONTEND] 🚀 Sending custom input execution request');
        console.log('[FRONTEND] Language:', selectedLanguage);
        console.log('[FRONTEND] Custom input:', customInput);
        
        const payload = {
          code: code.trim(),
          language: selectedLanguage,
          customInput: customInput.trim()
        };

        console.log('[FRONTEND] Custom input payload:', JSON.stringify(payload, null, 2));
        
        const response = await apiRequest("POST", "/api/problems/run-custom-input", payload);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to execute with custom input");
        }
        
        const data = await response.json();
        console.log('[FRONTEND] ✅ Received custom input execution response:', data);
        return data;
      } catch (error) {
        console.error('[FRONTEND] ❌ Error executing with custom input:', error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to execute with custom input. Please try again.");
      }
    },
    onSuccess: (data: any) => {
      console.log('[FRONTEND] 📝 Processing custom input execution results:', data);
      
      // Handle custom input execution results
      if (data.status === 'error' || data.error) {
        const errorMessage = data.error || "Execution failed";
        setTestResults([{
          passed: false,
          output: "",
          expectedOutput: "N/A",
          isHidden: false,
          input: data.input || customInput,
          runtime: data.runtime || 0,
          memory: data.memory || 0,
          error: errorMessage
        }]);
      } else {
        setTestResults([{
          passed: true,
          output: data.output || "",
          expectedOutput: "N/A",
          isHidden: false,
          input: data.input || customInput,
          runtime: data.runtime || 0,
          memory: data.memory || 0,
          error: undefined
        }]);
      }
      
      setActiveTab("results");
      setIsSubmissionResults(false);
      
      toast({
        title: data.status === 'error' ? "Custom Input Execution Failed" : "Custom Input Execution Successful",
        description: data.status === 'error' ? 
          "Check the results tab for error details" : 
          "Check the results tab for output",
        variant: data.status === 'error' ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      console.error('[FRONTEND] ❌ Custom input execution mutation error:', error);
      setTestResults([]);
      toast({
        title: "Error",
        description: error.message || "Failed to execute with custom input. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitCodeMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim()) {
        throw new Error("Please write some code before submitting");
      }

      if (!problem) {
        throw new Error("Problem data not loaded");
      }

      try {
        console.log('[FRONTEND] 🚀 Sending code submission request (SUBMIT CODE)');
        console.log('[FRONTEND] Language:', selectedLanguage);
        console.log('[FRONTEND] Total test cases count:', problem.testCases?.length || 0);
        
        const payload = {
          problemId: problem?.id ?? parseInt(id || "0"),
          code: code.trim(),
          language: selectedLanguage,
          ...(problemSetId && { problemSetId: problemSetId }),
          ...(problemInstanceId && { problemInstanceId: problemInstanceId })
        };

        console.log('[FRONTEND DEBUG] Payload:', JSON.stringify(payload, null, 2));
        console.log('[FRONTEND DEBUG] problemSetId from URL:', problemSetId);
        console.log('[FRONTEND DEBUG] problemInstanceId from URL:', problemInstanceId);
        
        const response = await apiRequest("POST", "/api/submissions", payload);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.log('[FRONTEND DEBUG] Submission error response:', errorData);
          throw new Error(errorData.message || errorData.error || "Submission failed");
        }
        
        const data = await response.json();
        console.log('[FRONTEND] ✅ Received submission response:', data);
        
        return data;
      } catch (error) {
        console.error('[FRONTEND] ❌ Error submitting code:', error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to submit code. Please try again.");
      }
    },
    onSuccess: (data: any) => {
      console.log('[FRONTEND] 📝 Processing submission results:', data);
      
      // Handle submission results - show only hidden test cases in HackerRank style
      if (data.results && Array.isArray(data.results)) {
        // Filter to only show hidden test cases for submission results
        const hiddenTestResults: TestResult[] = data.results
          .map((result: any, index: number) => {
            const testCase = problem?.testCases?.[index];
            
            const hasRuntimeError = result.status === 'error' || result.status === 'runtime_error' || 
                                   result.status === 'failed' || result.status === 'timeout' ||
                                   (result.error && String(result.error).trim() !== '');
            
            const actualOutput = String(result.output || "").trim();
            const expectedOutput = String(result.expectedOutput || testCase?.expectedOutput || "").trim();
            const isTimeout = result.runtime > (problem?.timeLimit || 5000) || result.status === 'timeout';
            const hasNoRealOutput = actualOutput === "" || actualOutput === "No output" || actualOutput === "null";
            const outputMatches = !hasRuntimeError && !hasNoRealOutput && actualOutput === expectedOutput;
            const isSuccessfulRun = result.status === 'success' && !hasRuntimeError && !isTimeout;
            const shouldPass = isSuccessfulRun && outputMatches;
            
            let errorMessage = undefined;
            if (hasRuntimeError) {
              const rawError = String(result.error || "Runtime error");
              if (rawError.includes('EOFError') || rawError.includes('EOF when reading a line')) {
                errorMessage = "EOFError: Your code tried to read input but none was provided for this test case";
              } else if (rawError.includes('SyntaxError')) {
                errorMessage = "SyntaxError: Check your code syntax";
              } else if (rawError.includes('IndentationError')) {
                errorMessage = "IndentationError: Check your code indentation";
              } else if (rawError.includes('NameError')) {
                errorMessage = "NameError: Check for undefined variables";
              } else if (rawError.trim() === '') {
                errorMessage = result.status === 'error' ? "Runtime error occurred" : undefined;
              } else {
                errorMessage = rawError.length > 200 ? rawError.substring(0, 200) + "..." : rawError;
              }
            } else if (isTimeout) {
              errorMessage = `Time limit exceeded (${result.runtime}ms > ${problem?.timeLimit || 5000}ms)`;
            } else if (hasNoRealOutput && expectedOutput !== "" && expectedOutput !== "N/A") {
              errorMessage = "No output produced - your program may not be printing the result or there's an input/output issue";
            } else if (!shouldPass && expectedOutput !== "" && expectedOutput !== "N/A") {
              errorMessage = "Output doesn't match expected result";
            }
            
            return {
              passed: shouldPass,
              output: hasNoRealOutput ? "No output produced" : result.output,
              expectedOutput: result.expectedOutput || testCase?.expectedOutput || "N/A",
              isHidden: result.isHidden || testCase?.isHidden || false,
              input: result.input || testCase?.input || "",
              runtime: Math.max(0, Number(result.runtime) || 0),
              memory: Math.max(0, Number(result.memory) || 0),
              error: errorMessage
            };
          })
          .filter((result: TestResult) => result.isHidden); // Only show hidden test cases

        setTestResults(hiddenTestResults);
        setActiveTab("results");
        setIsSubmissionResults(true);
        
        // Calculate statistics for hidden test cases only
        const totalHiddenTests = hiddenTestResults.length;
        const passedHiddenTests = hiddenTestResults.filter(r => r.passed).length;
        const failedHiddenTests = totalHiddenTests - passedHiddenTests;
        const hasExecutionErrors = hiddenTestResults.some(r => r.error && (
          r.error.includes('EOFError') || 
          r.error.includes('SyntaxError') || 
          r.error.includes('IndentationError') ||
          r.error.includes('NameError')
        ));

        if (hasExecutionErrors) {
          toast({
            title: "Code Execution Issues",
            description: "Some hidden test cases failed due to runtime errors. Check the results tab for details.",
            variant: "destructive",
          });
        } else if (failedHiddenTests === 0) {
          toast({
            title: "🎉 Congratulations! You solved this challenge!",
            description: `Passed all ${totalHiddenTests} hidden test cases!`,
          });
        } else {
          toast({
            title: "Some Hidden Test Cases Failed",
            description: `Failed ${failedHiddenTests} out of ${totalHiddenTests} hidden test cases.`,
            variant: "destructive",
          });
        }
      }

      // Update submissions list
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    },
    onError: (error: Error) => {
      console.error('[FRONTEND] ❌ Submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Problem not found</h1>
          <Link href="/problems">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Problems
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={"/problem-sets/" + (problemSetId || "")}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{problem.title}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <Badge className={getDifficultyColor(problem.difficulty)}>
                    {problem.difficulty}
                  </Badge>
                  {problem.tags && problem.tags.length > 0 && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {problem.tags.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Problem Description */}
        <div className={`${isFullscreen ? 'hidden' : 'w-1/2'} flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full justify-start border-b border-slate-200 dark:border-slate-700 px-6">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="results">Test Results</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="h-[calc(100vh-140px)] overflow-auto">
              <div className="p-6 prose max-w-none dark:prose-invert">
                <div 
                  className="text-slate-700 dark:text-slate-300 mb-6"
                  dangerouslySetInnerHTML={{ __html: problem.description }}
                />

                {problem.inputFormat && (
                  <>
                    <h4 className="font-semibold mb-2">Input Format:</h4>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                      {problem.inputFormat}
                    </div>
                  </>
                )}

                {problem.outputFormat && (
                  <>
                    <h4 className="font-semibold mb-2">Output Format:</h4>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                      {problem.outputFormat}
                    </div>
                  </>
                )}

                {problem.examples && problem.examples.length > 0 && (
                  <>
                    <h4 className="font-semibold mb-2">Examples:</h4>
                    {problem.examples.map((example, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4">
                        <div className="font-mono text-sm">
                          <div><strong>Input:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{example.input}</span></div>
                          <div><strong>Output:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{example.output}</span></div>
                          {example.explanation && (
                          <div><strong>Explanation:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{example.explanation}</span></div>
                          )}

                        </div>
                      </div>
                    ))}
                  </>
                )}

                {problem.constraints && (
                  <>
                    <h4 className="font-semibold mb-2">Constraints:</h4>
                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {problem.constraints}
                    </div>
                  </>
                )}

                {problem.timeLimit && problem.memoryLimit && (
                  <>
                    <h4 className="font-semibold mb-2">Limits:</h4>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <div>Time Limit: {problem.timeLimit}ms</div>
                      <div>Memory Limit: {problem.memoryLimit}MB</div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="results" className="h-[calc(100vh-140px)] overflow-auto">
              <div className="p-6 space-y-4">
                {/* HackerRank-style submission results */}
                {isSubmissionResults && testResults.length > 0 && (
                  <div className="text-center mb-8">
                    {testResults.every(r => r.passed) ? (
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-green-600 mb-2">
                          🎉 Congrats, you solved this challenge!
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                          All hidden test cases passed successfully.
                        </p>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-red-600 mb-2">
                          Some hidden test cases failed
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                          Check the details below to see what went wrong.
                        </p>
                      </div>
                    )}
                    
                    {/* HackerRank-style grid layout */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {testResults.map((result, index) => (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border-2 transition-all duration-500 ${
                            result.passed 
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              Test Case #{index}
                            </span>
                            {result.passed ? (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Runtime: {result.runtime}ms
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular detailed results (for run code or failed submissions) */}
                {(!isSubmissionResults || testResults.some(r => !r.passed)) && (
                  <>
                    {testResults.length > 0 && testResults.some(r => r.error && r.error.includes('EOFError')) && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <div className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                            💡 Input Reading Tip:
                          </div>
                        </div>
                        <div className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                          Your code is using <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">input()</code> to read data. 
                          Make sure your code reads input in the exact format specified in the problem description.
                          The input for each test case is provided automatically - you don't need to prompt for it.
                        </div>
                      </div>
                    )}

                    {testResults.length > 0 && testResults.some(r => r.output === "No output produced" || r.output === "No output") && (
                      <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <div className="text-red-600 dark:text-red-400 font-medium text-sm">
                            🚨 No Output Issue:
                          </div>
                        </div>
                        <div className="text-red-700 dark:text-red-300 text-sm mt-1">
                          Your code ran but didn't produce any output. This could be due to:
                          <ul className="list-disc ml-4 mt-2">
                            <li>Input/Output execution environment issues</li>
                            <li>Code not printing the result (missing <code className="bg-red-100 dark:bg-red-800 px-1 rounded">cout</code>, <code className="bg-red-100 dark:bg-red-800 px-1 rounded">print()</code>, etc.)</li>
                            <li>Program crashing silently or timing out</li>
                            <li>Input not being provided correctly to your program</li>
                          </ul>
                          <div className="mt-2 font-medium">Suggestion: Try submitting your code anyway - sometimes the execution environment has issues during testing but works fine during actual submission.</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Filter test results based on submission status */}
                    {(() => {
                      // For submission results, don't show hidden test case details
                      if (isSubmissionResults) {
                        // Only show visible test cases, or if all hidden tests passed, show none
                        const visibleResults = testResults.filter(r => !r.isHidden);
                        const hiddenResults = testResults.filter(r => r.isHidden);
                        const allHiddenPassed = hiddenResults.length > 0 && hiddenResults.every(r => r.passed);
                        
                        // If all hidden tests passed, show success message only
                        if (allHiddenPassed) {
                          return (
                            <div className="text-center py-8">
                              <div className="mb-4">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-green-600 mb-2">
                                  🎉 All Hidden Test Cases Passed!
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                  Your solution is correct and passed all hidden test cases.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        // If some hidden tests failed, show summary only (no details)
                        if (hiddenResults.some(r => !r.passed)) {
                          return (
                            <div className="text-center py-8">
                              <div className="mb-4">
                                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-red-600 mb-2">
                                  Some Hidden Test Cases Failed
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                  Your solution needs improvement. Hidden test case details are not shown.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        // Show only visible test cases
                        return visibleResults.map((result, index) => (
                          <div key={index} className="mb-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              {result.passed ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`font-medium ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
                                Test Case {index + 1}: {result.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>

                            <div className="space-y-4 text-sm">
                              <div>
                                <div className="font-medium text-slate-700 dark:text-slate-300">Input:</div>
                                <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-words font-mono">
                                  {result.input}
                                </pre>
                              </div>

                              <div>
                                <div className="font-medium text-slate-700 dark:text-slate-300">Your Output:</div>
                                <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-words font-mono">
                                  {result.output}
                                </pre>
                              </div>

                              {result.expectedOutput !== 'N/A' && (
                                <div>
                                  <div className="font-medium text-slate-700 dark:text-slate-300">Expected Output:</div>
                                  <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-words font-mono">
                                    {result.expectedOutput}
                                  </pre>
                                </div>
                              )}

                              {result.error && (
                                <div>
                                  <div className="font-medium text-red-500">Error:</div>
                                  <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded whitespace-pre-wrap break-words font-mono">
                                    {result.error}
                                  </pre>
                                </div>
                              )}

                              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Runtime: {result.runtime}ms | Memory: {result.memory}MB
                              </div>
                            </div>
                          </div>
                        ));
                      }
                      
                      // For run code results, show all test cases normally
                      return testResults.map((result, index) => (
                      <div key={index} className="mb-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          {result.passed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className={`font-medium ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
                            Test Case {index + 1}: {result.passed ? 'Passed' : 'Failed'}
                          </span>
                          {result.isHidden && (
                            <Badge variant="secondary" className="text-xs">Hidden</Badge>
                          )}
                        </div>

                        <div className="space-y-4 text-sm">
                          <div>
                            <div className="font-medium text-slate-700 dark:text-slate-300">Input:</div>
                            <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-words font-mono">
                              {result.input}
                            </pre>
                          </div>

                          <div>
                            <div className="font-medium text-slate-700 dark:text-slate-300">Your Output:</div>
                            <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-words font-mono">
                              {result.output}
                            </pre>
                          </div>

                          {!result.isHidden && result.expectedOutput !== 'N/A' && (
                            <div>
                              <div className="font-medium text-slate-700 dark:text-slate-300">Expected Output:</div>
                              <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-words font-mono">
                                {result.expectedOutput}
                              </pre>
                            </div>
                          )}

                          {result.error && (
                            <div>
                              <div className="font-medium text-red-500">Error:</div>
                              <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded whitespace-pre-wrap break-words font-mono">
                                {result.error}
                              </pre>
                            </div>
                          )}

                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Runtime: {result.runtime}ms | Memory: {result.memory}MB
                          </div>
                        </div>
                      </div>
                      ));
                    })()}
                  </>
                )}
                
                {testResults.length === 0 && (
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    Run your code to see test results
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Code Editor */}
        <div className={`${isFullscreen ? 'w-full' : 'w-1/2'} flex flex-col bg-white dark:bg-slate-800`}>
          {/* Editor Header */}
          <div className="border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="c">C</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center space-x-2"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative">
            <MonacoEditor
              value={code}
              onChange={setCode}
              language={selectedLanguage === "cpp" || selectedLanguage === 'c' ? "cpp" : selectedLanguage}
              height="100%"
              theme="vs-dark"
            />
          </div>

          {/* Custom Input Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                id="custom-input-checkbox"
                checked={useCustomInput}
                onChange={(e) => setUseCustomInput(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="custom-input-checkbox" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Use Custom Input
              </label>
            </div>
            
            {useCustomInput && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="custom-input-field" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Custom Input:
                  </label>
                  <textarea
                    id="custom-input-field"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter your custom input here..."
                    className="w-full h-20 p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                if (useCustomInput) {
                  customInputExecutionMutation.mutate();
                } else {
                  runCodeMutation.mutate();
                }
              }}
              disabled={runCodeMutation.isPending || customInputExecutionMutation.isPending || !problem || (useCustomInput && !customInput.trim())}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>
                {useCustomInput 
                  ? (customInputExecutionMutation.isPending ? "Executing..." : "Run with Custom Input")
                  : (runCodeMutation.isPending ? "Running..." : "Run Code")
                }
              </span>
            </Button>
            <Button
              onClick={() => submitCodeMutation.mutate()}
              disabled={submitCodeMutation.isPending}
              className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitCodeMutation.isPending ? "Submitting..." : "Submit"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}