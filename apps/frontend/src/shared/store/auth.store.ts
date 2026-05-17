import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  email: string;
  role: 'CLIENT' | 'MASTER' | 'ADMIN';
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      updateUser: (partial) => set((s) => ({ user: s.user ? { ...s.user, ...partial } : s.user })),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ refreshToken: s.refreshToken, accessToken: s.accessToken, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
