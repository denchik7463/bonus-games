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
  if (role === "ADMIN") return "/avatars/admin.jpg";
  if (role === "EXPERT") return "/avatars/expert.jpg";
  return "/avatars/player.jpg";
}
