import React from 'react';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { AlertTriangle, Clock, Wrench } from 'lucide-react';
import { useMaintenanceMode } from '@/contexts/MaintenanceModeContext';

interface MaintenanceModalProps {
  isOpen: boolean;
}

export function MaintenanceModal({ isOpen }: MaintenanceModalProps) {
  const { maintenanceFrom, maintenanceTo } = useMaintenanceMode();

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogOverlay />
        <div
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg mx-4"
        >
        <div className="text-center space-y-6 py-6">
          {/* Icon and Title */}
          <div className="space-y-4">
            <div className="flex justify-center">
              {/* <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Wrench className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div> */}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              System Under Maintenance
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              We're upgrading a few things and will be back soon
            </p>
          </div>

          {/* Maintenance Message */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                Scheduled Maintenance
              </h2>
            </div>
            
            {maintenanceFrom && maintenanceTo ? (
              <div className="space-y-2">
                <p className="text-amber-700 dark:text-amber-300">
                  We are upgrading a few things and will be back between{' '}
                  <span className="font-semibold">{formatTime(maintenanceFrom)}</span> and{' '}
                  <span className="font-semibold">{formatTime(maintenanceTo)}</span>.
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  All user operations are temporarily disabled during this time.
                </p>
              </div>
            ) : (
              <p className="text-amber-700 dark:text-amber-300">
                We are currently performing scheduled maintenance to improve your experience. 
                All user operations are temporarily disabled.
              </p>
            )}
          </div>

          {/* Status Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">What's happening?</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                We're performing system upgrades and optimizations to enhance performance and security.
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">What to expect?</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Once maintenance is complete, you'll have access to improved features and better performance.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Thank you for your patience during this maintenance window.</p>
            <p className="mt-1">Please check back later or contact support for urgent matters.</p>
          </div>
        </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
