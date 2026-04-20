import { apiPost } from "@/src/shared/api/client";
import type { CreateRoomTemplateRequest, RoomTemplateDto } from "@/src/features/admin-room-templates/model/types";

export function createRoomTemplate(payload: CreateRoomTemplateRequest) {
  return apiPost<RoomTemplateDto, CreateRoomTemplateRequest>("/api/room-templates", payload);
}
