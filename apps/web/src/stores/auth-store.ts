"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, AuthTokens } from "@realestate/shared";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isHydrated: boolean;
  setAuth: (payload: { user: User; tokens: AuthTokens }) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isHydrated: false,
      setAuth: ({ user, tokens }) => set({ user, tokens }),
      clear: () => set({ user: null, tokens: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "res-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, tokens: state.tokens }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
