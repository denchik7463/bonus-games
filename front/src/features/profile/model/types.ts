import type { BackendRole, AuthBalanceDto } from "@/src/features/auth/model/types";

export type ProfileMeResponseDto = {
  userId: string;
  username: string;
  role: BackendRole;
  balance: AuthBalanceDto;
};

export type CurrentProfile = {
  userId: string;
  username: string;
  role: BackendRole;
  balance: AuthBalanceDto;
};
