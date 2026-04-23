import type { Participant, Room, RoomTemplate, TestUser } from "@/lib/domain/types";
import { modeFromBackendMechanic } from "@/src/shared/config/game-mechanics";
import type { CreateRoomRequest, RoomDto, RoomPlayerDto, RoomUiStatus } from "@/src/features/rooms/model/types";

export function roomDtoToDomain(dto: RoomDto, currentUser?: TestUser, template?: RoomTemplate): Room {
  const roomId = dto.roomId ?? dto.id ?? "";
  const participants = buildParticipants(dto, currentUser);
  const maxPlayers = dto.maxPlayers ?? template?.seats ?? Math.max(participants.length, 1);
  const entryCost = dto.entryCost ?? template?.entryCost ?? 0;
  const boostEnabled = dto.boostAllowed ?? dto.bonusEnabled ?? template?.boostEnabled ?? false;
  const occupied = Math.max(dto.currentPlayers ?? 0, participants.length);
  const boostAbsoluteGainPercent = normalizePercent(dto.boostAbsoluteGainPercent);
  const currentChancePercent = normalizePercent(dto.currentChancePercent);
  const chanceWithBoostPercent = normalizePercent(dto.chanceWithBoostPercent);
  const boostCost = boostEnabled
    ? nonNegativeNumber(dto.boostPrice)
      ?? nonNegativeNumber(dto.boostCost)
      ?? nonNegativeNumber(dto.bonusPrice)
      ?? nonNegativeNumber(dto.bonusCost)
      ?? template?.boostCost
      ?? 0
    : 0;
  const boostWeight = nonNegativeNumber(dto.boostWeight) ?? nonNegativeNumber(dto.bonusWeight);
  return {
    id: roomId,
    publicId: dto.shortId ?? publicIdFromRoomId(roomId),
    inviteUrl: `/room/${roomId}`,
    kind: "active",
    status: mapRoomStatus(dto.status, occupied, maxPlayers),
    backendStatus: dto.status,
    timerSeconds: dto.timerSeconds ?? 60,
    occupied,
    participants,
    prizePool: positiveNumber(dto.prizeFund) ?? entryCost * maxPlayers,
    fillRate: maxPlayers > 0 ? Math.min(100, Math.round((occupied / maxPlayers) * 100)) : 0,
    title: dto.templateName ?? template?.title ?? `Комната ${maxPlayers}x${entryCost}`,
    mode: dto.gameMechanic || dto.mechanic || dto.gameMode || dto.gameType
      ? modeFromBackendMechanic(dto.gameMechanic ?? dto.mechanic ?? dto.gameMode ?? dto.gameType)
      : template?.mode ?? "arena-sprint",
    entryCost,
    boostCost,
    boostLabel: boostEnabled ? template?.boostLabel ?? "Буст участия" : "Буст отключен",
    boostImpact: boostEnabled
      ? boostAbsoluteGainPercent !== undefined
        ? `+${formatPercent(boostAbsoluteGainPercent)}% к шансу победы`
        : boostWeight
          ? `+${formatPercent(boostWeight)}% к весу участия`
          : template?.boostImpact ?? "+10% к весу участия"
      : "буст отключен",
    boostEnabled,
    boostAbsoluteGainPercent,
    currentChancePercent,
    chanceWithBoostPercent,
    prizePoolPercent: template?.prizePoolPercent ?? 100,
    seats: maxPlayers,
    reservedUntilSec: roomRemainingSeconds(dto),
    volatility: template?.volatility ?? 62,
    recommendedFor: template?.recommendedFor ?? ["Gold", "Platinum", "Black Diamond"],
    firstPlayerJoinedAt: dto.firstPlayerJoinedAt,
    startedAt: dto.startedAt,
    finishedAt: dto.finishedAt,
    gameResultId: dto.gameResultId,
    roundId: dto.roundId,
    resultId: dto.resultId,
    winnerPositionIndex: roomWinnerSeat(dto)
  };
}

export function roomTemplateToCreateRequest(params: { id: string }): CreateRoomRequest {
  return {
    templateId: params.id
  };
}

function buildParticipants(dto: RoomDto, currentUser?: TestUser): Participant[] {
  const sourcePlayers = dto.players ?? dto.participants ?? [];
  const roomId = dto.roomId ?? dto.id ?? "room";
  const seats = buildUniqueRoomSeats(sourcePlayers);
  const participants: Participant[] = sourcePlayers.map((player, index) => playerDtoToParticipant(player, roomId, index, currentUser, seats[index]));

  return participants.slice(0, dto.maxPlayers ?? participants.length);
}

function mapRoomStatus(status: string | undefined, occupied: number, maxPlayers: number): RoomUiStatus {
  if (status === "FINISHED" || status === "CANCELLED") return "closed";
  if (status === "FULL" || occupied >= maxPlayers) return "ready";
  if (status === "WAITING") return occupied > 0 ? "matching" : "open";
  return "open";
}

function playerDtoToParticipant(player: RoomPlayerDto, roomId: string, index: number, currentUser: TestUser | undefined, seatNumber: number | undefined): Participant {
  const userId = player.userId ?? player.playerId ?? player.id;
  const id = participantId(roomId, userId, seatNumber, index);
  if (currentUser && userId === currentUser.id) {
    return {
      ...currentUserParticipant(currentUser, id),
      userId: currentUser.id,
      hasBoost: player.boostUsed ?? player.bonusUsed ?? false,
      weight: player.weight ?? 1,
      seatNumber,
      status: player.status,
      winner: player.winner
    };
  }
  const name = player.username ?? player.displayName ?? player.name ?? "Участник";
  const isBot = player.bot ?? player.isBot ?? false;
  return {
    id,
    userId,
    name,
    kind: isBot ? "bot" : "user",
    avatar: name.slice(0, 1).toUpperCase(),
    hasBoost: player.boostUsed ?? player.bonusUsed ?? false,
    weight: player.weight ?? 1,
    seatNumber,
    status: player.status,
    winner: player.winner
  };
}

function rawPlayerSeatNumber(player: RoomPlayerDto) {
  return player.seatNumber
    ?? player.positionIndex
    ?? player.playerOrder
    ?? player.seat
    ?? player.seatIndex
    ?? player.place;
}

function roomWinnerSeat(dto: RoomDto) {
  return normalizeSeatNumber(dto.winnerPositionIndex
    ?? dto.winnerSeatNumber
    ?? dto.winnerSeat);
}

function currentUserParticipant(currentUser: TestUser, id: string): Participant {
  return {
    id,
    userId: currentUser.id,
    name: currentUser.name,
    kind: "user",
    avatar: currentUser.avatar,
    vipTier: currentUser.tier,
    hasBoost: false,
    weight: 1
  };
}

function participantId(roomId: string, userId: string | undefined, seatNumber: number | undefined, index: number) {
  const owner = userId ?? `participant-${index}`;
  const seat = typeof seatNumber === "number" ? `seat-${seatNumber}` : `order-${index + 1}`;
  return `${roomId}-${owner}-${seat}`;
}

function publicIdFromRoomId(id: string) {
  return id.replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 6).toUpperCase() || "ROOM";
}

function roomRemainingSeconds(dto: RoomDto) {
  const timerSeconds = dto.timerSeconds ?? 60;
  if (!dto.firstPlayerJoinedAt) return timerSeconds;

  if (typeof dto.remainingSeconds === "number" && Number.isFinite(dto.remainingSeconds)) {
    return Math.max(0, dto.remainingSeconds);
  }

  const firstJoinMs = Date.parse(dto.firstPlayerJoinedAt);
  if (!Number.isFinite(firstJoinMs)) return timerSeconds;
  const elapsed = Math.floor((Date.now() - firstJoinMs) / 1000);
  return Math.max(0, timerSeconds - elapsed);
}

function normalizeSeatNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value <= 0 ? value + 1 : value;
}

function buildUniqueRoomSeats(players: RoomPlayerDto[]) {
  const rawSeats = players.map(rawPlayerSeatNumber);
  const zeroBased = rawSeats.some((seat) => seat === 0);
  const used = new Set<number>();
  return players.map((player, index) => {
    const rawSeat = rawPlayerSeatNumber(player);
    const candidate = typeof rawSeat === "number" && Number.isFinite(rawSeat)
      ? Math.max(1, zeroBased ? rawSeat + 1 : rawSeat)
      : undefined;
    if (candidate && !used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    let fallback = index + 1;
    while (used.has(fallback)) fallback += 1;
    used.add(fallback);
    return fallback;
  });
}

function normalizePercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function positiveNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function nonNegativeNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
