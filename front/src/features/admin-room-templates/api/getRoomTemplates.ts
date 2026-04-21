import { apiGet } from "@/src/shared/api/client";
import type { RoomTemplateDto } from "@/src/features/admin-room-templates/model/types";

export function getRoomTemplates() {
  return apiGet<RoomTemplateDto[]>("/api/room-templates");
}
