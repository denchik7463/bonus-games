import { apiPostUnknown } from "@/src/shared/api/client";

export function activateBoost(roomId: string) {
  return apiPostUnknown<Record<string, never>>(`/api/rooms/${roomId}/boost/activate`, {});
}
