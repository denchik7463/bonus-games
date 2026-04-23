import { apiPostUnknown } from "@/src/shared/api/client";

export function cancelRoom(roomId: string, reason: string) {
  const params = new URLSearchParams({ reason });
  return apiPostUnknown<Record<string, never>>(`/api/rooms/${encodeURIComponent(roomId)}/cancel?${params.toString()}`, {});
}
