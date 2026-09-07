import { useQuery } from '@tanstack/react-query';
import { fetchHealthStatus } from '../services/api';
import { HealthResponse } from '../types';

export function useHealth() {
  return useQuery<HealthResponse, Error>({
    queryKey: ['health'],
    queryFn: fetchHealthStatus,
    refetchInterval: 10000,
    retry: 2,
  });
}
