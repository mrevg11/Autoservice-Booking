import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, CreateReviewPayload } from '../../../shared/api/endpoints';

export function useReviewsForMaster(masterId: number | undefined) {
  return useQuery({
    queryKey: ['reviews', 'master', masterId],
    queryFn: () => reviewsApi.getForMaster(masterId!).then((r) => r.data),
    enabled: !!masterId,
  });
}

export function useReviewForBooking(bookingId: number | undefined) {
  return useQuery({
    queryKey: ['review', 'booking', bookingId],
    queryFn: () => reviewsApi.getForBooking(bookingId!).then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewPayload) => reviewsApi.create(data),
    onSuccess: (_, { bookingId }) => {
      qc.invalidateQueries({ queryKey: ['review', 'booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
