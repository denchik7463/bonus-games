"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Round, TestUser } from "@/lib/domain/types";

const loggedOutUser: TestUser = {
  id: "guest",
  name: "Гость",
  handle: "@guest",
  tier: "Gold",
  balance: 0,
  reservedBalance: 0,
  totalBalance: 0,
  avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%23101218'/%3E%3Ccircle cx='60' cy='46' r='20' fill='%23ffcd18'/%3E%3Cpath d='M28 104c6-22 18-34 32-34s26 12 32 34' fill='%23ffcd18' opacity='.72'/%3E%3C/svg%3E",
  riskStyle: "calm",
  role: "player"
};

function normalizeAvatar(user: TestUser): TestUser {
  if (user.avatar.startsWith("/avatars/")) return user;
  const localAvatar = user.role === "admin" ? "/avatars/admin.jpg" : user.role === "expert" ? "/avatars/expert.jpg" : "/avatars/player.jpg";
  return { ...user, avatar: localAvatar };
}

type AppState = {
  user: TestUser;
  settledRoundIds: string[];
  setUser: (user: TestUser) => void;
  updateUser: (user: TestUser) => void;
  settleRound: (round: Round) => void;
  logout: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: loggedOutUser,
      settledRoundIds: [],
      setUser: (user) => set({ user: normalizeAvatar(user), settledRoundIds: [] }),
      updateUser: (user) => set({ user: normalizeAvatar(user) }),
      settleRound: (round) =>
        set((state) => {
          if (state.settledRoundIds.includes(round.id) || state.user.id !== round.userId) return state;
          return {
            user: { ...state.user, balance: Math.max(0, state.user.balance + round.balanceDelta) },
            settledRoundIds: [...state.settledRoundIds, round.id]
          };
        }),
      logout: () => set({ user: loggedOutUser, settledRoundIds: [] })
    }),
    {
      name: "vip-quick-rooms-store",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        const state = persistedState as Partial<AppState> & { activeRoom?: unknown; activeRound?: unknown };
        delete state.activeRoom;
        delete state.activeRound;
        return {
          ...state,
          user: state.user ? normalizeAvatar(state.user) : loggedOutUser
        };
      },
      partialize: (state) => ({
        user: state.user,
        settledRoundIds: state.settledRoundIds
      })
    }
  )
);
