import { apiGet } from "@/src/shared/api/client";
import type { RoomDto } from "@/src/features/rooms/model/types";

export function getRiskierRoomRecommendation() {
  return apiGet<RoomDto>("/api/rooms/recommendations/riskier");
}
