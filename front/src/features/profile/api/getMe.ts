import { apiGet } from "@/src/shared/api/client";
import type { ProfileMeResponseDto } from "@/src/features/profile/model/types";

export function getMe() {
  return apiGet<ProfileMeResponseDto>("/api/profile/me");
}
