import { apiGet } from "@/src/shared/api/client";
import type { JournalEventDto } from "@/src/features/journal/model/types";

export function getMyJournalEvents(id: string) {
  return apiGet<JournalEventDto[]>(`/api/game/journal/me/${id}/events`);
}
