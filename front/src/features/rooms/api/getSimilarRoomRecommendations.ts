import { apiGet } from "@/src/shared/api/client";
import type { RoomDto, SimilarRoomRecommendationsParams } from "@/src/features/rooms/model/types";

export function getSimilarRoomRecommendations(params: SimilarRoomRecommendationsParams) {
  const query = new URLSearchParams({
    priceDelta: String(params.priceDelta),
    limit: String(params.limit)
  });
  return apiGet<RoomDto[]>(`/api/rooms/recommendations/similar?${query.toString()}`);
}
