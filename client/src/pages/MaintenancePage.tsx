import React from 'react';
import { AlertTriangle, Clock, Wrench } from 'lucide-react';

interface MaintenancePageProps {
  maintenanceInfo?: {
    from: string;
    to: string;
    estimatedEnd: string;
  };
}

export default function MaintenancePage({ maintenanceInfo }: MaintenancePageProps) {
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="flex justify-center">
            {/* <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Wrench className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div> */}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Under Maintenance
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
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
          
          {maintenanceInfo ? (
            <div className="space-y-2">
              <p className="text-amber-700 dark:text-amber-300">
                We are upgrading a few things and will be back between{' '}
                <span className="font-semibold">{formatTime(maintenanceInfo.from)}</span> and{' '}
                <span className="font-semibold">{formatTime(maintenanceInfo.to)}</span>.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Estimated completion: {formatTime(maintenanceInfo.estimatedEnd)}
              </p>
            </div>
          ) : (
            <p className="text-amber-700 dark:text-amber-300">
              We are currently performing scheduled maintenance to improve your experience. 
              Please check back in a few hours.
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
          <p className="mt-1">For urgent matters, please contact support.</p>
        </div>
      </div>
    </div>
  );
}
