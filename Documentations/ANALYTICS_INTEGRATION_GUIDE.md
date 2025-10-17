# Analytics Integration Guide

## Overview
This guide explains how to integrate the real-time analytics update system with your submission components to automatically update the Overall Analytics when students solve problems.

## How It Works

The system uses a global event system that automatically refreshes analytics when:
1. **Submissions are made** - Updates progress and scores
2. **Problems are completed** - Updates completion rates and status
3. **User activity is tracked** - Updates last activity timestamps

## Integration Steps

### 1. Import the Analytics Events Hook

```typescript
import { useAnalyticsEvents } from '@/hooks/useAnalyticsEvents';
```

### 2. Use the Hook in Your Component

```typescript
const { triggerSubmissionUpdate, triggerProblemCompleted } = useAnalyticsEvents();
```

### 3. Trigger Events When Submissions Are Made

```typescript
// When a submission is created
const handleSubmission = async (submissionData) => {
  try {
    const response = await submitSolution(submissionData);
    
    if (response.success) {
      // Trigger analytics update for this problem set
      triggerSubmissionUpdate(problemSetId);
      
      // If the problem was completed successfully
      if (response.status === 'accepted') {
        triggerProblemCompleted(problemSetId, problemId);
      }
    }
  } catch (error) {
    console.error('Submission failed:', error);
  }
};
```

### 4. Trigger Events When Problems Are Completed

```typescript
// When a problem is marked as completed
const handleProblemCompletion = (problemSetId, problemId) => {
  triggerProblemCompleted(problemSetId, problemId);
};
```

### 5. Trigger Events for User Activity

```typescript
// When user starts working on a problem
const handleUserActivity = (problemSetId, userId) => {
  triggerActivityUpdate(problemSetId, userId);
};
```

## Example Integration

Here's a complete example of how to integrate with a submission form:

```typescript
import { useAnalyticsEvents } from '@/hooks/useAnalyticsEvents';

const SubmissionForm = ({ problemSetId, problemId }) => {
  const { triggerSubmissionUpdate, triggerProblemCompleted } = useAnalyticsEvents();
  
  const handleSubmit = async (code, language) => {
    try {
      const response = await submitSolution({
        problemSetId,
        problemId,
        code,
        language
      });
      
      if (response.success) {
        // Always trigger submission update
        triggerSubmissionUpdate(problemSetId);
        
        // If problem was solved, trigger completion event
        if (response.status === 'accepted') {
          triggerProblemCompleted(problemSetId, problemId);
        }
        
        // Show success message
        toast.success('Solution submitted successfully!');
      }
    } catch (error) {
      toast.error('Submission failed: ' + error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Your form content */}
    </form>
  );
};
```

## Automatic Updates

Once integrated, the Overall Analytics will automatically update:

- **Every 2 seconds** - Background refresh for real-time feel
- **On submission events** - Immediate update when submissions are made
- **On problem completion** - Instant update when problems are solved
- **On manual refresh** - When admin clicks the refresh button

## Benefits

✅ **Real-time Updates** - Analytics update automatically without page refresh  
✅ **Immediate Feedback** - See student progress as it happens  
✅ **No Manual Refresh** - System keeps itself up-to-date  
✅ **Performance Optimized** - Only updates when needed  
✅ **User Notifications** - Toast messages inform when updates occur  

## Troubleshooting

### Analytics Not Updating?
1. Check that events are being triggered correctly
2. Verify the problemSetId matches between components
3. Ensure the analytics dialog is open (events only work when visible)

### Performance Issues?
1. Reduce the refresh interval (currently 2 seconds)
2. Check browser console for errors
3. Verify the event listeners are properly cleaned up

## Support

For issues or questions about the analytics integration, check:
1. Browser console for error messages
2. Network tab for failed API calls
3. React Query DevTools for query state 