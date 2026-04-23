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
  playerOrder?: number;
  seatNumber?: number;
  positionIndex?: number;
  seat?: number;
  seatIndex?: number;
  place?: number;
  winner?: boolean;
  status?: string;
  joinTime?: string;
  boostReservationId?: string;
};

export type RoomDto = {
  id?: string;
  roomId?: string;
  shortId?: string;
  templateId?: string;
  templateName?: string;
  maxPlayers?: number;
  entryCost?: number;
  prizeFund?: number;
  bonusEnabled?: boolean;
  bonusPrice?: number;
  bonusCost?: number;
  boostPrice?: number;
  boostCost?: number;
  bonusWeight?: number;
  boostWeight?: number;
  currentChancePercent?: number;
  chanceWithBoostPercent?: number;
  boostAbsoluteGainPercent?: number;
  boostAllowed?: boolean;
  timerSeconds?: number;
  status?: BackendRoomStatus;
  currentPlayers?: number;
  botCount?: number;
  createdAt?: string;
  firstPlayerJoinedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  remainingSeconds?: number;
  gameResultId?: string;
  roundId?: string;
  resultId?: string;
  winnerPositionIndex?: number;
  winnerSeatNumber?: number;
  winnerSeat?: number;
  winnerPlayerExternalId?: string;
  winnerPlayerName?: string;
  gameMechanic?: BackendGameMechanic | string;
  mechanic?: BackendGameMechanic | string;
  gameMode?: BackendGameMechanic | string;
  gameType?: BackendGameMechanic | string;
  players?: RoomPlayerDto[];
  participants?: RoomPlayerDto[];
};

export type CreateRoomRequest = {
  templateId: string;
};

export type FindRoomRequest = {
  templateId?: string;
  maxPlayers: number;
  entryCost: number;
  boostAllowed: boolean;
  seats?: number[];
  seatsCount?: number;
};

export type FilterRoomsParams = {
  maxPlayers?: number;
  entryCost?: number;
  boostAllowed?: boolean;
};

export type JoinRoomParams = {
  roomId: string;
  seats?: number[];
  seatsCount?: number;
};

export type SimilarRoomRecommendationsParams = {
  priceDelta: number;
  limit: number;
};

export type RoomJoinResult = {
  ok: true;
};

export type ActivateBoostParams = {
  roomId: string;
  seatNumber: number;
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
  gameResultId?: string;
  roundId?: string;
  resultId?: string;
  type?: string;
  eventType?: string;
  eventTitle?: string;
  message?: string;
  payload?: unknown;
  payloadJson?: string;
  createdAt?: string;
  timestamp?: string;
};

export type RoomWsEventDto = {
  type: "ROOM_STATE" | "ROOM_EVENTS" | string;
  roomId: string;
  payload: RoomDto | RoomEventDto[] | unknown;
  sentAt?: string;
};

export type RoomUiStatus = DomainRoomStatus;
