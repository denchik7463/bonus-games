import type { Participant, Round, RoundBalanceChange, TestUser, WinningCombination } from "@/lib/domain/types";
import { modeFromBackendMechanic } from "@/src/shared/config/game-mechanics";
import type { JournalEntryDto, JournalEventDto, JournalParticipantDto } from "@/src/features/journal/model/types";

export function journalEntryToRound(entry: JournalEntryDto, currentUser?: TestUser): Round {
  const participants = mapParticipants(entry.participants ?? []);
  const winner = findWinner(entry, participants);
  const currentParticipant = currentUser
    ? participants.find((participant) => participant.id === currentUser.id || participant.name === currentUser.name)
    : undefined;
  const userParticipant = currentParticipant ?? winner ?? participants[0];
  const userId = currentUser?.id ?? userParticipant?.id ?? entry.winnerPlayerExternalId ?? "journal-user";
  const boostUsed = currentUser
    ? Boolean((entry.participants ?? []).find((participant) => participant.playerExternalId === currentUser.id || participant.username === currentUser.name)?.boostUsed)
    : Boolean((entry.participants ?? []).some((participant) => participant.boostUsed));
  const balanceChanges = mapBalanceChanges(entry.participants ?? []);
  const userBalanceDelta = currentUser
    ? (entry.participants ?? []).find((participant) => participant.playerExternalId === currentUser.id || participant.username === currentUser.name)?.balanceDelta ?? 0
    : winnerBalanceDelta(entry.participants ?? [], winner?.id);

  return {
    id: entry.id,
    roomId: entry.roomId,
    roomPublicId: publicIdFromRoomId(entry.roomId),
    roomTitle: `Комната ${publicIdFromRoomId(entry.roomId)}`,
    mode: modeFromBackendMechanic(entry.gameMechanic),
    startedAt: entry.createdAt ?? new Date().toISOString(),
    entryCost: entry.entryCost ?? 0,
    boostUsed,
    boostCost: boostUsed ? 0 : 0,
    boostImpact: entry.boostBonus ? `+${entry.boostBonus}% к весу участия` : "вес участия зафиксирован",
    prizePoolPercent: 100,
    roomVolatility: 0,
    prizePool: entry.prizeFund ?? Math.max(0, (entry.entryCost ?? 0) * (entry.maxPlayers ?? participants.length)),
    participants,
    winnerId: winner?.id ?? entry.winnerPlayerExternalId ?? participants[0]?.id ?? "winner",
    userId,
    balanceDelta: userBalanceDelta,
    balanceChanges,
    combination: combinationFromEntry(entry),
    auditTrail: auditTrailFromEntry(entry)
  };
}

export function journalEventsToAuditTrail(events: JournalEventDto[]) {
  return events.map((event) => event.eventTitle ?? event.eventType ?? "Событие зафиксировано");
}

function mapParticipants(players: JournalParticipantDto[]): Participant[] {
  return players.map((player, index) => {
    const name = player.username ?? `Участник ${index + 1}`;
    return {
      id: player.playerExternalId ?? `journal-participant-${index}`,
      name,
      kind: player.bot ? "bot" : "user",
      avatar: name.slice(0, 1).toUpperCase(),
      hasBoost: Boolean(player.boostUsed),
      weight: player.finalWeight ?? 1
    };
  });
}

function findWinner(entry: JournalEntryDto, participants: Participant[]) {
  return participants.find((participant) => participant.id === entry.winnerPlayerExternalId)
    ?? participants.find((participant) => participant.name === entry.winnerPlayerName)
    ?? participants.find((participant) => {
      const source = entry.participants?.find((player) => (player.playerExternalId ?? player.username) === (participant.id ?? participant.name));
      return source?.winner;
    });
}

function mapBalanceChanges(players: JournalParticipantDto[]): RoundBalanceChange[] {
  return players
    .filter((player) => typeof player.balanceDelta === "number")
    .map((player, index) => ({
      participantId: player.playerExternalId ?? `journal-participant-${index}`,
      participantName: player.username ?? `Участник ${index + 1}`,
      kind: player.bot ? "bot" : "user",
      delta: player.balanceDelta ?? 0,
      reason: (player.balanceDelta ?? 0) > 0 ? "prize" : "entry-reserve"
    }));
}

function winnerBalanceDelta(players: JournalParticipantDto[], winnerId?: string) {
  const winner = players.find((player) => player.playerExternalId === winnerId || player.winner);
  return winner?.balanceDelta ?? 0;
}

function combinationFromEntry(entry: JournalEntryDto): WinningCombination {
  const hash = (entry.randomHash ?? entry.randomSeed ?? entry.id).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const seed = hash || "AURUM";
  const roll = entry.roll ?? 0;
  return {
    id: `journal-combo-${entry.id}`,
    label: `Код результата ${roll || "зафиксирован"}`,
    rarity: roll > 0 ? "rare" : "signature",
    tokens: [
      `R${String(roll || 0).padStart(3, "0")}`,
      seed.slice(0, 2) || "AU",
      seed.slice(2, 4) || "RM",
      String(entry.totalWeight ?? "W")
    ],
    palette: ["#ffcd18", "#39d98a", "#7b3cff"]
  };
}

function auditTrailFromEntry(entry: JournalEntryDto) {
  const eventTrail = journalEventsToAuditTrail(entry.events ?? []);
  const technicalTrail = [
    entry.totalWeight ? `Общий вес: ${entry.totalWeight}` : "",
    entry.roll ? `Roll: ${entry.roll}` : "",
    entry.randomHash ? `Hash результата зафиксирован` : "",
    entry.randomSeed ? `Seed результата зафиксирован` : ""
  ].filter(Boolean);
  return [...eventTrail, ...technicalTrail].length ? [...eventTrail, ...technicalTrail] : ["Раунд завершен и записан в журнал."];
}

function publicIdFromRoomId(id: string) {
  return id.replace(/[^a-zA-Zа-яА-Я0-9]/g, "").slice(0, 6).toUpperCase() || "ROOM";
}
