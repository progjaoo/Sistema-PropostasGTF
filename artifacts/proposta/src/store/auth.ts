import { create } from 'zustand';
import type { User } from '@workspace/api-client-react';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  bootstrapped: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  markBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  bootstrapped: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  markBootstrapped: () => set({ bootstrapped: true }),
}));
