"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Room, Round, TestUser } from "@/lib/domain/types";

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

type AppState = {
  user: TestUser;
  activeRoom?: Room;
  activeRound?: Round;
  settledRoundIds: string[];
  setUser: (user: TestUser) => void;
  updateUser: (user: TestUser) => void;
  setActiveRoom: (room?: Room) => void;
  setActiveRound: (round?: Round) => void;
  settleRound: (round: Round) => void;
  logout: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: loggedOutUser,
      activeRoom: undefined,
      activeRound: undefined,
      settledRoundIds: [],
      setUser: (user) => set({ user, activeRoom: undefined, activeRound: undefined, settledRoundIds: [] }),
      updateUser: (user) => set({ user }),
      setActiveRoom: (activeRoom) => set({ activeRoom }),
      setActiveRound: (activeRound) => set({ activeRound }),
      settleRound: (round) =>
        set((state) => {
          if (state.settledRoundIds.includes(round.id) || state.user.id !== round.userId) return state;
          return {
            user: { ...state.user, balance: Math.max(0, state.user.balance + round.balanceDelta) },
            settledRoundIds: [...state.settledRoundIds, round.id]
          };
        }),
      logout: () => set({ user: loggedOutUser, activeRoom: undefined, activeRound: undefined, settledRoundIds: [] })
    }),
    {
      name: "vip-quick-rooms-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        activeRoom: state.activeRoom,
        activeRound: state.activeRound,
        settledRoundIds: state.settledRoundIds
      })
    }
  )
);
