import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface MaintenanceModeContextType {
  isMaintenanceMode: boolean;
  maintenanceFrom: string;
  maintenanceTo: string;
  timeUntilMaintenance: number | null; // minutes until maintenance starts
  timeUntilMaintenanceEnd: number | null; // minutes until maintenance ends
  isMaintenanceActive: boolean;
  isPreMaintenanceWarning: boolean;
  lastUpdated: string | null;
  toggleMaintenanceMode: () => void;
  setMaintenanceMode: (enabled: boolean) => void;
  setMaintenanceTimes: (from: string, to: string) => void;
}

const MaintenanceModeContext = createContext<MaintenanceModeContextType | undefined>(undefined);

interface MaintenanceModeProviderProps {
  children: ReactNode;
}

export function MaintenanceModeProvider({ children }: MaintenanceModeProviderProps) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceFrom, setMaintenanceFrom] = useState('');
  const [maintenanceTo, setMaintenanceTo] = useState('');
  const [timeUntilMaintenance, setTimeUntilMaintenance] = useState<number | null>(null);
  const [timeUntilMaintenanceEnd, setTimeUntilMaintenanceEnd] = useState<number | null>(null);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [isPreMaintenanceWarning, setIsPreMaintenanceWarning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch maintenance status from server every 5 seconds
  const { data: serverStatus } = useQuery({
    queryKey: ['/api/admin/maintenance/status'],
    queryFn: async () => {
      const response = await fetch('/api/admin/maintenance/status');
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance status');
      }
      return response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds for faster response
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Update local state when server status changes
  useEffect(() => {
    if (serverStatus) {
      console.log('=== MAINTENANCE CONTEXT UPDATE ===');
      console.log('Server Status Update:', serverStatus);
      console.log('Current local state before update:', {
        isMaintenanceMode,
        maintenanceFrom,
        maintenanceTo,
        isMaintenanceActive,
        isPreMaintenanceWarning
      });
      
      const newMaintenanceMode = serverStatus.isMaintenanceMode;
      const newMaintenanceFrom = serverStatus.maintenanceFrom || '';
      const newMaintenanceTo = serverStatus.maintenanceTo || '';
      
      console.log('Updating to:', {
        isMaintenanceMode: newMaintenanceMode,
        maintenanceFrom: newMaintenanceFrom,
        maintenanceTo: newMaintenanceTo,
        isMaintenanceActive: serverStatus.isMaintenanceActive,
        isPreMaintenanceWarning: serverStatus.isPreMaintenanceWarning
      });
      
      setIsMaintenanceMode(newMaintenanceMode);
      setMaintenanceFrom(newMaintenanceFrom);
      setMaintenanceTo(newMaintenanceTo);
      setIsMaintenanceActive(serverStatus.isMaintenanceActive);
      setIsPreMaintenanceWarning(serverStatus.isPreMaintenanceWarning);
      setLastUpdated(serverStatus.lastUpdated);
      
      console.log('=== CONTEXT UPDATE COMPLETE ===');
    }
  }, [serverStatus]);

  // Ensure maintenance is not active when maintenance mode is off
  useEffect(() => {
    if (!isMaintenanceMode) {
      setIsMaintenanceActive(false);
      setIsPreMaintenanceWarning(false);
    }
  }, [isMaintenanceMode]);

  // Calculate time until maintenance
  useEffect(() => {
    if (!isMaintenanceMode || !maintenanceFrom || !maintenanceTo) {
      setTimeUntilMaintenance(null);
      setTimeUntilMaintenanceEnd(null);
      return;
    }

    const updateTimes = () => {
      const now = new Date();
      const fromTime = new Date(`${now.toDateString()} ${maintenanceFrom}`);
      const toTime = new Date(`${now.toDateString()} ${maintenanceTo}`);
      
      // If maintenance times are for tomorrow
      if (fromTime <= now) {
        fromTime.setDate(fromTime.getDate() + 1);
        toTime.setDate(toTime.getDate() + 1);
      }

      const minutesUntilStart = Math.floor((fromTime.getTime() - now.getTime()) / (1000 * 60));
      const minutesUntilEnd = Math.floor((toTime.getTime() - now.getTime()) / (1000 * 60));

      setTimeUntilMaintenance(minutesUntilStart);
      setTimeUntilMaintenanceEnd(minutesUntilEnd);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isMaintenanceMode, maintenanceFrom, maintenanceTo]);

  const toggleMaintenanceMode = () => {
    setIsMaintenanceMode(prev => !prev);
  };

  const setMaintenanceMode = (enabled: boolean) => {
    setIsMaintenanceMode(enabled);
  };

  const setMaintenanceTimes = (from: string, to: string) => {
    setMaintenanceFrom(from);
    setMaintenanceTo(to);
  };

  return (
    <MaintenanceModeContext.Provider
      value={{
        isMaintenanceMode,
        maintenanceFrom,
        maintenanceTo,
        timeUntilMaintenance,
        timeUntilMaintenanceEnd,
        isMaintenanceActive,
        isPreMaintenanceWarning,
        lastUpdated,
        toggleMaintenanceMode,
        setMaintenanceMode,
        setMaintenanceTimes,
      }}
    >
      {children}
    </MaintenanceModeContext.Provider>
  );
}

export function useMaintenanceMode() {
  const context = useContext(MaintenanceModeContext);
  if (context === undefined) {
    throw new Error('useMaintenanceMode must be used within a MaintenanceModeProvider');
  }
  return context;
}