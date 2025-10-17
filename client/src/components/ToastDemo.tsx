import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toastSuccess, toastError, toastWarning, toastInfo } from '@/components/ui/use-toast';

export function ToastDemo() {
  const handleSuccessToast = () => {
    toastSuccess('Operation Successful!', 'Your action has been completed successfully.');
  };

  const handleErrorToast = () => {
    toastError('Operation Failed', 'Something went wrong. Please try again.');
  };

  const handleWarningToast = () => {
    toastWarning('Warning', 'Please review your input before proceeding.');
  };

  const handleInfoToast = () => {
    toastInfo('Information', 'Here is some helpful information for you.');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Enhanced Toast Demo</CardTitle>
        <CardDescription>
          Test the new enhanced toast notifications with different variants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSuccessToast} className="w-full" variant="default">
          Show Success Toast
        </Button>
        <Button onClick={handleErrorToast} className="w-full" variant="destructive">
          Show Error Toast
        </Button>
        <Button onClick={handleWarningToast} className="w-full" variant="outline">
          Show Warning Toast
        </Button>
        <Button onClick={handleInfoToast} className="w-full" variant="secondary">
          Show Info Toast
        </Button>
      </CardContent>
    </Card>
  );
}
