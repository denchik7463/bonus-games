import { apiGet } from "@/src/shared/api/client";
import type { JournalEventDto } from "@/src/features/journal/model/types";

export function getJournalEvents(id: string) {
  return apiGet<JournalEventDto[]>(`/api/game/journal/${id}/events`);
}

export function getJournalEventsByRoom(roomId: string) {
  return apiGet<JournalEventDto[]>(`/api/game/journal/events/by-room?roomId=${encodeURIComponent(roomId)}`);
}
