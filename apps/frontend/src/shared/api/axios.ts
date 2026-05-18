import axios, { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  // Required for the httpOnly refreshToken cookie to be sent cross-origin
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const url = original.url ?? '';
    // Skip refresh for auth endpoints and when already retried
    if (
      error.response?.status !== 401 ||
      original._retry ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    // No user in store — user is not logged in, just reject without redirect
    if (!useAuthStore.getState().user) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then(() => api(original))
        .catch((e) => Promise.reject(e));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Cookie is sent automatically — no body needed
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
      useAuthStore.getState().setAccessToken(data.accessToken);
      processQueue(null);
      return api(original);
    } catch (err) {
      processQueue(err);
      useAuthStore.getState().logout();
      // Do NOT use window.location.href here — it causes a full page reload
      // which resets React state (forms, etc.). ProtectedRoute will handle
      // the redirect to /login reactively once the store is cleared.
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
