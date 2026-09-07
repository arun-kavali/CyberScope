import { useRealtimeContext } from '../context/RealtimeContext';
import { RealtimeStatus, RealtimeAlertEvent } from '../services/realtime';

export interface UseRealtimeResult {
  status: RealtimeStatus;
  lastEvent: RealtimeAlertEvent | null;
  isConnected: boolean;
}

export function useRealtime(): UseRealtimeResult {
  const { status, lastEvent } = useRealtimeContext();
  return {
    status,
    lastEvent,
    isConnected: status === 'CONNECTED',
  };
}
