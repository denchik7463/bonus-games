import type { RoomStatus as DomainRoomStatus } from "@/lib/domain/types";
import type { BackendGameMechanic } from "@/src/shared/config/game-mechanics";

export type BackendRoomStatus = "WAITING" | "FULL" | "FINISHED" | "CANCELLED" | string;
export type RoomStatus = BackendRoomStatus;

export type RoomPlayerDto = {
  id?: string;
  userId?: string;
  playerId?: string;
  username?: string;
  name?: string;
  displayName?: string;
  bot?: boolean;
  isBot?: boolean;
  boostUsed?: boolean;
  bonusUsed?: boolean;
  weight?: number;
};

export type RoomDto = {
  id: string;
  templateId?: string;
  templateName?: string;
  maxPlayers?: number;
  entryCost?: number;
  prizeFund?: number;
  bonusEnabled?: boolean;
  bonusPrice?: number;
  bonusWeight?: number;
  boostAllowed?: boolean;
  timerSeconds?: number;
  status: BackendRoomStatus;
  currentPlayers?: number;
  botCount?: number;
  createdAt: string;
  finishedAt?: string | null;
  gameMechanic?: BackendGameMechanic | string;
  players?: RoomPlayerDto[];
  participants?: RoomPlayerDto[];
};

export type CreateRoomRequest = {
  templateId: string;
};

export type JoinByTemplateRequest = {
  templateId: string;
};

export type FilterRoomsParams = {
  maxPlayers?: number;
  entryCost?: number;
  boostAllowed?: boolean;
};

export type JoinRoomParams = {
  roomId: string;
  boostUsed?: boolean;
};

export type RoomJoinResult = {
  ok: true;
};

export type ActivateBoostParams = {
  roomId: string;
};

export type FinishRoomRequest = {
  baseWeight: number;
  boostBonus: number;
};

export type CancelRoomParams = {
  roomId: string;
  reason: string;
};

export type RoomEventDto = {
  id?: string;
  roomId?: string;
  type?: string;
  eventType?: string;
  message?: string;
  payload?: unknown;
  createdAt?: string;
  timestamp?: string;
};

export type RoomUiStatus = DomainRoomStatus;
