import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/contexts/MaintenanceModeContext';
import { MaintenanceModal } from './MaintenanceModal';
import { useQuery } from '@tanstack/react-query';

interface GlobalMaintenanceEnforcerProps {
  children: React.ReactNode;
}

export function GlobalMaintenanceEnforcer({ children }: GlobalMaintenanceEnforcerProps) {
  const { user, isAuthenticated } = useAuth();
  const { isMaintenanceMode, isMaintenanceActive, maintenanceFrom, maintenanceTo } = useMaintenanceMode();

  // Poll server health status every 2 seconds for real-time updates
  const { data: healthStatus } = useQuery({
    queryKey: ['/api/health'],
    queryFn: async () => {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Failed to fetch health status');
      }
      const data = await response.json();
      return data;
    },
    refetchInterval: 2000, // Poll every 2 seconds for faster response
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });

  // Also poll maintenance status for regular users to get real-time updates
  const { data: maintenanceStatus } = useQuery({
    queryKey: ['/api/admin/maintenance/status'],
    queryFn: async () => {
      const response = await fetch('/api/admin/maintenance/status');
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance status');
      }
      return response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });

  // Determine if maintenance modal should be shown
  // ONLY show for regular users (non-admin) when maintenance is active
  // Priority: isMaintenanceMode must be true AND isMaintenanceActive must be true
  const shouldShowMaintenanceModal = 
    isAuthenticated && 
    user?.role !== 'admin' && 
    isMaintenanceMode && 
    isMaintenanceActive;

  // Additional check: if user is admin, never show modal
  const isAdmin = user?.role === 'admin';
  const finalShouldShowModal = shouldShowMaintenanceModal && !isAdmin;

  // Debug logging
  console.log('GlobalMaintenanceEnforcer Debug:', {
    isAuthenticated,
    userRole: user?.role,
    isAdmin: user?.role === 'admin',
    isMaintenanceMode,
    isMaintenanceActive,
    maintenanceStatus: maintenanceStatus?.isMaintenanceMode,
    maintenanceActive: maintenanceStatus?.isMaintenanceActive,
    healthStatus: healthStatus?.status,
    healthMaintenance: healthStatus?.maintenance,
    shouldShowMaintenanceModal,
    finalShouldShowModal,
    userObject: user,
    timestamp: new Date().toISOString(),
    // Additional debugging
    contextValues: {
      isMaintenanceMode,
      isMaintenanceActive,
      maintenanceFrom,
      maintenanceTo
    }
  });

  // Prevent any user interaction when maintenance is active
  useEffect(() => {
    if (finalShouldShowModal) {
      // Disable all form submissions
      const handleSubmit = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Disable all clicks on interactive elements
      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || 
            target.tagName === 'A' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' ||
            target.tagName === 'TEXTAREA' ||
            target.closest('button') ||
            target.closest('a') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('textarea')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };

      // Disable keyboard navigation
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };

      // Add event listeners
      document.addEventListener('submit', handleSubmit, true);
      document.addEventListener('click', handleClick, true);
      document.addEventListener('keydown', handleKeyDown, true);

      // Cleanup
      return () => {
        document.removeEventListener('submit', handleSubmit, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [shouldShowMaintenanceModal]);

  return (
    <>
      {children}
      {finalShouldShowModal && (
        <MaintenanceModal isOpen={true} />
      )}
    </>
  );
}
