import { apiPost } from "@/src/shared/api/client";
import type { AuthResponseDto, LoginRequestDto } from "@/src/features/auth/model/types";

export function loginUser(payload: LoginRequestDto) {
  return apiPost<AuthResponseDto, LoginRequestDto>("/api/auth/login", payload);
}
