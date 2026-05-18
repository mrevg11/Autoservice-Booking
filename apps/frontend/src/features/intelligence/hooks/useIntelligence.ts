import { useQuery } from '@tanstack/react-query';
import { intelligenceApi, type DurationEstimateMultiResponse } from '../../../shared/api/endpoints';
export type { DurationEstimateMultiResponse };

export function useSuggestSlots(
  serviceId: number | undefined,
  preferredDate: string,
  vehicleYear?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ['suggestSlots', serviceId, preferredDate, vehicleYear],
    queryFn: () => intelligenceApi.suggestSlots(serviceId!, preferredDate, vehicleYear).then((r) => r.data),
    enabled: !!serviceId && !!preferredDate && enabled,
  });
}

export function useRecommendations(serviceId: number | undefined) {
  return useQuery({
    queryKey: ['recommendations', serviceId],
    queryFn: () => intelligenceApi.getRecommendations(serviceId!).then((r) => r.data),
    enabled: !!serviceId,
  });
}

export function useEstimateDuration(
  serviceId: number | undefined,
  masterId?: number,
  vehicleYear?: number,
) {
  return useQuery({
    queryKey: ['estimateDuration', serviceId, masterId, vehicleYear],
    queryFn: () => intelligenceApi.estimateDuration(serviceId!, masterId, vehicleYear).then((r) => r.data),
    enabled: !!serviceId,
  });
}

export function useEstimateDurationMulti(
  serviceIds: number[],
  masterId?: number,
  vehicleYear?: number,
) {
  return useQuery({
    queryKey: ['estimateDurationMulti', serviceIds, masterId, vehicleYear],
    queryFn: () => intelligenceApi.estimateDurationMulti(serviceIds, masterId, vehicleYear).then((r) => r.data),
    enabled: serviceIds.length > 0,
  });
}
