export type BackendRole = "USER" | "EXPERT" | "ADMIN";

export type AuthBalanceDto = {
  available: number;
  reserved: number;
  total: number;
};

export type AuthResponseDto = {
  userId: string;
  username: string;
  token: string;
  expiresAt: string;
  role?: BackendRole;
  balance: AuthBalanceDto;
};

export type RegisterRequestDto = {
  username: string;
  password: string;
  initialBalance: number;
  role: BackendRole;
};

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type AuthSession = {
  userId: string;
  username: string;
  token: string;
  expiresAt: string;
  role: BackendRole;
};
