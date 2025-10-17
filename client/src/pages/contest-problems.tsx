import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Play, Send, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MonacoEditor } from '@/components/MonacoEditor';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ContestProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  timeLimit: number;
  memoryLimit: number;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
    isHidden?: boolean;
    timeLimit?: number;
    memoryLimit?: number;
  }>;
  starterCode: Record<string, string>;
  originalProblemId?: string | number;
}

interface Contest {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  problems: ContestProblem[];
}

interface Submission {
  id: string;
  problemId: string;
  code: string;
  language: string;
  status: 'pending' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compilation_error';
  runtime?: number;
  memory?: number;
  submittedAt?: string; // client field
  submissionTime?: string; // server field
}

export default function ContestProblemsPage() {
  // Extend Document interface for fullscreen properties
  interface ExtendedDocument extends Document {
    webkitFullscreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }

  const extendedDocument = document as ExtendedDocument;

  const params = useParams() as any;
  const contestId = params.contestId as string;
  const initialProblemParam = params.problemId as string | undefined;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  const [selectedProblem, setSelectedProblem] = useState<ContestProblem | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('problem');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [contestProgress, setContestProgress] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [standings, setStandings] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsSubmission, setDetailsSubmission] = useState<Submission | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenDialog, setShowFullscreenDialog] = useState(false);
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");
  
  // Tab switch tracking state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
  const [isContestTerminated, setIsContestTerminated] = useState(false);
  
  // Contest ending confirmation dialog state
  const [showEndContestDialog, setShowEndContestDialog] = useState(false);
  
  // Refs for tab switching detection
  const wasVisibleRef = useRef(!document.hidden);
  const hasFocusRef = useRef(document.hasFocus());
  const lastSwitchTimeRef = useRef(Date.now());

  // Persist code per-problem locally so we can auto-submit for all
  useEffect(() => {
    if (!selectedProblem) return;
    const key = `contest:${contestId}:problem:${selectedProblem.id}:code`;
    try {
      localStorage.setItem(key, code);
    } catch {}
  }, [code, selectedProblem, contestId]);

  // Persist language per-problem locally for auto-submission
  useEffect(() => {
    if (!selectedProblem) return;
    const key = `contest:${contestId}:problem:${selectedProblem.id}:language`;
    try {
      localStorage.setItem(key, language);
    } catch {}
  }, [language, selectedProblem, contestId]);

  // Reset tab switch count when entering a new contest or refreshing page
  useEffect(() => {
    // Reset all tab switching state for new contest
    setTabSwitchCount(0);
    setShowTabSwitchDialog(false);
    setIsContestTerminated(false);
    
    // Reset refs
    wasVisibleRef.current = !document.hidden;
    hasFocusRef.current = document.hasFocus();
    lastSwitchTimeRef.current = Date.now();
    
    // Clear any existing localStorage data for this contest
    const key = `contest:${contestId}:tabSwitchCount`;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.log('Failed to clear tab switch count:', error);
    }
    
    console.log(`Tab switch count reset for new contest: ${contestId}`);
    console.log(`Initial state: isVisible=${!document.hidden}, hasFocus=${document.hasFocus()}`);
    
    // Cleanup function to reset tab switch count when leaving contest
    return () => {
      // If user navigates away from contest, reset the count
      const cleanupKey = `contest:${contestId}:tabSwitchCount`;
      try {
        localStorage.removeItem(cleanupKey);
        console.log(`Tab switch count cleaned up for contest: ${contestId}`);
      } catch (error) {
        console.log('Failed to cleanup tab switch count:', error);
      }
    };
  }, [contestId]);
  
  // Additional reset on page refresh/component mount
  useEffect(() => {
    // Ensure tab switch count is reset on page refresh
    if (contestId) {
    const key = `contest:${contestId}:tabSwitchCount`;
    try {
      localStorage.removeItem(key);
      console.log(`Tab switch count cleared on page refresh for contest: ${contestId}`);
    } catch (error) {
      console.log('Failed to clear tab switch count on refresh:', error);
    }
    }
  }, [contestId]); // Added contestId to dependencies



  // Check if we're in contest fullscreen mode
  useEffect(() => {
    const checkFullscreen = () => {
      const isInFullscreen = document.body.classList.contains('contest-fullscreen');
      setIsFullscreen(isInFullscreen);
    };

    // Check initially
    checkFullscreen();

    // Set up observer to watch for class changes
    const observer = new MutationObserver(checkFullscreen);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Listen for fullscreen change events
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !extendedDocument.webkitFullscreenElement && !extendedDocument.msFullscreenElement) {
        // User manually exited full-screen mode
        document.body.classList.remove('contest-fullscreen');
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Function to auto-submit all problems and terminate contest (for tab switching)
  // This will be defined after the required functions are declared

  // Function to handle contest ending with confirmation dialog
  const handleEndContest = () => {
    setShowEndContestDialog(true);
  };

  // Function to confirm contest ending and auto-submit code
  const confirmEndContest = async () => {
    try {
      // Call API to manually end the contest in the database
      const endContestResponse = await fetch(`/api/contests/${contestId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!endContestResponse.ok) {
        throw new Error('Failed to end contest');
      }

      const endContestResult = await endContestResponse.json();
      console.log('Contest ended successfully:', endContestResult);
      
      // Set localStorage flag for backward compatibility (can be removed later)
      const uid = localStorage.getItem('userId') || 'me';
      localStorage.setItem(`contest:${contestId}:endedBy:${uid}`, 'true');
      
      // Auto-submit only problems that haven't been submitted or aren't accepted
      const problemsToSubmit: Array<{problem: ContestProblem, code: string, language: string}> = [];
      
      if (contest?.problems) {
        for (const problem of contest.problems) {
          const codeKey = `contest:${contestId}:problem:${problem.id}:code`;
          const langKey = `contest:${contestId}:problem:${problem.id}:language`;
          
          try {
            const storedCode = localStorage.getItem(codeKey);
            const storedLang = localStorage.getItem(langKey) || 'javascript';
            
            if (storedCode && storedCode.trim()) {
              // Check if this problem has already been submitted (regardless of status)
              const currentStatus = getSubmissionStatus(problem.id);
              const hasSubmission = currentStatus !== null;
              
              // Only submit if:
              // 1. No submission exists yet, OR
              // 2. Submission exists but status is not 'accepted' AND we have new/modified code
              if (!hasSubmission) {
                problemsToSubmit.push({
                  problem,
                  code: storedCode,
                  language: storedLang
                });
                console.log(`Will submit problem ${problem.title} - no previous submission`);
              } else if (currentStatus !== 'accepted') {
                // Check if code has changed since last submission
                const lastSubmission = submissions?.find(s => s.problemId === problem.id);
                if (lastSubmission && lastSubmission.code !== storedCode) {
                  problemsToSubmit.push({
                    problem,
                    code: storedCode,
                    language: storedLang
                  });
                  console.log(`Will submit problem ${problem.title} - code modified since last submission (status: ${currentStatus})`);
                } else {
                  console.log(`Skipping problem ${problem.title} - already submitted with same code (status: ${currentStatus})`);
                }
              } else {
                console.log(`Skipping problem ${problem.title} - already accepted`);
              }
            }
          } catch (error) {
            console.error(`Failed to retrieve code for problem ${problem.id}:`, error);
          }
        }
      }
      
      // Submit only problems that need submission
      let submittedCount = 0;
      let skippedCount = 0;
      
      if (problemsToSubmit.length > 0) {
      for (const {problem, code, language} of problemsToSubmit) {
        try {
          const response = await fetch(`/api/contests/${contestId}/problems/${problem.id}/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              code,
              language,
              autoSubmitted: true,
            }),
          });
          
          if (response.ok) {
            submittedCount++;
            console.log(`Auto-submitted solution for problem: ${problem.title}`);
          } else {
            console.error(`Failed to auto-submit solution for problem: ${problem.title}`);
          }
        } catch (error) {
          console.error(`Error auto-submitting solution for problem ${problem.title}:`, error);
        }
        }
      } else {
        // Count how many problems were already accepted
        skippedCount = contest?.problems?.filter(problem => {
          const status = getSubmissionStatus(problem.id);
          return status === 'accepted';
        }).length || 0;
      }
      
      // Show appropriate message
      if (submittedCount > 0) {
        toast({
          title: 'Contest Ended Successfully',
          description: `${submittedCount} solution(s) submitted, ${skippedCount} already accepted.`,
          variant: 'default',
        });
      } else if (skippedCount > 0) {
        toast({
          title: 'Contest Ended',
          description: `All ${skippedCount} problems already accepted. No new submissions needed.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Contest Ended',
          description: 'No solutions to submit. Contest ended successfully.',
          variant: 'default',
        });
      }
      
      // Reset tab switch count for this contest (in case user re-enters)
      const tabSwitchKey = `contest:${contestId}:tabSwitchCount`;
      try {
        localStorage.removeItem(tabSwitchKey);
      } catch (error) {
        console.log('Failed to clear tab switch count:', error);
      }
      
      // Close dialog and exit contest
      setShowEndContestDialog(false);
      exitContestAndRedirect();
      
    } catch (error) {
      console.error('Error ending contest:', error);
      toast({
        title: 'Error Ending Contest',
        description: 'Failed to auto-submit solutions. Contest will still be ended.',
        variant: 'destructive',
      });
      
      // Still end contest even if auto-submission failed
      setShowEndContestDialog(false);
      exitContestAndRedirect();
    }
  };

  // Tab switch detection for contest pages - will be defined after terminateContestAndSubmit

  // Always disable right-click during the contest page lifecycle
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener('contextmenu', preventContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu, true);
    };
  }, []);

  // Detect full-screen exit and show dialog
  useEffect(() => {
    // Enhanced URL detection for contest pages
    const isContestPage = () => {
      const currentPath = window.location.pathname;
      const isContestProblemsListPage = /^\/contests\/[^\/]+\/problems\/?$/.test(currentPath);
      const isSpecificProblemPage = /^\/contests\/[^\/]+\/problems\/[^\/]+\/?$/.test(currentPath);
      return isContestProblemsListPage || isSpecificProblemPage;
    };

    // Automatically add contest-fullscreen class if we're on a contest page
    const ensureContestClass = () => {
      const isOnContestPage = isContestPage();
      if (isOnContestPage && !document.body.classList.contains('contest-fullscreen')) {
        console.log('Automatically adding contest-fullscreen class for contest page');
        document.body.classList.add('contest-fullscreen');
      }
    };

    // Check and add class immediately
    ensureContestClass();

    const handleFullscreenChange = () => {
      const hasContestClass = document.body.classList.contains('contest-fullscreen');
      const isInFullscreen = document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement;
      const isOnContestPage = isContestPage();
      
      console.log('Full-screen change detected:', {
        hasContestClass,
        isInFullscreen,
        isOnContestPage,
        currentPath: window.location.pathname
      });
      
      if (hasContestClass && !isInFullscreen && isOnContestPage) {
        console.log('Full-screen mode exited on contest page, showing dialog...');
        setShowFullscreenDialog(true);
        setIsFullscreen(false);
      } else if (hasContestClass && isInFullscreen && isOnContestPage) {
        console.log('Full-screen mode entered on contest page, hiding dialog...');
        setShowFullscreenDialog(false);
        setIsFullscreen(true);
      }
    };

    // Check initial state
    const hasContestClass = document.body.classList.contains('contest-fullscreen');
    const isInFullscreen = document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement;
    const isOnContestPage = isContestPage();
    
    console.log('Initial full-screen check:', {
      hasContestClass,
      isInFullscreen,
      isOnContestPage,
      currentPath: window.location.pathname
    });
    
    if (hasContestClass && !isInFullscreen && isOnContestPage) {
      console.log('Initial check: Full-screen not active on contest page, showing dialog...');
      setShowFullscreenDialog(true);
      setIsFullscreen(false);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // Also check when URL changes (user navigates between contest pages)
    const checkFullscreenOnUrlChange = () => {
      // Ensure contest class is present
      ensureContestClass();
      
      const hasContestClass = document.body.classList.contains('contest-fullscreen');
      const isInFullscreen = document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement;
      const isOnContestPage = isContestPage();
      
      console.log('URL change detected, checking full-screen status:', {
        hasContestClass,
        isInFullscreen,
        isOnContestPage,
        currentPath: window.location.pathname
      });
      
      if (hasContestClass && !isInFullscreen && isOnContestPage) {
        console.log('URL change: Full-screen not active on contest page, showing dialog...');
        setShowFullscreenDialog(true);
        setIsFullscreen(false);
      }
    };

    // Check immediately and also on URL changes
    checkFullscreenOnUrlChange();
    
    // Also listen for popstate (back/forward buttons) and hashchange
    window.addEventListener('popstate', ensureContestClass);
    window.addEventListener('hashchange', ensureContestClass);
    
    // Periodic check every 500ms to catch any missed full-screen exits
    const periodicCheck = setInterval(() => {
      // Ensure contest class is present
      ensureContestClass();
      
      const hasContestClass = document.body.classList.contains('contest-fullscreen');
      const isInFullscreen = document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement;
      const isOnContestPage = isContestPage();
      
      if (hasContestClass && !isInFullscreen && isOnContestPage && !showFullscreenDialog) {
        console.log('Periodic check: Full-screen not active on contest page, showing dialog...');
        setShowFullscreenDialog(true);
        setIsFullscreen(false);
      }
    }, 500);
    
    // Listen for focus and visibility changes (alt-tab, browser switching)
    const handleFocusAndVisibility = () => {
      // Ensure contest class is present
      ensureContestClass();
      
      const hasContestClass = document.body.classList.contains('contest-fullscreen');
      const isInFullscreen = document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement;
      const isOnContestPage = isContestPage();
      
      if (hasContestClass && !isInFullscreen && isOnContestPage && !showFullscreenDialog) {
        console.log('Focus/Visibility change: Full-screen not active on contest page, showing dialog...');
        setShowFullscreenDialog(true);
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('focus', handleFocusAndVisibility);
    document.addEventListener('visibilitychange', handleFocusAndVisibility);
    
    // Listen for URL changes (navigation between contest pages)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkFullscreenOnUrlChange, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkFullscreenOnUrlChange, 0);
    };

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      
      // Clear periodic check
      clearInterval(periodicCheck);
      
      // Remove focus and visibility listeners
      window.removeEventListener('focus', handleFocusAndVisibility);
      document.removeEventListener('visibilitychange', handleFocusAndVisibility);
      
      // Remove navigation listeners
      window.removeEventListener('popstate', ensureContestClass);
      window.removeEventListener('hashchange', ensureContestClass);
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Disable copy-paste globally when in contest fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;

    const preventCopyPaste = (e: KeyboardEvent | ClipboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+X and block Escape/F11 in contest mode
      if (e instanceof KeyboardEvent) {
        const isCtrlCombo = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x');
        const isEscape = e.key === 'Escape' || e.key === 'Esc';
        const isF11 = e.key === 'F11';
        if (isCtrlCombo || isEscape || isF11) {
          e.preventDefault();
          e.stopPropagation();

          if (isCtrlCombo) {
            toast({
              title: 'Copy/Paste Disabled',
              description: 'Copy and paste operations are disabled during contest mode to prevent plagiarism.',
              variant: 'destructive'
            });
          } else if (isEscape) {
            toast({
              title: 'Escape Disabled',
              description: 'Exiting or closing with Escape is disabled during contest mode.',
              variant: 'destructive'
            });
          } else if (isF11) {
            // Best-effort block; some browsers may not allow preventing F11
            toast({
              title: 'Fullscreen Toggle Disabled',
              description: 'Toggling fullscreen with F11 is disabled during contest mode.',
              variant: 'destructive'
            });
          }

          return false;
        }
      }
      
      // Prevent paste events
      if (e instanceof ClipboardEvent) {
        e.preventDefault();
        e.stopPropagation();
        
        // Show toast notification
        toast({
          title: 'Paste Disabled',
          description: 'Paste operations are disabled during contest mode to prevent plagiarism.',
          variant: 'destructive'
        });
        
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('keydown', preventCopyPaste, true);
    document.addEventListener('copy', preventCopyPaste, true);
    document.addEventListener('paste', preventCopyPaste, true);
    document.addEventListener('cut', preventCopyPaste, true);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', preventCopyPaste, true);
      document.removeEventListener('copy', preventCopyPaste, true);
      document.removeEventListener('paste', preventCopyPaste, true);
      document.removeEventListener('cut', preventCopyPaste, true);
    };
  }, [isFullscreen, toast]);

  // Always disable F12 (DevTools) during the contest page lifecycle
  useEffect(() => {
    const preventDevTools = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        toast({
          title: 'Developer Tools Disabled',
          description: 'Opening DevTools (F12) is disabled during the contest.',
          variant: 'destructive'
        });
        return false;
      }
    };

    document.addEventListener('keydown', preventDevTools, true);

    return () => {
      document.removeEventListener('keydown', preventDevTools, true);
    };
  }, [toast]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Remove contest-fullscreen class when component unmounts
      document.body.classList.remove('contest-fullscreen');
      
      // Exit full-screen mode if still active
      if (document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (extendedDocument.webkitExitFullscreen) {
          extendedDocument.webkitExitFullscreen();
        } else if (extendedDocument.msExitFullscreen) {
          extendedDocument.msExitFullscreen();
        }
      }
    };
  }, []);

  // Function to enter full-screen mode
  const enterFullscreen = async () => {
    try {
      const elem: any = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      document.body.classList.add('contest-fullscreen');
      setShowFullscreenDialog(false);
      setIsFullscreen(true);
    } catch (err) {
      console.error('Failed to enter full-screen mode:', err);
      toast({
        title: 'Full-Screen Error',
        description: 'Failed to enter full-screen mode. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Function to exit full-screen mode and redirect to contests page
  const exitContestAndRedirect = () => {
    // Remove the contest-fullscreen class from body
    document.body.classList.remove('contest-fullscreen');
    
    // Exit full-screen mode if browser supports it
    if (document.fullscreenElement || extendedDocument.webkitFullscreenElement || extendedDocument.msFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (extendedDocument.webkitExitFullscreen) {
        extendedDocument.webkitExitFullscreen();
      } else if (extendedDocument.msExitFullscreen) {
        extendedDocument.msExitFullscreen();
      }
    }
    
    // Redirect to contests page
    setLocation('/contests');
  };

  // When contest time expires, auto-submit code for all problems once
  useEffect(() => {
    // contest is declared below; guard until it exists via typeof check on window to avoid TDZ
    const hasContest = typeof contest !== 'undefined' && contest !== null as any;
    if (!hasContest || autoSubmitted) return;
    if (timeLeftMs !== null && timeLeftMs <= 0) {
      (async () => {
        try {
          for (const problem of (contest as any).problems || []) {
            const key = `contest:${contestId}:problem:${problem.id}:code`;
            const savedCode = localStorage.getItem(key) || code;
            if (!savedCode) continue;
            try {
              await fetch(`/api/contests/${contestId}/problems/${problem.id}/submit`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ code: savedCode, language })
              });
            } catch (e) {
              console.error('Auto-submit failed for problem', problem.id, e);
            }
          }
          setAutoSubmitted(true);
          toast({ title: 'Contest Ended', description: 'Your code has been auto-submitted.' });
          
          // Reset tab switch count for this contest (in case user re-enters)
          const tabSwitchKey = `contest:${contestId}:tabSwitchCount`;
          try {
            localStorage.removeItem(tabSwitchKey);
          } catch (error) {
            console.log('Failed to clear tab switch count:', error);
          }
          
          // Exit full-screen mode and redirect after auto-submit
          setTimeout(() => {
            exitContestAndRedirect();
          }, 2000); // Give user 2 seconds to see the toast
        } catch (err) {
          console.error('Auto-submit batch failed', err);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, autoSubmitted, code, language, contestId]);

  const formatTimeLeft = (ms?: number | null) => {
    if (!ms && ms !== 0) return '';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  // Fetch contest details
  const { data: contest, isLoading, error: contestError } = useQuery<Contest>({
    queryKey: ['/api/contests', contestId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch contest details');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message === 'Authentication required') {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch user enrollment status to check if disqualified
  const { data: enrollmentStatus } = useQuery({
    queryKey: ['/api/contests', contestId, 'participants', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/participants/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        return null; // User not enrolled
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
    retry: false,
  });

  // Fetch user submissions
  const { data: submissions, isFetching: isFetchingSubmissions } = useQuery<Submission[]>({
    queryKey: ['/api/contests', contestId, 'submissions'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch submissions');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
    refetchInterval: activeTab === 'submissions' ? 2000 : false,
    refetchOnWindowFocus: activeTab === 'submissions',
    refetchOnReconnect: activeTab === 'submissions',
    refetchOnMount: activeTab === 'submissions',
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message === 'Authentication required') {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Track a pending loading state after Submit until the next submissions refetch settles
  const [submissionsLoadPending, setSubmissionsLoadPending] = useState(false);
  useEffect(() => {
    if (submissionsLoadPending && !isFetchingSubmissions) {
      setSubmissionsLoadPending(false);
    }
  }, [isFetchingSubmissions, submissionsLoadPending]);

  // Fetch contest progress
  const { data: progress } = useQuery({
    queryKey: ['/api/contests', contestId, 'progress'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch progress');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
  });

  // Fetch leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ['/api/contests', contestId, 'leaderboard'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch leaderboard');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
  });

  // Establish a 1s ticking timer once contest is known
  useEffect(() => {
    if (!contest) return;
    const end = new Date(contest.endTime).getTime();
    const computeLeft = () => Math.max(0, end - Date.now());
    setTimeLeftMs(computeLeft());
    const interval = setInterval(() => setTimeLeftMs(computeLeft()), 1000);
    return () => clearInterval(interval);
  }, [contest]);

  // Fetch announcements
  const { data: announcementsData } = useQuery({
    queryKey: ['/api/contests', contestId, 'announcements'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/announcements`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch announcements');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
  });

  // If a specific problemId is present in URL, select it when contest loads
  useEffect(() => {
    if (!contest || !initialProblemParam) return;
    const target = contest.problems.find(p => p.id === initialProblemParam);
    if (target) {
      setSelectedProblem(target);
      const starterCode = target.starterCode || {};
      setCode(
        starterCode[language] ||
        (language === 'c' ? (starterCode['c'] || starterCode['cpp']) : undefined) ||
        starterCode['cpp'] ||
        starterCode['javascript'] ||
        starterCode['python'] ||
        ''
      );
      // Add class to body to support fullscreen view without nav (for safety if route still uses layout)
      document.body.classList.add('contest-fullscreen');
      return () => { document.body.classList.remove('contest-fullscreen'); };
    }
  }, [contest, initialProblemParam, language]);

  // Update code when problem or language changes
  useEffect(() => {
    if (selectedProblem) {
      console.log('Selected problem data:', {
        id: selectedProblem.id,
        title: selectedProblem.title,
        hasDescription: !!selectedProblem.description,
        hasExamples: !!selectedProblem.examples,
        hasStarterCode: !!selectedProblem.starterCode,
        description: selectedProblem.description?.substring(0, 100) + '...',
        examplesCount: selectedProblem.examples?.length || 0,
        starterCodeKeys: selectedProblem.starterCode ? Object.keys(selectedProblem.starterCode) : []
      });
      const starterCode = selectedProblem.starterCode || {};
      setCode(
        starterCode[language] ||
        (language === 'c' ? (starterCode['c'] || starterCode['cpp']) : undefined) ||
        starterCode['cpp'] ||
        starterCode['javascript'] ||
        starterCode['python'] ||
        ''
      );
    }
  }, [selectedProblem, language]);

  // Submit solution mutation
  const submitMutation = useMutation({
    mutationFn: async ({ problemId, code, language }: { problemId: string; code: string; language: string }) => {
      const response = await fetch(`/api/contests/${contestId}/problems/${problemId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code, language }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit solution');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Solution Submitted',
        description: 'Your solution has been submitted successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'submissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Run code mutation
  const runCodeMutation = useMutation({
    mutationFn: async ({ code, language }: { code: string; language: string }) => {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          code, 
          language,
          input: selectedProblem?.examples?.[0]?.input || ''
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to run code');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Code Executed',
        description: `Output: ${data.output}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Custom input execution mutation
  const customInputExecutionMutation = useMutation({
    mutationFn: async ({ code, language, customInput }: { code: string; language: string; customInput: string }) => {
      const response = await fetch('/api/contests/run-custom-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          code, 
          language,
          customInput
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute with custom input');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🎯 [CONTEST-CUSTOM-INPUT] Execution result:', data);
      if (data.status === 'error' || data.error) {
        toast({
          title: 'Custom Input Execution Failed',
          description: data.error || 'Execution failed',
          variant: 'destructive',
        });
        
        // Show error in Test Results tab
        const errorResult = {
          input: customInput,
          output: '',
          expectedOutput: 'Custom Input Test',
          passed: false,
          runtime: data.runtime || 0,
          memory: data.memory || 0,
          error: data.error || 'Execution failed',
          isCustomInput: true
        } as any;
        // Clear previous results and show only custom input result
        setTestResults([errorResult]);
        setShowTestResults(true);
        setActiveTab('results');
      } else {
        toast({
          title: 'Custom Input Execution Successful',
          description: `Output: ${data.output || 'No output'}`,
        });
        
        // Show success result in Test Results tab
        const successResult = {
          input: customInput,
          output: data.output || 'No output',
          expectedOutput: 'Custom Input Test',
          passed: true,
          runtime: data.runtime || 0,
          memory: data.memory || 0,
          error: null,
          isCustomInput: true
        } as any;
        // Clear previous results and show only custom input result
        setTestResults([successResult]);
        setShowTestResults(true);
        setActiveTab('results');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRunCode = async () => {
    if (!selectedProblem || !code.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a problem and write some code first.',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    try {
      console.log(`🚀 [CONTEST-RUN] Running code for problem: ${selectedProblem.title}`);
      console.log(`📝 [CONTEST-RUN] Language: ${language}`);
      console.log(`📝 [CONTEST-RUN] Code length: ${code.length} characters`);
      
      // Get the first example as test input
      console.log(`🔍 [CONTEST-RUN] Problem examples:`, selectedProblem.examples);
      console.log(`🔍 [CONTEST-RUN] First example:`, selectedProblem.examples?.[0]);
      console.log(`🔍 [CONTEST-RUN] Problem testCases:`, selectedProblem.testCases);
      
      // Try to get input from examples first, then testCases
      let testInput = selectedProblem.examples?.[0]?.input || '';
      if (!testInput && selectedProblem.testCases?.[0]?.input) {
        testInput = selectedProblem.testCases[0].input;
      }
      
      console.log(`📥 [CONTEST-RUN] Test input: "${testInput}"`);
      
      // If no test input, provide a default for testing
      if (!testInput) {
        console.log(`⚠️ [CONTEST-RUN] No test input found, using default`);
        // For reverse string problem, use a simple test case
        if (selectedProblem.title.toLowerCase().includes('reverse')) {
          testInput = "hello";
        } else {
          testInput = "test";
        }
      }
      
      const response = await fetch('/api/contests/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          code,
          language,
          input: testInput,
        }),
      });

      console.log(`📊 [CONTEST-RUN] Response status: ${response.status}`);
      const result = await response.json();
      console.log(`📤 [CONTEST-RUN] Execution result:`, result);

      if (result.error) {
        console.error(`❌ [CONTEST-RUN] Execution error: ${result.error}`);
        // Surface the error inside Test Results tab
        const errorResult = {
          input: testInput,
          output: '',
          expectedOutput: '',
          passed: false,
          runtime: result.runtime,
          memory: result.memory,
          error: result.error,
        } as any;
        setTestResults([errorResult]);
        setShowTestResults(true);
        setActiveTab('results');
      } else {
        // Try to get expected output from testCases first, then examples
        let expectedOutput = '';
        if (selectedProblem.testCases?.[0]?.expectedOutput) {
          expectedOutput = selectedProblem.testCases[0].expectedOutput;
        } else if (selectedProblem.examples?.[0]?.output) {
          expectedOutput = selectedProblem.examples[0].output;
        }
        
        const isCorrect = result.output.trim() === expectedOutput.trim();
        
        console.log(`✅ [CONTEST-RUN] Test ${isCorrect ? 'PASSED' : 'FAILED'}`);
        console.log(`📊 [CONTEST-RUN] Expected: "${expectedOutput}", Got: "${result.output}"`);
        
        // Store test results for display
        const testResult = {
          input: testInput,
          output: result.output,
          expectedOutput: expectedOutput,
          passed: isCorrect,
          runtime: result.runtime,
          memory: result.memory,
          error: result.error
        } as any;
        
        setTestResults([testResult]);
        setShowTestResults(true);
        setActiveTab('results');
        
        toast({
          title: isCorrect ? 'Test Passed!' : 'Test Failed',
          description: isCorrect 
            ? `Output matches expected result: ${result.output}`
            : `Expected: ${expectedOutput}, Got: ${result.output}`,
          variant: isCorrect ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Execution Error',
        description: 'Failed to run code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem || !code.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a problem and write some code first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/contests/${contestId}/problems/${selectedProblem.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit solution');
      }

      const result = await response.json();
      
      // Show appropriate toast based on actual test results
      if (result.allPassed) {
      toast({
          title: 'All Test Cases Passed! 🎉',
          description: `Your solution is correct! ${result.passedCount}/${result.totalTestCases} test cases passed.`,
          variant: 'default',
        });
      } else if (result.passedCount > 0) {
        toast({
          title: 'Partial Credit',
          description: `${result.passedCount}/${result.totalTestCases} test cases passed. Score: ${result.points} points.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Wrong Answer',
          description: `0/${result.totalTestCases} test cases passed. Please check your solution.`,
          variant: 'destructive',
        });
      }

      // Store test results for display in Test Results tab
      if (result.testResults && Array.isArray(result.testResults)) {
        const formattedTestResults = result.testResults.map((testResult: any) => ({
          passed: testResult.passed,
          output: testResult.actualOutput || testResult.output || 'No output',
          expectedOutput: testResult.expectedOutput || 'N/A',
          input: testResult.input || 'N/A',
          runtime: testResult.runtime || 0,
          memory: testResult.memory || 0,
          error: testResult.error || null,
          isHidden: testResult.isHidden || false,
          testCaseNumber: testResult.testCaseNumber || 1
        }));
        setTestResults(formattedTestResults);
        setShowTestResults(true);
        setActiveTab('results'); // Automatically switch to Test Results tab
      }

      // If accepted, refresh progress so solved indicator and button update
      if (result.status === 'accepted') {
        queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'progress'] });
      }

      // Show latest submission details automatically
      setDetailsSubmission(result);
      setIsDetailsOpen(true);
      setActiveTab('submissions');

      // Refresh submissions
      setSubmissionsLoadPending(true);
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'submissions'] });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit solution',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubmissionStatus = (problemId: string) => {
    const problemSubmissions = submissions?.filter(s => s.problemId === problemId) || [];
    const latestSubmission = problemSubmissions.sort((a, b) => {
      const bt = new Date((b.submittedAt || b.submissionTime || 0) as any).getTime();
      const at = new Date((a.submittedAt || a.submissionTime || 0) as any).getTime();
      return bt - at;
    })[0];
    
    return latestSubmission?.status || null;
  };

  // Function to auto-submit all problems and terminate contest (for tab switching)
  const terminateContestAndSubmit = useCallback(async () => {
    if (isContestTerminated) return; // Prevent multiple calls
    
    setIsContestTerminated(true);
    
    try {
      // Mark this contest as ended for the current user so listings reflect the state
      try {
        const uid = localStorage.getItem('userId') || 'me';
        localStorage.setItem(`contest:${contestId}:endedBy:${uid}`, 'true');
      } catch (e) {
        console.warn('Failed to set endedBy flag in localStorage:', e);
      }

      // Get all problems that have been worked on (have code in localStorage)
      const problemsToSubmit: Array<{problem: ContestProblem, code: string, language: string}> = [];
      
      if (contest?.problems) {
        for (const problem of contest.problems) {
          const codeKey = `contest:${contestId}:problem:${problem.id}:code`;
          const langKey = `contest:${contestId}:problem:${problem.id}:language`;
          
          try {
            const storedCode = localStorage.getItem(codeKey);
            const storedLang = localStorage.getItem(langKey) || 'javascript';
            
            if (storedCode && storedCode.trim()) {
              // Check if this problem has already been submitted (regardless of status)
              const currentStatus = getSubmissionStatus(problem.id);
              const hasSubmission = currentStatus !== null;
              
              // Only submit if:
              // 1. No submission exists yet, OR
              // 2. Submission exists but status is not 'accepted' AND we have new/modified code
              if (!hasSubmission) {
                problemsToSubmit.push({
                  problem,
                  code: storedCode,
                  language: storedLang
                });
                console.log(`Will auto-submit problem ${problem.title} - no previous submission`);
              } else if (currentStatus !== 'accepted') {
                // Check if code has changed since last submission
                const lastSubmission = submissions?.find(s => s.problemId === problem.id);
                if (lastSubmission && lastSubmission.code !== storedCode) {
                  problemsToSubmit.push({
                    problem,
                    code: storedCode,
                    language: storedLang
                  });
                  console.log(`Will auto-submit problem ${problem.title} - code modified since last submission (status: ${currentStatus})`);
                } else {
                  console.log(`Skipping auto-submission for problem ${problem.title} - already submitted with same code (status: ${currentStatus})`);
                }
              } else {
                console.log(`Skipping auto-submission for problem ${problem.title} - already accepted`);
              }
            }
          } catch (error) {
            console.error(`Failed to retrieve code for problem ${problem.id}:`, error);
          }
        }
      }
      
      // Auto-submit only problems that need submission
      let submittedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      
      console.log(`[AUTO-SUBMIT] Found ${problemsToSubmit.length} problems to submit`);
      
      if (problemsToSubmit.length > 0) {
        for (const {problem, code, language} of problemsToSubmit) {
          try {
            console.log(`[AUTO-SUBMIT] Submitting problem: ${problem.title} (${problem.id})`);
            console.log(`[AUTO-SUBMIT] Code length: ${code.length} characters`);
            console.log(`[AUTO-SUBMIT] Language: ${language}`);
            
            const response = await fetch(`/api/contests/${contestId}/problems/${problem.id}/auto-submit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                code,
                language,
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              submittedCount++;
              console.log(`[AUTO-SUBMIT] Successfully submitted solution for problem: ${problem.title}`, result);
            } else {
              const errorText = await response.text();
              failedCount++;
              console.error(`[AUTO-SUBMIT] Failed to auto-submit solution for problem: ${problem.title}`, {
                status: response.status,
                statusText: response.statusText,
                error: errorText
              });
            }
          } catch (error) {
            failedCount++;
            console.error(`[AUTO-SUBMIT] Error auto-submitting solution for problem ${problem.title}:`, error);
          }
        }
      } else {
        // Count how many problems were already accepted
        skippedCount = contest?.problems?.filter(problem => {
          const status = getSubmissionStatus(problem.id);
          return status === 'accepted';
        }).length || 0;
        console.log(`[AUTO-SUBMIT] No problems to submit. ${skippedCount} problems already accepted.`);
      }
      
      console.log(`[AUTO-SUBMIT] Summary: ${submittedCount} submitted, ${failedCount} failed, ${skippedCount} already accepted`);
      
      // Show completion message
      if (submittedCount > 0) {
        const message = failedCount > 0 
          ? `You have been disqualified due to excessive tab switching. ${submittedCount} solution(s) auto-submitted, ${failedCount} failed, ${skippedCount} already accepted.`
          : `You have been disqualified due to excessive tab switching. ${submittedCount} solution(s) auto-submitted, ${skippedCount} already accepted.`;
        
        toast({
          title: 'Contest Terminated - Disqualified',
          description: message,
          variant: 'destructive',
        });
      } else if (skippedCount > 0) {
        toast({
          title: 'Contest Terminated - Disqualified',
          description: `You have been disqualified due to excessive tab switching. All ${skippedCount} problems already accepted.`,
          variant: 'destructive',
        });
      } else if (failedCount > 0) {
        toast({
          title: 'Contest Terminated - Disqualified',
          description: `You have been disqualified due to excessive tab switching. Failed to submit ${failedCount} solution(s).`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Contest Terminated - Disqualified',
          description: 'You have been disqualified due to excessive tab switching. No solutions to submit.',
          variant: 'destructive',
        });
      }
      
      // Now update the user's contest status in the database (after submissions are complete)
      try {
        const endUserResponse = await fetch(`/api/contests/${contestId}/end-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (endUserResponse.ok) {
          console.log('User contest status updated in database due to tab switching');
        } else {
          console.warn('Failed to update user contest status in database:', await endUserResponse.text());
        }
      } catch (error) {
        console.warn('Error updating user contest status in database:', error);
      }
      
      // Reset tab switch count for this contest (in case user re-enters)
      const tabSwitchKey = `contest:${contestId}:tabSwitchCount`;
      try {
        localStorage.removeItem(tabSwitchKey);
      } catch (error) {
        console.log('Failed to clear tab switch count:', error);
      }
      
      // Wait a moment then redirect
      setTimeout(() => {
        exitContestAndRedirect();
      }, 3000);
      
    } catch (error) {
      console.error('Error during contest termination:', error);
      toast({
        title: 'Contest Termination Error',
        description: 'Failed to auto-submit solutions. Contest will still be terminated.',
        variant: 'destructive',
      });
      
      // Still redirect even if auto-submission failed
      setTimeout(() => {
        exitContestAndRedirect();
      }, 2000);
    }
  }, [isContestTerminated, contestId, contest, getSubmissionStatus, submissions, toast, exitContestAndRedirect]);

  // Tab switch detection for contest pages
  useEffect(() => {
    // Check if we're on a contest page using regex
    const isContestPage = () => {
      const currentPath = window.location.pathname;
      return /^\/contests\/[^\/]+\/problems(?:\/[^\/]+)?$/.test(currentPath);
    };

    if (!isContestPage() || isContestTerminated) {
      return; // Only track on contest pages and if contest isn't already terminated
    }

    // Use the refs defined at component level

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const currentlyHasFocus = document.hasFocus();
      
      // Only count as a switch if enough time has passed (prevent rapid firing)
      const now = Date.now();
      if (now - lastSwitchTimeRef.current < 500) {
        return;
      }
      
      // Detect when user comes back to the tab (was hidden/unfocused, now visible/focused)
      if ((!wasVisibleRef.current || !hasFocusRef.current) && (isVisible && currentlyHasFocus)) {
        // User returned to contest tab - increment counter and show dialog
        setTabSwitchCount(prevCount => {
          const newCount = prevCount + 1;
          
          console.log(`Tab switch detected via visibility change. Count: ${newCount}`);
          console.log(`Previous state: wasVisible=${wasVisibleRef.current}, hadFocus=${hasFocusRef.current}`);
          console.log(`Current state: isVisible=${isVisible}, hasFocus=${currentlyHasFocus}`);
          
          if (newCount >= 3) {
            // Terminate contest immediately
            console.log('Contest terminated due to excessive tab switching');
            terminateContestAndSubmit();
          } else {
            // Show warning dialog
            setShowTabSwitchDialog(true);
          }
          
          return newCount;
        });
        
        lastSwitchTimeRef.current = now;
      }
      
      wasVisibleRef.current = isVisible;
      hasFocusRef.current = currentlyHasFocus;
    };

    const handleFocus = () => {
      const isVisible = !document.hidden;
      const currentlyHasFocus = true; // Focus event means we have focus
      
      // Only count as a switch if enough time has passed
      const now = Date.now();
      if (now - lastSwitchTimeRef.current < 500) {
        return;
      }
      
      // Detect when user comes back to the tab
      if ((!wasVisibleRef.current || !hasFocusRef.current) && (isVisible && currentlyHasFocus)) {
        setTabSwitchCount(prevCount => {
          const newCount = prevCount + 1;
          
          console.log(`Tab switch detected via focus. Count: ${newCount}`);
          console.log(`Previous state: wasVisible=${wasVisibleRef.current}, hadFocus=${hasFocusRef.current}`);
          console.log(`Current state: isVisible=${isVisible}, hasFocus=${currentlyHasFocus}`);
          
          if (newCount >= 3) {
            console.log('Contest terminated due to excessive tab switching');
            terminateContestAndSubmit();
          } else {
            setShowTabSwitchDialog(true);
          }
          
          return newCount;
        });
        
        lastSwitchTimeRef.current = now;
      }
      
      wasVisibleRef.current = isVisible;
      hasFocusRef.current = currentlyHasFocus;
    };

    const handleBlur = () => {
      hasFocusRef.current = false;
      console.log('Tab lost focus - user switched away');
    };

    const handlePageHide = () => {
      wasVisibleRef.current = false;
      console.log('Page hidden - user switched away');
    };

    const handlePageShow = () => {
      wasVisibleRef.current = true;
      console.log('Page shown - user returned');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    // Periodic check for tab switching (every 100ms for real-time detection)
    // This is a backup method in case event listeners miss some switches
    const periodicCheck = setInterval(() => {
      const isVisible = !document.hidden;
      const currentlyHasFocus = document.hasFocus();
      
      // Only update refs if they're different from current state
      // This prevents interference with event-based detection
      if (wasVisibleRef.current !== isVisible) {
        wasVisibleRef.current = isVisible;
      }
      if (hasFocusRef.current !== currentlyHasFocus) {
        hasFocusRef.current = currentlyHasFocus;
      }
    }, 100);

    // Initial state logging
    console.log(`Tab switch tracking initialized. Current count: ${tabSwitchCount}`);
    console.log(`Initial state: isVisible=${!document.hidden}, hasFocus=${document.hasFocus()}`);
    console.log(`Refs initialized: wasVisible=${wasVisibleRef.current}, hasFocus=${hasFocusRef.current}`);
    


    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      clearInterval(periodicCheck);
    };
  }, [isContestTerminated, terminateContestAndSubmit]); // Added terminateContestAndSubmit to dependencies

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'wrong_answer':
      case 'time_limit_exceeded':
      case 'runtime_error':
      case 'compilation_error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-green-600';
      case 'wrong_answer':
      case 'time_limit_exceeded':
      case 'runtime_error':
      case 'compilation_error':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading contest problems...</p>
        </div>
      </div>
    );
  }

  if (contestError) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {contestError.message === 'Authentication required' ? 'Authentication Required' : 'Error Loading Contest'}
          </h3>
          <p className="text-gray-600 mb-4">
            {contestError.message === 'Authentication required' 
              ? 'Please log in to access this contest.'
              : contestError.message || 'Failed to load contest details.'
            }
          </p>
          {contestError.message === 'Authentication required' ? (
            <Button onClick={() => setLocation('/login')}>
              Go to Login
            </Button>
          ) : (
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Contest not found</h3>
          <p className="text-gray-600">The contest you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/contests')} className="mt-4">
            Back to Contests
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is disqualified or contest has ended - redirect to leaderboard immediately
  useEffect(() => {
    // Check if user is disqualified
    if (enrollmentStatus?.isDisqualified) {
      setLocation(`/contests/${contestId}/leaderboard`);
      return;
    }
    
    // Check if contest has been manually ended, but only if contest has actually ended by time
    if (enrollmentStatus?.contestEndMethod === 'manually_ended') {
      const now = new Date();
      const endTime = new Date(contest.endTime);
      if (now > endTime) {
        setLocation(`/contests/${contestId}/leaderboard`);
      }
    }
  }, [enrollmentStatus?.isDisqualified, enrollmentStatus?.contestEndMethod, contestId, setLocation, contest.endTime]);

  if (enrollmentStatus?.isDisqualified || (enrollmentStatus?.contestEndMethod === 'manually_ended' && new Date() > new Date(contest.endTime))) {
    // Show loading state while redirecting
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Redirecting to Results...</h3>
          <p className="text-gray-600">Taking you to the contest leaderboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {!selectedProblem && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">{contest.title}</h1>
              {/* Tab Switch Counter */}
              <Badge variant={tabSwitchCount >= 2 ? "destructive" : tabSwitchCount >= 1 ? "secondary" : "outline"}>
                Tab Switches: {tabSwitchCount}/3
              </Badge>
            </div>
            <Button
              variant="destructive"
              onClick={handleEndContest}
            >
              End Contest
            </Button>
          </div>
        </div>
      )}
      {selectedProblem && (
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
                onClick={() => {
                  if (selectedProblem) {
                    setSelectedProblem(null);
                    setActiveTab('problem');
                    setLocation(`/contests/${contestId}/problems`);
                  } else {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      setLocation(`/contests/${contestId}/problems`);
                    }
                  }
                }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{contest.title}</h1>
              <p className="text-sm text-gray-600">Contest Problems</p>
              {/* Tab Switch Counter */}
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={tabSwitchCount >= 2 ? "destructive" : tabSwitchCount >= 1 ? "secondary" : "outline"}>
                  Tab Switches: {tabSwitchCount}/3
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Full-screen Warning
          {isFullscreen && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Contest Mode Active</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Copy and paste operations are disabled to prevent plagiarism. All keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X) and right-click context menus are disabled.
                  </p>
                </div>
              </div>
            </div>
          )} */}
          
          {/* Contest Progress */}
          {progress && (
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{progress.solvedCount}/{progress.totalProblems}</div>
                <div className="text-xs text-gray-500">Problems Solved</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{progress.earnedPoints}/{progress.totalPoints}</div>
                <div className="text-xs text-gray-500">Points Earned</div>
              </div>
              <div className="text-center">
                  <div className={`text-lg font-semibold ${timeLeftMs !== null && timeLeftMs <= 5 * 60 * 1000 ? 'text-red-600 animate-pulse' : 'text-purple-600'}`}> 
                    {formatTimeLeft(timeLeftMs ?? progress.timeRemaining)}
                </div>
                <div className="text-xs text-gray-500">Time Left</div>
              </div>
            </div>
          )}
          
          {selectedProblem && (
          <div className="flex items-center space-x-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
            

            
            {isFullscreen && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <AlertTriangle className="h-3 w-3" />
                <span>Copy/Paste Disabled</span>
              </div>
            )}
            
            <Button
              onClick={() => {
                if (useCustomInput) {
                  customInputExecutionMutation.mutate({ code, language, customInput });
                } else {
                  handleRunCode();
                }
              }}
              disabled={isRunning || customInputExecutionMutation.isPending || (useCustomInput && !customInput.trim())}
              variant="outline"
              size="sm"
            >
              <Play className="h-4 h-4 mr-2" />
              {useCustomInput 
                ? (customInputExecutionMutation.isPending ? 'Executing...' : 'Run with Custom Input')
                : (isRunning ? 'Running...' : 'Run')
              }
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedProblem}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndContest}
              >
                End Contest
              </Button>
                      </div>
                    )}
                  </div>
            </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content: overview list or editor */}
        <div className="flex-1 flex flex-col">
          {selectedProblem ? (
            <>
              {/* Split layout: left description/results tabs, right editor */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
                <div className="border-r flex flex-col">
                  <div className="px-6 py-4 border-b flex-shrink-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList>
                        <TabsTrigger value="problem">Description</TabsTrigger>
                        <TabsTrigger value="results">Test Results</TabsTrigger>
                      <TabsTrigger value="submissions">Submissions</TabsTrigger>
                    </TabsList>
                      <TabsContent value="problem" className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                        <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{selectedProblem.title}</h2>
                        <div className="flex items-center space-x-4 mb-4">
                          <Badge variant={selectedProblem.difficulty === 'easy' ? 'default' : 
                                         selectedProblem.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                            {selectedProblem.difficulty}
                          </Badge>
                          <Badge variant="outline">{selectedProblem.points} points</Badge>
                          <span className="text-sm text-gray-600">
                            Time Limit: {selectedProblem.timeLimit}ms
                          </span>
                          <span className="text-sm text-gray-600">
                            Memory: {selectedProblem.memoryLimit}MB
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <div className="prose max-w-none">
                          <p className="whitespace-pre-wrap">{selectedProblem.description}</p>
                        </div>
                      </div>
                      
                          {selectedProblem.examples && selectedProblem.examples.length > 0 ? (
                        <div key="examples">
                          <h3 className="font-semibold mb-2">Examples</h3>
                          {selectedProblem.examples.map((example, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 mb-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Input:</h4>
                                  <pre className="bg-white p-2 rounded text-sm">{example.input}</pre>
                          </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Output:</h4>
                                  <pre className="bg-white p-2 rounded text-sm">{example.output}</pre>
                                </div>
                              </div>
                              {example.explanation && (
                                <div className="mt-3">
                                  <h4 className="font-medium text-sm mb-2">Explanation:</h4>
                                  <p className="text-sm text-gray-600">{example.explanation}</p>
                        </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        selectedProblem.testCases && selectedProblem.testCases.length > 0 ? (
                          <div key="examples-fallback">
                            <h3 className="font-semibold mb-2">Examples</h3>
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Input:</h4>
                                  <pre className="bg-white p-2 rounded text-sm">{selectedProblem.testCases[0].input}</pre>
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Output:</h4>
                                  <pre className="bg-white p-2 rounded text-sm">{selectedProblem.testCases[0].expectedOutput}</pre>
                                </div>
                              </div>
                              {selectedProblem.testCases[0].explanation && (
                                <div className="mt-3">
                                  <h4 className="font-medium text-sm">Explanation:</h4>
                                  <p className="text-sm text-gray-600">{selectedProblem.testCases[0].explanation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null
                      )}
                      
                      {selectedProblem.inputFormat && (
                        <div key="input-format">
                          <h3 className="font-semibold mb-2">Input Format</h3>
                          <div className="prose max-w-none">
                            <p className="whitespace-pre-wrap">{selectedProblem.inputFormat}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedProblem.outputFormat && (
                        <div key="output-format">
                          <h3 className="font-semibold mb-2">Output Format</h3>
                          <div className="prose max-w-none">
                            <p className="whitespace-pre-wrap">{selectedProblem.outputFormat}</p>
                          </div>
                        </div>
                      )}
                      
                          {selectedProblem.constraints && (
                            <div key="constraints" className="-mt-2 pb-20">
                              <h3 className="font-semibold mb-1">Constraints</h3>
                              <div className="prose max-w-none">
                                <p className="whitespace-pre-wrap">{selectedProblem.constraints}</p>
                                </div>
                                </div>
                              )}
                          
                          
                          
                         
                    </div>
                  </TabsContent>
                      <TabsContent value="results" className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Test Results</h3>
                      {testResults.length > 0 ? (
                        <div className="space-y-4">
                          {testResults.map((result, index) => (
                            <div key={index} className={`border rounded-lg p-4 ${
                              result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                <span className={`font-medium ${
                                  result.passed ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {result.passed ? '✅ Passed' : '❌ Failed'}
                                </span>
                                  {result.isCustomInput && (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                      Custom Input
                                    </Badge>
                                  )}
                                  {result.isHidden && (
                                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                                      Hidden Test
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Runtime: {result.runtime}ms | Memory: {result.memory}MB
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <h4 className="font-medium mb-1">Input:</h4>
                                  <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">{result.input}</pre>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Expected Output:</h4>
                                  <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">{result.expectedOutput || 'N/A'}</pre>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Your Output:</h4>
                                  <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">{result.output}</pre>
                                </div>
                              </div>
                              {result.error && (
                                <div className="mt-2">
                                  <h4 className="font-medium text-red-700 mb-1">Error:</h4>
                                  <pre className="bg-red-100 p-2 rounded border text-xs text-red-700 overflow-x-auto">{result.error}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No test results available. Run your code to see results.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                      <TabsContent value="submissions" className="p-6">
                                <div>
                          <h3 className="font-semibold mb-4">Your Submissions</h3>
                          {(submissionsLoadPending || (activeTab === 'submissions' && !submissions && isFetchingSubmissions)) && (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                              <span className="text-sm text-gray-600">Loading latest submissions...</span>
                                  </div>
                          )}
                          {selectedProblem && submissions && submissions.length > 0 ? (
                            <div className="space-y-2">
                              {[...submissions]
                                .filter(s => s.problemId === selectedProblem.id)
                                .sort((a, b) => {
                                  const aTime = (a.submittedAt || a.submissionTime) ? new Date(a.submittedAt || (a.submissionTime as string)).getTime() : 0;
                                  const bTime = (b.submittedAt || b.submissionTime) ? new Date(b.submittedAt || (b.submissionTime as string)).getTime() : 0;
                                  return bTime - aTime;
                                })
                                .map((sub) => (
                                  <div key={sub.id} className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {sub.status === 'accepted' ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : sub.status === 'wrong_answer' ? (
                                        <XCircle className="h-4 w-4 text-red-600" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                                      )}
                                      <span className="text-sm">{sub.status.replace('_', ' ')}</span>
                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-xs text-gray-500">
                                        {new Date(sub.submittedAt || (sub.submissionTime as string)).toLocaleString()}
                                  </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                          setDetailsSubmission(sub);
                                        setIsDetailsOpen(true);
                                      }}
                                    >
                                      View Details
                                    </Button>
                                  </div>
                              </div>
                            ))}
                        </div>
                          ) : (
                            <p className="text-sm text-gray-500">No submissions yet</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
                </div>
                <div className="border-l bg-black/95 flex flex-col h-full">
                  <div className="flex-1 min-h-0">
                <MonacoEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                    height="100%"
                    disableCopyPaste={isFullscreen}
                />
                  </div>
                  
                  {/* Custom Input Section - Below Code Editor */}
                  <div className="border-t-2 border-blue-500 bg-gray-900 p-4 flex-shrink-0 min-h-[200px]">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-blue-400 mb-2">Custom Input Testing</h3>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="contest-custom-input-checkbox"
                          checked={useCustomInput}
                          onChange={(e) => setUseCustomInput(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="contest-custom-input-checkbox" className="text-sm font-medium text-gray-300">
                          Use Custom Input
                        </label>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="contest-custom-input-field" className="block text-sm font-medium text-gray-300 mb-2">
                            Custom Input:
                          </label>
                          <textarea
                            id="contest-custom-input-field"
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Enter your custom input here..."
                            className="w-full h-20 p-3 border border-gray-600 rounded-md bg-gray-800 text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Run Button for Custom Input */}
                        {/* <div className="flex justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              console.log('🚀 [CONTEST-CUSTOM-INPUT] Starting custom input execution');
                              console.log('📝 [CONTEST-CUSTOM-INPUT] Code length:', code.length);
                              console.log('📥 [CONTEST-CUSTOM-INPUT] Custom input:', customInput);
                              customInputExecutionMutation.mutate({ code, language, customInput });
                            }}
                            disabled={customInputExecutionMutation.isPending || !customInput.trim()}
                            className="flex items-center space-x-2 bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700"
                            size="sm"
                          >
                            <Play className="w-4 h-4" />
                            <span>{customInputExecutionMutation.isPending ? "Executing..." : "Run with Custom Input"}</span>
                          </Button>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Overview mode: full-width problems list with Solve buttons
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Problems ({contest.problems.length})</h2>
                <p className="text-sm text-gray-500">Choose a problem to begin solving.</p>
              </div>
              <div className="space-y-3">
                {contest.problems.map((problem, index) => {
                  const isSolved = Array.isArray((progress as any)?.solvedProblems) && (progress as any).solvedProblems.includes(problem.id);
                  return (
                    <div key={problem.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">Problem {index + 1}</span>
                          <h3 className="font-medium truncate flex items-center gap-2">
                            {problem.title}
                            {isSolved && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
                          </h3>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                          <Badge variant={problem.difficulty === 'easy' ? 'default' : problem.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                            {problem.difficulty}
                          </Badge>
                          <Badge variant="outline">{problem.points} pts</Badge>
                          {Array.isArray((problem as any).tags) && (problem as any).tags.slice(0,3).map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            const elem: any = document.documentElement;
                            if (elem.requestFullscreen) await elem.requestFullscreen();
                            else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
                            else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
                          } catch {}
                          document.body.classList.add('contest-fullscreen');
                          setSelectedProblem(problem);
                          setActiveTab('problem');
                          setLocation(`/contests/${contestId}/problems/${problem.id}`);
                          setTimeout(() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }, 0);
                        }}
                        className={`whitespace-nowrap ${isSolved ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300' : ''}`}
                        variant={isSolved ? 'outline' : 'default'}
                      >
                        {isSolved ? 'Solve Again' : 'Solve'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submission Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              {detailsSubmission ? 'Submission details' : ''}
            </DialogDescription>
            {detailsSubmission && (() => {
                  const problem = contest?.problems.find(p => p.id === detailsSubmission.problemId);
                  const total = problem?.testCases?.length || 0;
                  const passed = detailsSubmission.status === 'accepted' ? total : 0;
                  const when = detailsSubmission.submittedAt || detailsSubmission.submissionTime;
                  return (
                <div className="text-sm text-gray-600 px-6 -mt-2">
                      Status: <span className={`font-medium ${getStatusColor(detailsSubmission.status)}`}>{detailsSubmission.status.replace('_', ' ').toUpperCase()}</span>
                      {detailsSubmission.runtime !== undefined && ` • Runtime: ${detailsSubmission.runtime}ms`}
                      {detailsSubmission.memory !== undefined && ` • Memory: ${detailsSubmission.memory}MB`}
                      {when && ` • ${new Date(when).toLocaleString()}`}
                      {` • ${passed}/${total} test cases passed`}
                    </div>
                  );
            })()}
          </DialogHeader>
          <div className="mt-4">
            <MonacoEditor
              value={detailsSubmission?.code || ''}
              onChange={() => {}}
              language={(detailsSubmission?.language === 'c') ? 'cpp' : (detailsSubmission?.language || 'javascript')}
              theme="vs-dark"
              options={{ readOnly: true, minimap: { enabled: false } }}
              height={400 as any}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Blocking Overlay */}
      {showFullscreenDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Full-Screen Mode Required</h2>
            <p className="text-gray-700 mb-6 text-lg">
              You have exited full-screen mode. If this happens again, you will be disqualified from the contest.
            </p>
            <Button 
              onClick={enterFullscreen}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-xl font-semibold"
              size="lg"
            >
              Enter Full Screen
            </Button>
          </div>
        </div>
      )}

      {/* Tab Switch Warning Dialog */}
      {showTabSwitchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-2xl font-bold text-orange-600 mb-4">Tab Switch Detected</h2>
            <p className="text-gray-700 mb-6 text-lg">
              Tab switch detected. Switch count: <span className="font-bold text-red-600">{tabSwitchCount}</span>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {tabSwitchCount >= 2 ? 
                "⚠️ Warning: One more tab switch will automatically end your contest and submit your current solutions!" :
                "Avoid switching tabs during the contest. Multiple switches will result in automatic contest termination."
              }
            </p>
            <Button 
              onClick={() => setShowTabSwitchDialog(false)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-xl font-semibold"
              size="lg"
            >
              Continue Contest
            </Button>
          </div>
        </div>
      )}

      {/* End Contest Confirmation Dialog */}
      {showEndContestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">End Contest?</h2>
            <p className="text-gray-700 mb-6 text-lg">
              Are you sure you want to end this contest? All your current code will be automatically submitted before ending.
            </p>
            <div className="flex space-x-4 justify-center">
              <Button 
                onClick={() => setShowEndContestDialog(false)}
                variant="outline"
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmEndContest}
                variant="destructive"
                className="px-6 py-2"
              >
                End Contest
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 