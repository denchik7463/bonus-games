import type { BackendGameMechanic } from "@/src/shared/config/game-mechanics";

export type JournalParticipantDto = {
  positionIndex?: number;
  playerExternalId?: string;
  username?: string;
  bot?: boolean;
  boostUsed?: boolean;
  finalWeight?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  balanceDelta?: number;
  status?: "WINNER" | "LOST" | string;
  winner?: boolean;
};

export type JournalEventDto = {
  id?: string;
  roomId?: string;
  gameResultId?: string;
  eventType?: string;
  eventTitle?: string;
  description?: string;
  payloadJson?: string;
  actorUserId?: string | null;
  actorUsername?: string | null;
  actorRole?: string | null;
  createdAt?: string;
};

export type JournalEntryDto = {
  id: string;
  roomId: string;
  maxPlayers?: number;
  entryCost?: number;
  prizeFund?: number;
  boostAllowed?: boolean;
  botCount?: number;
  roomStatus?: string;
  winnerPlayerExternalId?: string;
  winnerPlayerName?: string;
  winnerPositionIndex?: number;
  baseWeight?: number | null;
  boostBonus?: number | null;
  totalWeight?: number | null;
  roll?: number | null;
  randomHash?: string | null;
  randomSeed?: string | null;
  createdAt?: string;
  gameMechanic?: BackendGameMechanic | string;
  participants?: JournalParticipantDto[];
  events?: JournalEventDto[];
};

export type JournalFilterParams = {
  roomId?: string;
};
