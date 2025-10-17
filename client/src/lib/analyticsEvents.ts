// Analytics Events Service
// This service manages global events for updating analytics when submissions are made

export class AnalyticsEvents {
  private static instance: AnalyticsEvents;
  private listeners: Map<string, Set<() => void>> = new Map();

  private constructor() {}

  static getInstance(): AnalyticsEvents {
    if (!AnalyticsEvents.instance) {
      AnalyticsEvents.instance = new AnalyticsEvents();
    }
    return AnalyticsEvents.instance;
  }

  // Emit an event when a submission is made
  static emitSubmissionUpdate(problemSetId: string) {
    // Dispatch a custom event that analytics components can listen to
    window.dispatchEvent(new CustomEvent('submission-updated', {
      detail: { problemSetId }
    }));
    
    // Also dispatch a global event for broader analytics updates
    window.dispatchEvent(new CustomEvent('analytics-updated', {
      detail: { problemSetId, type: 'submission' }
    }));
  }

  // Emit an event when a problem is completed
  static emitProblemCompleted(problemSetId: string, problemId: string | number) {
    window.dispatchEvent(new CustomEvent('problem-completed', {
      detail: { problemSetId, problemId }
    }));
    
    // Also trigger general analytics update
    this.emitSubmissionUpdate(problemSetId);
  }

  // Emit an event when user activity is tracked
  static emitActivityUpdate(problemSetId: string, userId: string) {
    window.dispatchEvent(new CustomEvent('activity-updated', {
      detail: { problemSetId, userId }
    }));
    
    // Trigger analytics update for this problem set
    this.emitSubmissionUpdate(problemSetId);
  }

  // Listen for analytics update events
  static onAnalyticsUpdate(callback: (data: { problemSetId: string; type: string }) => void) {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('analytics-updated', handler as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('analytics-updated', handler as EventListener);
    };
  }

  // Listen for submission updates
  static onSubmissionUpdate(callback: (data: { problemSetId: string }) => void) {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('submission-updated', handler as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('submission-updated', handler as EventListener);
    };
  }

  // Listen for problem completion
  static onProblemCompleted(callback: (data: { problemSetId: string; problemId: string | number }) => void) {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('problem-completed', handler as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('problem-completed', handler as EventListener);
    };
  }
}

// Export convenience functions
export const emitSubmissionUpdate = AnalyticsEvents.emitSubmissionUpdate;
export const emitProblemCompleted = AnalyticsEvents.emitProblemCompleted;
export const emitActivityUpdate = AnalyticsEvents.emitActivityUpdate;
export const onAnalyticsUpdate = AnalyticsEvents.onAnalyticsUpdate;
export const onSubmissionUpdate = AnalyticsEvents.onSubmissionUpdate;
export const onProblemCompleted = AnalyticsEvents.onProblemCompleted; 