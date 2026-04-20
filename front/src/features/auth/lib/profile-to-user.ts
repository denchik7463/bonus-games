import type { DemoRole, TestUser, VipTier } from "@/lib/domain/types";
import type { BackendRole } from "@/src/features/auth/model/types";
import type { CurrentProfile } from "@/src/features/profile/model/types";

export function profileToTestUser(profile: CurrentProfile): TestUser {
  return {
    id: profile.userId,
    name: profile.username,
    handle: `@${profile.username}`,
    tier: tierByRole(profile.role),
    balance: profile.balance.available,
    reservedBalance: profile.balance.reserved,
    totalBalance: profile.balance.total,
    avatar: avatarByRole(profile.role),
    riskStyle: profile.role === "ADMIN" ? "bold" : "balanced",
    role: demoRoleFromBackend(profile.role)
  };
}

export function demoRoleFromBackend(role: BackendRole): DemoRole {
  const roles: Record<BackendRole, DemoRole> = {
    USER: "player",
    EXPERT: "expert",
    ADMIN: "admin"
  };
  return roles[role];
}

function tierByRole(role: BackendRole): VipTier {
  if (role === "ADMIN") return "Black Diamond";
  if (role === "EXPERT") return "Platinum";
  return "Gold";
}

function avatarByRole(role: BackendRole) {
  if (role === "ADMIN") return "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80";
  if (role === "EXPERT") return "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80";
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80";
}
