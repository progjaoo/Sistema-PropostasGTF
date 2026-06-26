import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GetMeResponse as User } from '@workspace/api-client-react';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'proposta-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
