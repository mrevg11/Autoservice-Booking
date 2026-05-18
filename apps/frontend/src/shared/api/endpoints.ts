import api from './axios';
import type { AuthUser } from '../store/auth.store';

// ─── Common types ─────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { firstName: string; lastName: string; email: string; phone?: string; password: string }
export interface AuthResponse { user: AuthUser; accessToken: string; refreshToken: string }

export const authApi = {
  register: (data: RegisterPayload) => api.post<{ message: string }>('/auth/register', data),
  login: (data: LoginPayload) => api.post<AuthResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post<{ message: string }>('/auth/verify-email', { token }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
}

export interface UpdateUserPayload { firstName?: string; lastName?: string; phone?: string }

export const usersApi = {
  getMe: () => api.get<UserDto>('/users/me'),
  updateMe: (data: UpdateUserPayload) => api.patch<UserDto>('/users/me', data),
};

// ─── Services ─────────────────────────────────────────────────────────────────

export interface ServiceCategory { id: number; name: string; description: string | null }
export interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  baseDurationMinutes: number;
  isActive: boolean;
  category: ServiceCategory;
}

export interface GetServicesParams extends PaginationParams {
  categoryId?: number;
  isActive?: boolean;
  search?: string;
}

export const servicesApi = {
  getCategories: () => api.get<ServiceCategory[]>('/services/categories'),
  getServices: (params?: GetServicesParams) =>
    api.get<PaginatedResult<ServiceItem>>('/services', { params }),
  getService: (id: number) => api.get<ServiceItem>(`/services/${id}`),
};

// ─── Masters ──────────────────────────────────────────────────────────────────

export interface MasterUser { id: number; firstName: string; lastName: string; email: string }
export interface MasterDto {
  id: number;
  user: MasterUser;
  specialization: string | null;
  experienceYears: number;
  rating: number;
  bio: string | null;
  photo: string | null;
}

export interface ScheduleEntry { weekday: number; startTime: string; endTime: string; isActive: boolean }
export interface UpdateMasterPayload { specialization?: string; experienceYears?: number; bio?: string }

export const mastersApi = {
  getAll: (params?: PaginationParams) => api.get<PaginatedResult<MasterDto>>('/masters', { params }),
  getForServices: (serviceIds: number[]) =>
    api.get<PaginatedResult<MasterDto>>('/masters/for-services', { params: { serviceIds: serviceIds.join(',') } }),
  getWorkingDays: (id: number) => api.get<number[]>(`/masters/${id}/working-days`),
  getOne: (id: number) => api.get<MasterDto>(`/masters/${id}`),
  getSlots: (id: number, date: string, duration: number) =>
    api.get<string[]>(`/masters/${id}/slots`, { params: { date, duration } }),
  getSchedule: (id: number) => api.get<ScheduleEntry[]>(`/masters/${id}/schedule`),
  updateMyProfile: (data: UpdateMasterPayload) => api.patch<MasterDto>('/masters/me', data),
  getMySchedule: () => api.get<ScheduleEntry[]>('/masters/me/schedule'),
  setSchedule: (data: ScheduleEntry[]) => api.put<ScheduleEntry[]>('/masters/me/schedule', { schedule: data }),
  addDayOff: (date: string, reason?: string) =>
    api.post('/masters/me/days-off', { date, reason }),
  deleteDayOff: (id: number) => api.delete(`/masters/me/days-off/${id}`),
  addService: (serviceId: number, priceCoefficient?: number) =>
    api.post('/masters/me/services', { serviceId, priceCoefficient }),
  removeService: (serviceId: number) => api.delete(`/masters/me/services/${serviceId}`),
};

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin: string | null;
  mileage: number | null;
}

export interface CreateVehiclePayload {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin?: string;
}

export const vehiclesApi = {
  getAll: () => api.get<Vehicle[]>('/vehicles'),
  getOne: (id: number) => api.get<Vehicle>(`/vehicles/${id}`),
  create: (data: CreateVehiclePayload) => api.post<Vehicle>('/vehicles', data),
  update: (id: number, data: Partial<CreateVehiclePayload>) =>
    api.patch<Vehicle>(`/vehicles/${id}`, data),
  remove: (id: number) => api.delete(`/vehicles/${id}`),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface BookingServiceItem {
  id: number;
  service: ServiceItem;
  actualPrice: number;
  actualDurationMinutes: number | null;
}

export interface Booking {
  id: number;
  scheduledAt: string;
  estimatedDurationMinutes: number;
  status: BookingStatus;
  notes: string | null;
  totalPrice: string;
  client: { id: number; firstName: string; lastName: string; email: string };
  master: MasterDto;
  vehicle: Vehicle;
  bookingServices: BookingServiceItem[];
  createdAt: string;
}

export interface CreateBookingPayload {
  masterId: number;
  vehicleId: number;
  serviceIds: number[];
  scheduledAt: string;
  notes?: string;
}

export interface BookingFilterParams extends PaginationParams {
  status?: BookingStatus;
  from?: string;
  to?: string;
}

export interface BookingStatusHistoryItem {
  id: number;
  oldStatus: BookingStatus | null;
  newStatus: BookingStatus;
  changedAt: string;
  comment: string | null;
}

export const bookingsApi = {
  create: (data: CreateBookingPayload) => api.post<Booking>('/bookings', data),
  getAll: (params?: BookingFilterParams) =>
    api.get<PaginatedResult<Booking>>('/bookings', { params }),
  getOne: (id: number) => api.get<Booking>(`/bookings/${id}`),
  updateStatus: (id: number, status: BookingStatus, comment?: string) =>
    api.patch<Booking>(`/bookings/${id}/status`, { status, comment }),
  cancel: (id: number) => api.post(`/bookings/${id}/cancel`),
  getHistory: (id: number) => api.get<BookingStatusHistoryItem[]>(`/bookings/${id}/history`),
  forceDelete: (id: number) => api.delete<{ message: string }>(`/bookings/${id}/force`),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  client: { id: number; firstName: string; lastName: string };
}

export interface CreateReviewPayload {
  bookingId: number;
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  create: (data: CreateReviewPayload) => api.post<Review>('/reviews', data),
  getForMaster: (masterId: number) => api.get<Review[]>(`/reviews/master/${masterId}`),
  getForBooking: (bookingId: number) => api.get<Review | null>(`/reviews/booking/${bookingId}`),
};

// ─── Intelligence ─────────────────────────────────────────────────────────────

export interface SlotSuggestion {
  masterId: number;
  masterName: string;
  startAt: string;
  endAt: string;
  score: number;
  reasons: string[];
}

export interface SuggestSlotsResponse {
  suggestions: SlotSuggestion[];
  estimatedDurationMinutes: number;
}

export interface MasterRecommendation {
  masterId: number;
  masterName: string;
  score: number;
  reasons: string[];
  specialization: string | null;
  experienceYears: number;
  rating: number;
}

export interface RecommendationsResponse {
  recommendations: MasterRecommendation[];
}

export interface DurationEstimateResponse {
  serviceId: number;
  masterId: number | null;
  baseDurationMinutes: number;
  masterCoeff: number;
  vehicleAgeCoeff: number;
  seasonCoeff: number;
  estimatedDurationMinutes: number;
}

export interface DurationEstimateMultiServiceBreakdown {
  serviceId: number;
  serviceName: string;
  baseDurationMinutes: number;
  estimatedMinutes: number;
}

export interface DurationEstimateMultiResponse {
  totalBaseMinutes: number;
  totalEstimatedMinutes: number;
  vehicleAgeCoeff: number;
  seasonCoeff: number;
  masterCoeff: number;
  services: DurationEstimateMultiServiceBreakdown[];
}

export const intelligenceApi = {
  suggestSlots: (serviceId: number, preferredDate: string, vehicleYear?: number, serviceIds?: number[]) =>
    api.get<SuggestSlotsResponse>('/intelligence/suggest-slots', {
      params: { serviceId, preferredDate, vehicleYear, serviceIds: serviceIds?.join(',') },
    }),
  getRecommendations: (serviceId: number) =>
    api.get<RecommendationsResponse>('/intelligence/recommendations', {
      params: { serviceId },
    }),
  estimateDuration: (serviceId: number, masterId?: number, vehicleYear?: number) =>
    api.get<DurationEstimateResponse>('/intelligence/estimate-duration', {
      params: { serviceId, masterId, vehicleYear },
    }),
  estimateDurationMulti: (serviceIds: number[], masterId?: number, vehicleYear?: number) =>
    api.get<DurationEstimateMultiResponse>('/intelligence/estimate-duration-multi', {
      params: { serviceIds: serviceIds.join(','), masterId, vehicleYear },
    }),
};

// ─── Admin / Users ────────────────────────────────────────────────────────────

export interface AdminUpdateUserPayload { role?: string; isBlocked?: boolean }
export interface CreateMasterPayload {
  firstName: string; lastName: string; email: string; phone?: string; password: string;
}

export interface UserDetailsDto extends UserDto {
  vehiclesCount: number;
  bookingsCount: number;
  masterProfile: { experienceYears: number; rating: number } | null;
}

export const adminUsersApi = {
  getAll: (params?: PaginationParams & { role?: string }) =>
    api.get<PaginatedResult<UserDto>>('/users', { params }),
  getOne: (id: number) => api.get<UserDto>(`/users/${id}`),
  getDetails: (id: number) => api.get<UserDetailsDto>(`/users/${id}/details`),
  update: (id: number, data: AdminUpdateUserPayload) => api.patch<UserDto>(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`),
  createMaster: (data: CreateMasterPayload) =>
    api.post<{ message: string }>('/users/create-master', data),
};

// ─── Admin / Services ─────────────────────────────────────────────────────────

export interface CreateCategoryPayload { name: string; description?: string }
export interface CreateServicePayload {
  categoryId: number; name: string; description?: string;
  basePrice: number; baseDurationMinutes: number;
}
export interface UpdateServicePayload extends Partial<CreateServicePayload> { isActive?: boolean }

export const adminServicesApi = {
  getAllServices: () => api.get<ServiceItem[]>('/services/admin/all'),
  createCategory: (data: CreateCategoryPayload) =>
    api.post<ServiceCategory>('/services/categories', data),
  updateCategory: (id: number, data: Partial<CreateCategoryPayload>) =>
    api.patch<ServiceCategory>(`/services/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/services/categories/${id}`),
  createService: (data: CreateServicePayload) => api.post<ServiceItem>('/services', data),
  updateService: (id: number, data: UpdateServicePayload) =>
    api.patch<ServiceItem>(`/services/${id}`, data),
  deleteService: (id: number) => api.delete(`/services/${id}`),
};

// ─── Admin / Masters ──────────────────────────────────────────────────────────

export const adminMastersApi = {
  setSchedule: (masterId: number, schedule: ScheduleEntry[]) =>
    api.patch(`/masters/${masterId}/schedule`, { schedule }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalUsers: number; totalClients: number; totalMasters: number;
  totalBookings: number; bookingsToday: number; bookingsThisMonth: number;
  pendingBookings: number; totalRevenue: number; revenueToday: number;
  revenueThisMonth: number; avgRating: number;
}
export interface RevenuePoint { period: string; revenue: number; count: number }
export interface MasterLoad {
  masterId: number; masterName: string; totalBookings: number;
  completedBookings: number; totalRevenue: number; avgRating: number; loadPercent: number;
}
export interface TopService {
  serviceId: number; serviceName: string; categoryName: string;
  bookingCount: number; revenue: number; avgPrice: number;
}
export interface ClientsRetention {
  newClients: number; returningClients: number; churnedClients: number;
  totalClients: number; avgBookingsPerClient: number;
}
export interface FunnelEntry { status: string; count: number; percent: number }

export const analyticsApi = {
  getSummary: () => api.get<AnalyticsSummary>('/analytics/summary'),
  getRevenue: (params?: { from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' }) =>
    api.get<RevenuePoint[]>('/analytics/revenue', { params }),
  getMasterLoad: (params?: { from?: string; to?: string }) =>
    api.get<MasterLoad[]>('/analytics/master-load', { params }),
  getTopServices: (limit = 10) =>
    api.get<TopService[]>('/analytics/top-services', { params: { limit } }),
  getClientsRetention: () => api.get<ClientsRetention>('/analytics/clients-retention'),
  getBookingFunnel: () => api.get<FunnelEntry[]>('/analytics/booking-funnel'),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationDto {
  id: number; type: string; title: string; body: string;
  sentAt: string | null; readAt: string | null;
}

export const notificationsApi = {
  getAll: () => api.get<NotificationDto[]>('/notifications'),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
};
