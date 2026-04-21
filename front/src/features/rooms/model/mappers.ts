import type { Participant, Room, RoomTemplate, TestUser } from "@/lib/domain/types";
import { modeFromBackendMechanic } from "@/src/shared/config/game-mechanics";
import type { CreateRoomRequest, RoomDto, RoomPlayerDto, RoomUiStatus } from "@/src/features/rooms/model/types";

export function roomDtoToDomain(dto: RoomDto, currentUser?: TestUser, includeCurrentUser = false, template?: RoomTemplate): Room {
  const participants = buildParticipants(dto, currentUser, includeCurrentUser);
  const maxPlayers = dto.maxPlayers ?? template?.seats ?? Math.max(participants.length, 1);
  const entryCost = dto.entryCost ?? template?.entryCost ?? 0;
  const boostEnabled = dto.boostAllowed ?? dto.bonusEnabled ?? template?.boostEnabled ?? false;
  const occupied = Math.max(dto.currentPlayers ?? 0, participants.length);
  return {
    id: dto.id,
    publicId: publicIdFromRoomId(dto.id),
    inviteUrl: `/room/${dto.id}`,
    kind: "active",
    status: mapRoomStatus(dto.status, occupied, maxPlayers),
    occupied,
    participants,
    prizePool: dto.prizeFund ?? entryCost * maxPlayers,
    fillRate: maxPlayers > 0 ? Math.min(100, Math.round((occupied / maxPlayers) * 100)) : 0,
    title: dto.templateName ?? template?.title ?? `Комната ${maxPlayers}x${entryCost}`,
    mode: dto.gameMechanic ? modeFromBackendMechanic(dto.gameMechanic) : template?.mode ?? "arena-sprint",
    entryCost,
    boostCost: boostEnabled ? dto.bonusPrice ?? template?.boostCost ?? Math.max(0, Math.round(entryCost * 0.2)) : 0,
    boostLabel: boostEnabled ? template?.boostLabel ?? "Буст участия" : "Буст отключен",
    boostImpact: boostEnabled ? dto.bonusWeight ? `+${dto.bonusWeight}% к весу участия` : template?.boostImpact ?? "+10% к весу участия" : "буст отключен",
    boostEnabled,
    prizePoolPercent: template?.prizePoolPercent ?? 100,
    seats: maxPlayers,
    reservedUntilSec: remainingSeconds(dto.createdAt, dto.timerSeconds ?? 60),
    volatility: template?.volatility ?? 62,
    recommendedFor: template?.recommendedFor ?? ["Gold", "Platinum", "Black Diamond"]
  };
}

export function roomTemplateToCreateRequest(params: { id: string }): CreateRoomRequest {
  return {
    templateId: params.id
  };
}

function buildParticipants(dto: RoomDto, currentUser?: TestUser, includeCurrentUser = false): Participant[] {
  const sourcePlayers = dto.players ?? dto.participants ?? [];
  const participants: Participant[] = sourcePlayers.map((player, index) => playerDtoToParticipant(player, dto.id, index, currentUser));
  if (includeCurrentUser && currentUser) {
    const existingIndex = participants.findIndex((participant) => participant.id === currentUser.id);
    if (existingIndex >= 0) participants[existingIndex] = { ...participants[existingIndex], ...currentUserParticipant(currentUser), hasBoost: participants[existingIndex].hasBoost };
    else if (participants.length > 0 && isAnonymousParticipant(participants[0])) participants[0] = currentUserParticipant(currentUser);
    else participants.unshift(currentUserParticipant(currentUser));
  }

  const anonymousCount = Math.max(0, (dto.currentPlayers ?? 0) - participants.length);
  for (let index = 0; index < anonymousCount; index += 1) {
    participants.push({
      id: `player-${dto.id}-${index}`,
      name: `Игрок ${index + 1}`,
      kind: "user",
      avatar: "И",
      hasBoost: false,
      weight: 1
    });
  }

  return participants.slice(0, dto.maxPlayers ?? participants.length);
}

function mapRoomStatus(status: string, occupied: number, maxPlayers: number): RoomUiStatus {
  if (status === "RUNNING") return "running";
  if (status === "FINISHED" || status === "CLOSED" || status === "CANCELLED") return "closed";
  if (status === "FULL" || occupied >= maxPlayers) return "ready";
  if (status === "WAITING") return occupied > 0 ? "matching" : "open";
  return "open";
}

function playerDtoToParticipant(player: RoomPlayerDto, roomId: string, index: number, currentUser?: TestUser): Participant {
  const id = player.userId ?? player.playerId ?? player.id ?? `player-${roomId}-${index}`;
  if (currentUser && id === currentUser.id) {
    return { ...currentUserParticipant(currentUser), hasBoost: player.boostUsed ?? player.bonusUsed ?? false, weight: player.weight ?? 1 };
  }
  const name = player.username ?? player.displayName ?? player.name ?? `Игрок ${index + 1}`;
  const isBot = player.bot ?? player.isBot ?? false;
  return {
    id,
    name,
    kind: isBot ? "bot" : "user",
    avatar: name.slice(0, 1).toUpperCase(),
    hasBoost: player.boostUsed ?? player.bonusUsed ?? false,
    weight: player.weight ?? 1
  };
}

function currentUserParticipant(currentUser: TestUser): Participant {
  return {
    id: currentUser.id,
    name: currentUser.name,
    kind: "user",
    avatar: currentUser.avatar,
    vipTier: currentUser.tier,
    hasBoost: false,
    weight: 1
  };
}

function publicIdFromRoomId(id: string) {
  return id.replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 6).toUpperCase() || "ROOM";
}

function remainingSeconds(createdAt: string, timerSeconds: number) {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return timerSeconds;
  const elapsed = Math.floor((Date.now() - createdAtMs) / 1000);
  return Math.max(0, timerSeconds - elapsed);
}

function isAnonymousParticipant(participant: Participant) {
  return /^Игрок \d+$/.test(participant.name) && participant.id.startsWith("player-");
}
