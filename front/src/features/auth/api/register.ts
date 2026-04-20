import { apiPost } from "@/src/shared/api/client";
import type { AuthResponseDto, RegisterRequestDto } from "@/src/features/auth/model/types";

export function registerUser(payload: RegisterRequestDto) {
  return apiPost<AuthResponseDto, RegisterRequestDto>("/api/auth/register", payload);
}
