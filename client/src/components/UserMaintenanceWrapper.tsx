import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/contexts/MaintenanceModeContext';
import { MaintenanceModal } from './MaintenanceModal';

interface UserMaintenanceWrapperProps {
  children: React.ReactNode;
}

export function UserMaintenanceWrapper({ children }: UserMaintenanceWrapperProps) {
  const { user } = useAuth();
  const { isMaintenanceMode, isMaintenanceActive } = useMaintenanceMode();

  // Debug logging
  console.log('UserMaintenanceWrapper Debug:', {
    userRole: user?.role,
    isMaintenanceMode,
    isMaintenanceActive,
    shouldShow: user?.role !== 'admin' && isMaintenanceMode && isMaintenanceActive
  });

  // Only show maintenance modal for regular users (non-admin) when maintenance is active
  const shouldShowMaintenanceModal = 
    user?.role !== 'admin' && 
    isMaintenanceMode && 
    isMaintenanceActive;

  return (
    <>
      {children}
      {shouldShowMaintenanceModal && (
        <MaintenanceModal isOpen={true} />
      )}
    </>
  );
}
