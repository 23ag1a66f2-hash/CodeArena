import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MaintenancePage from '@/pages/MaintenancePage';

interface MaintenanceInfo {
  isActive: boolean;
  from: string;
  to: string;
  estimatedEnd: string;
}

export function MaintenanceCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        // Only check for non-admin users
        if (user?.role === 'admin') {
          setIsChecking(false);
          return;
        }

        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 503) {
          const data = await response.json();
          if (data.maintenance?.isActive) {
            setMaintenanceInfo({
              isActive: true,
              from: data.maintenance.from,
              to: data.maintenance.to,
              estimatedEnd: data.maintenance.estimatedEnd,
            });
          }
        }
      } catch (error) {
        // If there's an error, assume maintenance is not active
        console.log('Maintenance check failed:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkMaintenanceStatus();
  }, [user?.role]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Show maintenance page for non-admin users if maintenance is active
  if (maintenanceInfo?.isActive && user?.role !== 'admin') {
    return <MaintenancePage maintenanceInfo={maintenanceInfo} />;
  }

  // Show normal app for admin users or when maintenance is not active
  return <>{children}</>;
}
