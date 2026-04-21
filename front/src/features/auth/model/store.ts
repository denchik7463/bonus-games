"use client";

import { create } from "zustand";
import { loginUser } from "@/src/features/auth/api/login";
import { registerUser } from "@/src/features/auth/api/register";
import { getMe } from "@/src/features/profile/api/getMe";
import { clearStoredSession, getStoredSession, saveSession } from "@/src/features/auth/lib/token";
import type { AuthResponseDto, AuthSession, BackendRole, LoginRequestDto, RegisterRequestDto } from "@/src/features/auth/model/types";
import type { CurrentProfile, ProfileMeResponseDto } from "@/src/features/profile/model/types";

type AuthStatus = "idle" | "authenticated" | "anonymous";

type AuthState = {
  session: AuthSession | null;
  profile: CurrentProfile | null;
  status: AuthStatus;
  login: (payload: LoginRequestDto) => Promise<CurrentProfile>;
  register: (payload: RegisterRequestDto) => Promise<void>;
  restoreSession: () => Promise<CurrentProfile | null>;
  logout: () => void;
};

type AuthStore = AuthState & {
  refreshProfile: (session: AuthSession) => Promise<CurrentProfile>;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  profile: null,
  status: "idle",
  login: async (payload) => {
    const response = await loginUser(payload);
    const session = sessionFromAuthResponse(response);
    saveSession(session);
    set({ session, status: "authenticated" });
    return get().refreshProfile(session);
  },
  register: async (payload) => {
    await registerUser(payload);
    clearStoredSession();
    set({ session: null, profile: null, status: "anonymous" });
  },
  restoreSession: async () => {
    const session = getStoredSession();
    if (!session) {
      set({ session: null, profile: null, status: "anonymous" });
      return null;
    }

    set({ session, status: "authenticated" });
    try {
      return await get().refreshProfile(session);
    } catch {
      clearStoredSession();
      set({ session: null, profile: null, status: "anonymous" });
      return null;
    }
  },
  logout: () => {
    clearStoredSession();
    set({ session: null, profile: null, status: "anonymous" });
  },
  refreshProfile: async (session: AuthSession) => {
    const profile = profileFromMeResponse(await getMe());
    set({ profile, session: { ...session, role: profile.role }, status: "authenticated" });
    saveSession({ ...session, role: profile.role });
    return profile;
  }
}));

function sessionFromAuthResponse(response: AuthResponseDto, fallbackRole: BackendRole = "USER"): AuthSession {
  return {
    userId: response.userId,
    username: response.username,
    token: response.token,
    expiresAt: response.expiresAt,
    role: response.role ?? fallbackRole
  };
}

function profileFromMeResponse(response: ProfileMeResponseDto): CurrentProfile {
  return {
    userId: response.userId,
    username: response.username,
    role: response.role,
    balance: response.balance
  };
}
