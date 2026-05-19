import { useQuery } from '@tanstack/react-query';
import { mastersApi, PaginationParams } from '../../../shared/api/endpoints';

export function useMasters(params?: PaginationParams) {
  return useQuery({
    queryKey: ['masters', params],
    queryFn: () => mastersApi.getAll(params).then((r) => r.data),
  });
}

export function useMaster(id: number | undefined) {
  return useQuery({
    queryKey: ['master', id],
    queryFn: () => mastersApi.getOne(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useMasterSlots(masterId: number | undefined, date: string, duration: number, vehicleId?: number) {
  return useQuery({
    queryKey: ['masterSlots', masterId, date, duration, vehicleId],
    queryFn: () => mastersApi.getSlots(masterId!, date, duration, vehicleId).then((r) => r.data),
    enabled: !!masterId && !!date && duration > 0,
  });
}
