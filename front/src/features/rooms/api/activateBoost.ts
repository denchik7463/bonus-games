import { apiPostUnknown } from "@/src/shared/api/client";

export function activateBoost(roomId: string, seatNumber: number) {
  return apiPostUnknown<{ seatNumber: number }>(`/api/rooms/${encodeURIComponent(roomId)}/boost/activate`, { seatNumber });
}
