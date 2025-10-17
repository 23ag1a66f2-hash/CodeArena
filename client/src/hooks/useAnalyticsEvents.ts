import { useCallback } from 'react';
import { emitSubmissionUpdate, emitProblemCompleted, emitActivityUpdate } from '@/lib/analyticsEvents';

// Custom hook for managing analytics events
export const useAnalyticsEvents = () => {
  // Emit submission update event
  const triggerSubmissionUpdate = useCallback((problemSetId: string) => {
    emitSubmissionUpdate(problemSetId);
  }, []);

  // Emit problem completion event
  const triggerProblemCompleted = useCallback((problemSetId: string, problemId: string | number) => {
    emitProblemCompleted(problemSetId, problemId);
  }, []);

  // Emit activity update event
  const triggerActivityUpdate = useCallback((problemSetId: string, userId: string) => {
    emitActivityUpdate(problemSetId, userId);
  }, []);

  return {
    triggerSubmissionUpdate,
    triggerProblemCompleted,
    triggerActivityUpdate,
  };
}; 