import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { realtimeClient, RealtimeStatus, RealtimeAlertEvent } from '../services/realtime';

interface RealtimeContextType {
  status: RealtimeStatus;
  lastEvent: RealtimeAlertEvent | null;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<RealtimeAlertEvent | null>(null);

  useEffect(() => {
    // Only SOC_ANALYST role is permitted to subscribe to the SOC Analyst realtime alert stream
    const isSocAnalyst = user?.role === 'SOC_ANALYST';

    if (token && isSocAnalyst) {
      realtimeClient.connect(token);
    } else {
      realtimeClient.disconnect();
    }

    const unsubStatus = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const unsubEvent = realtimeClient.onAlertCreated((event) => {
      setLastEvent(event);
      // Invalidate TanStack Query 'alerts' cache to auto-fetch new incoming alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      unsubStatus();
      unsubEvent();
      realtimeClient.disconnect();
    };
  }, [token, user?.role, queryClient]);

  return (
    <RealtimeContext.Provider value={{ status, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtimeContext(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
}
