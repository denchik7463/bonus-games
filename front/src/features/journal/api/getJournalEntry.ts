import { apiGet } from "@/src/shared/api/client";
import type { JournalEntryDto } from "@/src/features/journal/model/types";

export function getJournalEntry(id: string) {
  return apiGet<JournalEntryDto>(`/api/game/journal/${id}`);
}
