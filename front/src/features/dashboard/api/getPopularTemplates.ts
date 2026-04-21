import { apiGet } from "@/src/shared/api/client";
import type { PopularRoomTemplateDto } from "@/src/features/dashboard/model/types";

export function getPopularTemplates() {
  return apiGet<PopularRoomTemplateDto[]>("/api/dashboard/popular-templates");
}
