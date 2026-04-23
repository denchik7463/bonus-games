export const roomQueryKeys = {
  all: ["rooms"] as const,
  waiting: ["rooms", "waiting"] as const,
  detail: (id: string) => ["rooms", "detail", id] as const,
  filter: (params: { entryCost?: number | null; maxPlayers?: number | null; boostAllowed?: boolean | null; seatsToBuy?: number | null }) =>
    ["rooms", "filter", params.entryCost ?? null, params.maxPlayers ?? null, params.boostAllowed ?? null, params.seatsToBuy ?? null] as const
};
