import { apiGet } from "@/src/shared/api/client";
import type { JournalEntryDto, JournalFilterParams } from "@/src/features/journal/model/types";

export function getJournal(params: JournalFilterParams = {}) {
  const query = params.roomId ? `?roomId=${encodeURIComponent(params.roomId)}` : "";
  return apiGet<JournalEntryDto[]>(`/api/game/journal${query}`);
}
