import { useQuery } from '@tanstack/react-query';
import { servicesApi, GetServicesParams } from '../../../shared/api/endpoints';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.getCategories().then((r) => r.data),
  });
}

export function useServices(params?: GetServicesParams) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => servicesApi.getServices(params).then((r) => r.data),
  });
}

export function useService(id: number | undefined) {
  return useQuery({
    queryKey: ['service', id],
    queryFn: () => servicesApi.getService(id!).then((r) => r.data),
    enabled: !!id,
  });
}
