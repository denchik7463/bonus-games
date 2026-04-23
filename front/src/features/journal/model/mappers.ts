import type { Participant, Round, RoundBalanceChange, TestUser, WinningCombination } from "@/lib/domain/types";
import { modeFromBackendMechanic } from "@/src/shared/config/game-mechanics";
import type { JournalEntryDto, JournalEventDto, JournalParticipantDto } from "@/src/features/journal/model/types";

export function journalEntryToRound(entry: JournalEntryDto, currentUser?: TestUser): Round {
  const rawParticipants = mapParticipants(entry.participants ?? []);
  const winner = findWinner(entry, rawParticipants, entry.participants ?? []);
  const participants = normalizeWinnerFlags(rawParticipants, winner);
  const currentParticipant = currentUser
    ? participants.find((participant) => isCurrentUserParticipant(participant, currentUser))
    : undefined;
  const userParticipant = currentParticipant ?? winner ?? participants[0];
  const userId = currentUser?.id ?? userParticipant?.userId ?? userParticipant?.id ?? entry.winnerPlayerExternalId ?? "journal-user";
  const boostUsed = currentUser
    ? Boolean(currentParticipant?.hasBoost ?? findCurrentSourceParticipant(entry.participants ?? [], currentUser)?.boostUsed)
    : Boolean((entry.participants ?? []).some((participant) => participant.boostUsed));
  const finance = mapRoundFinance(entry, participants, winner, currentUser);

  return {
    id: entry.id,
    roomId: entry.roomId,
    roomPublicId: publicIdFromRoomId(entry.roomId),
    roomTitle: `Комната ${publicIdFromRoomId(entry.roomId)}`,
    mode: modeFromBackendMechanic(entry.gameMechanic),
    startedAt: entry.createdAt ?? new Date().toISOString(),
    maxPlayers: entry.maxPlayers,
    entryCost: entry.entryCost ?? 0,
    boostAllowed: entry.boostAllowed,
    boostUsed,
    boostCost: boostCostFromEntry(entry),
    boostImpact: boostImpactFromEntry(entry),
    boostAbsoluteGainPercent: normalizePercent(entry.boostAbsoluteGainPercent),
    prizePoolPercent: prizePoolPercentFromEntry(entry, participants.length),
    roomVolatility: 0,
    prizePool: entry.prizeFund ?? Math.max(0, (entry.entryCost ?? 0) * (entry.maxPlayers ?? participants.length)),
    participants,
    winnerId: winner?.id ?? entry.winnerPlayerExternalId ?? `winner-unconfirmed:${entry.id}`,
    userId,
    balanceDelta: finance.userBalanceDelta,
    balanceChanges: finance.balanceChanges,
    combination: combinationFromEntry(entry),
    auditTrail: auditTrailFromEntry(entry)
  };
}

function boostCostFromEntry(entry: JournalEntryDto) {
  const explicit = nonNegativeNumber(entry.boostPrice)
    ?? nonNegativeNumber(entry.boostCost)
    ?? nonNegativeNumber(entry.bonusPrice)
    ?? nonNegativeNumber(entry.bonusCost);
  if (typeof explicit === "number" && explicit > 0) return explicit;

  const inferred = inferBoostSeatCostFromParticipants(entry);
  if (inferred > 0) return inferred;

  return explicit ?? 0;
}

function boostImpactFromEntry(entry: JournalEntryDto) {
  const gain = normalizePercent(entry.boostAbsoluteGainPercent);
  if (gain !== undefined) return `+${formatPercent(gain)}% к шансу победы`;
  const weight = nonNegativeNumber(entry.boostBonus)
    ?? nonNegativeNumber(entry.boostWeight)
    ?? nonNegativeNumber(entry.bonusWeight);
  if (weight) return `+${formatPercent(weight)}% к весу участия`;

  const hasBoostedParticipants = (entry.participants ?? []).some((participant) => Boolean(participant.boostUsed));
  return hasBoostedParticipants ? "влияние буста применено" : "шанс участия зафиксирован";
}

export function journalEventsToAuditTrail(events: JournalEventDto[]) {
  return events.map((event) => event.eventTitle ?? event.eventType ?? "Событие зафиксировано");
}

function mapParticipants(players: JournalParticipantDto[]): Participant[] {
  const seats = buildUniqueSeats(players);
  return players.map((player, index) => {
    const name = player.username ?? `Участник ${index + 1}`;
    const seatNumber = seats[index];
    return {
      id: participantId(player, seatNumber, index),
      userId: player.playerExternalId,
      name,
      kind: player.bot ? "bot" : "user",
      avatar: name.slice(0, 1).toUpperCase(),
      hasBoost: Boolean(player.boostUsed),
      weight: player.finalWeight ?? 1,
      status: player.status,
      winner: Boolean(player.winner || player.status === "WINNER"),
      seatNumber
    };
  });
}

function findWinner(entry: JournalEntryDto, participants: Participant[], sourcePlayers: JournalParticipantDto[]): Participant | undefined {
  const sourceWinner = sourcePlayers.find(isSourceWinner);
  const sourceWinnerSeat = normalizeWinnerSeat(sourceWinner?.positionIndex, participants, sourcePlayers);
  if (sourceWinner) {
    const bySourceSeatAndId = participants.find((participant) =>
      matchesParticipantByExternalId(participant, sourceWinner.playerExternalId)
        && (sourceWinnerSeat === undefined || participant.seatNumber === sourceWinnerSeat)
    );
    if (bySourceSeatAndId) return bySourceSeatAndId;

    if (sourceWinnerSeat !== undefined) {
      const bySourceSeat = participants.find((participant) => participant.seatNumber === sourceWinnerSeat);
      if (bySourceSeat) return bySourceSeat;
    }

    const bySourceName = participants.find((participant) => matchesParticipantByName(participant, sourceWinner.username));
    if (bySourceName) return bySourceName;
  }

  const flaggedWinner = participants.find((participant) => Boolean(participant.winner) || participant.status?.toUpperCase() === "WINNER");
  if (flaggedWinner) return flaggedWinner;

  const winnerSeat = normalizeWinnerSeat(entry.winnerPositionIndex, participants, sourcePlayers);
  if (winnerSeat !== undefined) {
    const byWinnerSeat = participants.find((participant) => participant.seatNumber === winnerSeat);
    if (byWinnerSeat) return byWinnerSeat;
  }

  const uniqueByExternalId = findUniqueParticipantByExternalId(participants, entry.winnerPlayerExternalId);
  if (uniqueByExternalId) return uniqueByExternalId;

  const uniqueByName = findUniqueParticipantByName(participants, entry.winnerPlayerName);
  if (uniqueByName) return uniqueByName;

  return undefined;
}

function normalizeWinnerFlags(participants: Participant[], winner: Participant | undefined) {
  if (!winner) {
    return participants.map((participant) => ({
      ...participant,
      winner: Boolean(participant.winner) || participant.status?.toUpperCase() === "WINNER"
    }));
  }
  return participants.map((participant) => ({
    ...participant,
    winner: participant.id === winner.id || (typeof winner.seatNumber === "number" && participant.seatNumber === winner.seatNumber)
  }));
}

function mapRoundFinance(
  entry: JournalEntryDto,
  participants: Participant[],
  winner: Participant | undefined,
  currentUser?: TestUser
) {
  if (!currentUser) {
    const balanceChanges = mapBalanceChanges(entry);
    return {
      balanceChanges,
      userBalanceDelta: winnerBalanceDelta(entry.participants ?? [], winner?.id)
    };
  }

  const sourcePlayers = findCurrentSourceParticipants(entry.participants ?? [], currentUser);
  const sourcePlayer = sourcePlayers[0];
  const participant = participants.find((item) => isCurrentUserParticipant(item, currentUser))
    ?? (sourcePlayer ? participants.find((item) => item.userId === sourcePlayer.playerExternalId || item.name === sourcePlayer.username) : undefined);
  const currentParticipants = participants.filter((item) => isCurrentUserParticipant(item, currentUser));
  const participantName = participant?.name ?? sourcePlayer?.username ?? currentUser.name;
  const participantId = currentUser.id;
  const kind = participant?.kind ?? (sourcePlayer?.bot ? "bot" : "user");
  const boostUsed = Boolean(currentParticipants.some((item) => item.hasBoost) || sourcePlayers.some((item) => item.boostUsed));
  const seatCount = Math.max(1, currentParticipants.length, sourcePlayers.length);
  const boostedSeatCount = Math.max(currentParticipants.filter((item) => item.hasBoost).length, sourcePlayers.filter((item) => item.boostUsed).length);
  const entryCost = positiveNumber(entry.entryCost) ?? 0;
  const prizeFund = positiveNumber(entry.prizeFund) ?? 0;
  const backendDeltas = sourcePlayers
    .map((player) => player.balanceDelta)
    .filter((delta): delta is number => typeof delta === "number" && Number.isFinite(delta));
  const backendDelta = backendDeltas.length
    ? backendDeltas.reduce((sum, delta) => sum + delta, 0)
    : undefined;
  const userWon = Boolean(
    participant?.winner
      || participant?.status?.toUpperCase() === "WINNER"
      || sourcePlayer?.winner
      || sourcePlayer?.status?.toUpperCase() === "WINNER"
      || (winner && participant && (winner.id === participant.id || winner.userId === participant.userId || winner.seatNumber === participant.seatNumber))
  );
  const explicitBoostCost = boostUsed ? boostCostFromEntry(entry) * Math.max(1, boostedSeatCount) : 0;
  const inferredBoostCost = inferBoostCostFromDelta({
    backendDelta,
    entryCost,
    seatCount,
    userWon,
    prizeFund
  });
  const boostCost = explicitBoostCost > 0 ? explicitBoostCost : inferredBoostCost;

  const userChanges: RoundBalanceChange[] = [];
  if (participant || sourcePlayer) {
    if (entryCost > 0) {
      userChanges.push({
        participantId,
        participantName,
        kind,
        delta: -entryCost * seatCount,
        reason: "entry-reserve"
      });
    }
    if (boostCost > 0) {
      userChanges.push({
        participantId,
        participantName,
        kind,
        delta: -boostCost,
        reason: "boost"
      });
    }
    if (userWon && prizeFund > 0) {
      userChanges.push({
        participantId,
        participantName,
        kind,
        delta: prizeFund,
        reason: "prize"
      });
    }
  }

  const derivedDelta = userChanges.reduce((sum, change) => sum + change.delta, 0);
  const userBalanceDelta = backendDelta !== undefined && (backendDelta !== 0 || derivedDelta === 0)
    ? backendDelta
    : derivedDelta;
  const currentNames = new Set([participantName, ...sourcePlayers.map((player) => player.username).filter((name): name is string => Boolean(name))]);
  const otherChanges = mapBalanceChanges(entry).filter((change) => !currentNames.has(change.participantName));

  return {
    balanceChanges: userChanges.length ? [...userChanges, ...otherChanges] : otherChanges,
    userBalanceDelta
  };
}

function mapBalanceChanges(entry: JournalEntryDto): RoundBalanceChange[] {
  const players = entry.participants ?? [];
  const prizeFund = positiveNumber(entry.prizeFund) ?? 0;
  const entryCost = positiveNumber(entry.entryCost) ?? 0;
  const seats = buildUniqueSeats(players);
  const changes: RoundBalanceChange[] = players
    .filter((player) => typeof player.balanceDelta === "number" || (Boolean(player.bot) && isSourceWinner(player) && prizeFund > 0))
    .map((player, index) => {
      const botWinner = Boolean(player.bot) && isSourceWinner(player) && prizeFund > 0;
      const delta = botWinner ? (prizeFund - entryCost) : (player.balanceDelta ?? 0);
      return {
        participantId: participantId(player, seats[index], index),
        participantName: player.username ?? `Участник ${index + 1}`,
        kind: player.bot ? "bot" : "user",
        delta,
        reason: delta > 0 ? "prize" : "entry-reserve"
      };
    });
  return aggregateNetBalanceChanges(changes);
}

function aggregateNetBalanceChanges(changes: RoundBalanceChange[]) {
  const grouped = new Map<string, RoundBalanceChange>();
  for (const change of changes) {
    const key = `${change.participantName}:${change.kind}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...change });
      continue;
    }
    grouped.set(key, {
      ...existing,
      delta: existing.delta + change.delta
    });
  }
  return Array.from(grouped.values()).map((change) => ({
    ...change,
    reason: change.delta > 0 ? "prize" : "entry-reserve"
  }));
}

function winnerBalanceDelta(players: JournalParticipantDto[], winnerId?: string) {
  const winner = players.find((player) => player.playerExternalId === winnerId || player.winner);
  return winner?.balanceDelta ?? 0;
}

function findCurrentSourceParticipant(players: JournalParticipantDto[], currentUser: TestUser) {
  return findCurrentSourceParticipants(players, currentUser)[0];
}

function findCurrentSourceParticipants(players: JournalParticipantDto[], currentUser: TestUser) {
  return players.filter((participant) => participant.playerExternalId === currentUser.id || sameUserName(participant.username, currentUser));
}

function isCurrentUserParticipant(participant: Participant, currentUser: TestUser) {
  return participant.userId === currentUser.id || participant.id === currentUser.id || sameUserName(participant.name, currentUser);
}

function sameUserName(value: string | undefined, currentUser: TestUser) {
  if (!value) return false;
  const normalized = normalizeUserName(value);
  return normalized === normalizeUserName(currentUser.name) || normalized === normalizeUserName(currentUser.handle);
}

function normalizeUserName(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
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

function participantId(player: JournalParticipantDto, seatNumber: number, index: number) {
  return `${player.playerExternalId ?? player.username ?? "journal-participant"}-seat-${seatNumber}-order-${index + 1}`;
}

function buildUniqueSeats(players: JournalParticipantDto[]) {
  const rawSeats = players.map((player) => player.positionIndex);
  const zeroBased = rawSeats.some((seat) => seat === 0);
  const used = new Set<number>();
  return players.map((player, index) => {
    const rawSeat = player.positionIndex;
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

function normalizeWinnerSeat(value: number | undefined, participants: Participant[], sourcePlayers: JournalParticipantDto[]) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const sourceLooksZeroBased = sourcePlayers.some((player) => player.positionIndex === 0);
  if (sourceLooksZeroBased) return Math.max(1, value + 1);
  const zeroBased = !participants.some((participant) => participant.seatNumber === value) && participants.some((participant) => participant.seatNumber === value + 1);
  return Math.max(1, zeroBased ? value + 1 : value);
}

function isSourceWinner(player: JournalParticipantDto) {
  return Boolean(player.winner) || player.status?.toUpperCase() === "WINNER";
}

function matchesParticipantByExternalId(participant: Participant, externalId: string | undefined) {
  if (!externalId) return false;
  return participant.userId === externalId || participant.id === externalId;
}

function matchesParticipantByName(participant: Participant, name: string | undefined) {
  if (!name) return false;
  return participant.name === name;
}

function findUniqueParticipantByExternalId(participants: Participant[], externalId: string | undefined) {
  if (!externalId) return null;
  const matches = participants.filter((participant) => matchesParticipantByExternalId(participant, externalId));
  return matches.length === 1 ? matches[0] : null;
}

function findUniqueParticipantByName(participants: Participant[], name: string | undefined) {
  if (!name) return null;
  const matches = participants.filter((participant) => matchesParticipantByName(participant, name));
  return matches.length === 1 ? matches[0] : null;
}

function positiveNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function nonNegativeNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function normalizePercent(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function prizePoolPercentFromEntry(entry: JournalEntryDto, participantsCount: number) {
  const explicit = normalizePercent(entry.winnerPercent);
  if (explicit !== undefined && explicit > 0) return explicit;

  const entryCost = positiveNumber(entry.entryCost) ?? 0;
  const maxPlayers = positiveNumber(entry.maxPlayers) ?? participantsCount;
  const totalPool = entryCost * maxPlayers;
  const prizeFund = positiveNumber(entry.prizeFund) ?? 0;
  if (totalPool <= 0 || prizeFund <= 0) return 100;

  const derived = (prizeFund * 100) / totalPool;
  return Math.round(derived * 100) / 100;
}

function inferBoostCostFromDelta(params: {
  backendDelta?: number;
  entryCost: number;
  seatCount: number;
  userWon: boolean;
  prizeFund: number;
}) {
  if (params.backendDelta === undefined) return 0;
  const grossPrize = params.userWon ? params.prizeFund : 0;
  const inferred = grossPrize - (params.entryCost * params.seatCount) - params.backendDelta;
  if (!Number.isFinite(inferred) || inferred <= 0) return 0;
  return Math.round(inferred);
}

function inferBoostSeatCostFromParticipants(entry: JournalEntryDto) {
  const participants = entry.participants ?? [];
  const entryCost = positiveNumber(entry.entryCost) ?? 0;
  const prizeFund = positiveNumber(entry.prizeFund) ?? 0;
  if (!participants.length || entryCost <= 0) return 0;

  const inferredCosts = participants
    .filter((player) => Boolean(player.boostUsed))
    .map((player) => {
      if (typeof player.balanceDelta !== "number" || !Number.isFinite(player.balanceDelta)) return 0;
      const grossPrize = isSourceWinner(player) ? prizeFund : 0;
      const inferred = grossPrize - entryCost - player.balanceDelta;
      return Number.isFinite(inferred) && inferred > 0 ? inferred : 0;
    })
    .filter((value) => value > 0);
  if (!inferredCosts.length) return 0;

  const average = inferredCosts.reduce((sum, value) => sum + value, 0) / inferredCosts.length;
  return Math.round(average);
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
