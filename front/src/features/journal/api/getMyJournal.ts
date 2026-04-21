import { apiGet } from "@/src/shared/api/client";
import type { JournalEntryDto } from "@/src/features/journal/model/types";

export function getMyJournal() {
  return apiGet<JournalEntryDto[]>("/api/game/journal/me");
}

export function getMyJournalEntry(id: string) {
  return apiGet<JournalEntryDto>(`/api/game/journal/me/${id}`);
}
