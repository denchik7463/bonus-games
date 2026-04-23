import type { JournalFilterParams } from "@/src/features/journal/model/types";

export const journalQueryKeys = {
  all: ["journal"] as const,
  list: (params: JournalFilterParams = {}) => [...journalQueryKeys.all, "list", params] as const,
  detail: (id: string) => [...journalQueryKeys.all, "detail", id] as const,
  events: (id: string) => [...journalQueryKeys.all, "events", id] as const,
  roomEvents: (roomId: string) => [...journalQueryKeys.all, "room-events", roomId] as const,
  me: ["journal", "me"] as const,
  myDetail: (id: string) => [...journalQueryKeys.me, id] as const,
  myEvents: (id: string) => [...journalQueryKeys.me, "events", id] as const,
  myWinStreak: (userId: string) => [...journalQueryKeys.me, "win-streak", userId] as const
};
