import type { Round } from "@/lib/domain/types";

export function resolveRoundWinner(round: Round) {
  return round.participants.find((participant) => participant.winner)
    ?? round.participants.find((participant) => participant.status?.toUpperCase() === "WINNER")
    ?? round.participants.find((participant) => participant.id === round.winnerId || participant.userId === round.winnerId)
    ?? null;
}

export function isRoundWonByUser(round: Round, currentUserId: string) {
  const currentParticipant = round.participants.find((participant) => participant.userId === currentUserId || participant.id === currentUserId);
  if (currentParticipant?.winner) return true;
  if (typeof currentParticipant?.status === "string" && currentParticipant.status.toUpperCase() === "WINNER") return true;

  const winner = resolveRoundWinner(round);
  if (winner?.userId === currentUserId) return true;
  if (winner && winner.id === currentUserId) return true;

  return false;
}

export function uniqueRoundsById(rounds: Round[]) {
  const byKey = new Map<string, Round>();
  for (const round of rounds) {
    const key = round.roomId || round.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, round);
      continue;
    }

    const existingScore = roundPriority(existing);
    const nextScore = roundPriority(round);
    if (nextScore >= existingScore) {
      byKey.set(key, round);
    }
  }
  return Array.from(byKey.values());
}

function roundPriority(round: Round) {
  const prizeScore = round.balanceChanges.some((change) => change.reason === "prize" && change.delta > 0) ? 3 : 0;
  const winScore = round.participants.some((participant) => participant.winner || participant.status?.toUpperCase() === "WINNER") ? 2 : 0;
  const resultScore = round.winnerId && !round.winnerId.startsWith("winner-unconfirmed:") ? 1 : 0;
  const timeScore = Number.isFinite(Date.parse(round.startedAt)) ? Date.parse(round.startedAt) / 1_000_000_000 : 0;
  return prizeScore + winScore + resultScore + timeScore;
}
