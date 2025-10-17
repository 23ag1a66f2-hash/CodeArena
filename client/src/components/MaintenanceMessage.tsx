import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useMaintenanceMode } from '@/contexts/MaintenanceModeContext';

export function MaintenanceMessage() {
  const { 
    isMaintenanceMode, 
    maintenanceFrom, 
    maintenanceTo, 
    timeUntilMaintenance, 
    timeUntilMaintenanceEnd,
    isMaintenanceActive,
    isPreMaintenanceWarning 
  } = useMaintenanceMode();

  if (!isMaintenanceMode || (!isPreMaintenanceWarning && !isMaintenanceActive)) {
    return null;
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatCountdown = (minutes: number) => {
    if (minutes <= 0) return '0 minutes';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className={`w-full border-b ${
      isMaintenanceActive 
        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
        : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
    }`}>
      <div className="w-full flex justify-center px-4 py-3">
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-center gap-2 w-full text-center">
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
              isMaintenanceActive 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-amber-600 dark:text-amber-400'
            }`} />
            <div className="flex flex-col items-center gap-1">
              <span className={`font-medium text-base ${
                isMaintenanceActive 
                  ? 'text-red-800 dark:text-red-200' 
                  : 'text-amber-800 dark:text-amber-200'
              }`}>
                {isMaintenanceActive 
                  ? `We are upgrading a few things and will be back between ${formatTime(maintenanceFrom)} and ${formatTime(maintenanceTo)}.`
                  : `Maintenance scheduled from ${formatTime(maintenanceFrom)} to ${formatTime(maintenanceTo)}.`
                }
              </span>
              {isPreMaintenanceWarning && timeUntilMaintenance && (
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Maintenance starts in {formatCountdown(timeUntilMaintenance)}
                </span>
              )}
              {isMaintenanceActive && timeUntilMaintenanceEnd && (
                <span className="text-sm text-red-700 dark:text-red-300">
                  Estimated completion in {formatCountdown(timeUntilMaintenanceEnd)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
