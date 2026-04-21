export type VipTier = "Gold" | "Platinum" | "Black Diamond";
export type RoomStatus = "open" | "matching" | "ready" | "running" | "closed";
export type RoomLifecyclePhase = "idle" | "reserved" | "countdown" | "bot-fill" | "launching" | "expired" | "error";
export type ParticipantKind = "user" | "bot";
export type RoundPhase = "intro" | "live" | "suspense" | "reveal" | "result";
export type GameMode = "arena-sprint" | "duel-clash" | "claw-machine" | "slot-reveal";
export type DemoRole = "player" | "expert" | "admin";
export type RoomKind = "active" | "auto-created";

export type TestUser = {
  id: string;
  name: string;
  handle: string;
  tier: VipTier;
  balance: number;
  reservedBalance?: number;
  totalBalance?: number;
  avatar: string;
  riskStyle: "calm" | "balanced" | "bold";
  role: DemoRole;
};

export type Participant = {
  id: string;
  name: string;
  kind: ParticipantKind;
  avatar: string;
  vipTier?: VipTier;
  hasBoost: boolean;
  weight: number;
};

export type WinningCombination = {
  id: string;
  label: string;
  rarity: "signature" | "rare" | "mythic";
  tokens: string[];
  palette: string[];
};

export type RoomConfig = {
  title: string;
  mode: GameMode;
  entryCost: number;
  boostCost: number;
  boostLabel: string;
  boostImpact: string;
  boostEnabled: boolean;
  prizePoolPercent: number;
  seats: number;
  reservedUntilSec: number;
  volatility: number;
};

export type RoomTemplate = RoomConfig & {
  id: string;
  templateVisible?: boolean;
  recommendedFor: VipTier[];
};

export type Room = RoomConfig & {
  id: string;
  publicId: string;
  inviteUrl: string;
  kind: RoomKind;
  sourceTemplateId?: string;
  status: RoomStatus;
  occupied: number;
  prizePool: number;
  recommendedFor: VipTier[];
  fillRate: number;
  participants: Participant[];
};

export type Round = {
  id: string;
  roomId: string;
  roomPublicId: string;
  roomTitle: string;
  mode: GameMode;
  startedAt: string;
  entryCost: number;
  boostUsed: boolean;
  boostCost: number;
  boostImpact: string;
  prizePoolPercent: number;
  roomVolatility: number;
  prizePool: number;
  participants: Participant[];
  winnerId: string;
  userId: string;
  balanceDelta: number;
  balanceChanges: RoundBalanceChange[];
  combination: WinningCombination;
  auditTrail: string[];
};

export type RoundBalanceChange = {
  participantId: string;
  participantName: string;
  kind: ParticipantKind;
  delta: number;
  reason: "entry-reserve" | "boost" | "prize";
};

export type MatchmakingParams = {
  entryCost: number;
  seats: number;
  boostDesired: boolean;
  volatility: number;
};

export type AdminRoomConfig = {
  title: string;
  mode: GameMode;
  entryCost: number;
  seats: number;
  boostCost: number;
  boostEnabled: boolean;
  boostWeight: number;
  prizePoolPercent: number;
  botFillDelay: number;
  volatility: number;
  templateVisible?: boolean;
};
