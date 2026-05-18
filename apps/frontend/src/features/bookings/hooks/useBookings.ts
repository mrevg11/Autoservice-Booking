import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, BookingFilterParams, BookingStatus, CreateBookingPayload } from '../../../shared/api/endpoints';
export type { BookingPhoto } from '../../../shared/api/endpoints';

export function useMyBookings(params?: BookingFilterParams) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsApi.getAll(params).then((r) => r.data),
  });
}

export function useBooking(id: number) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getOne(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useBookingHistory(id: number) {
  return useQuery({
    queryKey: ['bookingHistory', id],
    queryFn: () => bookingsApi.getHistory(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingPayload) => bookingsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: BookingStatus; comment?: string }) =>
      bookingsApi.updateStatus(id, status, comment),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookingHistory', id] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useBookingPhotos(bookingId: number) {
  return useQuery({
    queryKey: ['bookingPhotos', bookingId],
    queryFn: () => bookingsApi.getPhotos(bookingId).then((r) => r.data),
    enabled: !!bookingId,
  });
}

export function useAddBookingPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      ...data
    }: { bookingId: number; dataUrl: string; mimeType: string; caption?: string }) =>
      bookingsApi.addPhoto(bookingId, data),
    onSuccess: (_, { bookingId }) =>
      qc.invalidateQueries({ queryKey: ['bookingPhotos', bookingId] }),
  });
}

export function useDeleteBookingPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, photoId }: { bookingId: number; photoId: number }) =>
      bookingsApi.deletePhoto(bookingId, photoId),
    onSuccess: (_, { bookingId }) =>
      qc.invalidateQueries({ queryKey: ['bookingPhotos', bookingId] }),
  });
}
