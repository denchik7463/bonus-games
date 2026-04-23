import { apiGet } from "@/src/shared/api/client";
import type { FilterRoomsParams, RoomDto } from "@/src/features/rooms/model/types";

export function filterRooms(params: FilterRoomsParams) {
  const query = new URLSearchParams();
  if (typeof params.maxPlayers === "number") query.set("maxPlayers", String(params.maxPlayers));
  if (typeof params.entryCost === "number") query.set("entryCost", String(params.entryCost));
  if (typeof params.boostAllowed === "boolean") query.set("boostAllowed", String(params.boostAllowed));
  return apiGet<RoomDto[]>(`/api/rooms/filter?${query.toString()}`);
}
