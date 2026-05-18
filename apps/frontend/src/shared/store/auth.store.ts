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
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setAuth: (user: AuthUser, accessToken: string) => void;
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
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      updateUser: (partial) => set((s) => ({ user: s.user ? { ...s.user, ...partial } : s.user })),
      logout: () => set({ user: null, accessToken: null }),
      isAuthenticated: () => !!get().user,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
