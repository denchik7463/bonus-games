import type { RoomTemplate } from "@/lib/domain/types";
import { roomTemplateDtoToDomain } from "@/src/features/admin-room-templates/model/mappers";
import { getRoomTemplates } from "@/src/features/room-templates/api/getRoomTemplates";
import { getVisibleTemplates } from "@/src/features/room-templates/model/selectors";

export const roomTemplateService = {
  async getTemplates(): Promise<RoomTemplate[]> {
    const templates = await getRoomTemplates();
    return templates.map(roomTemplateDtoToDomain);
  },

  async getVisibleTemplates(): Promise<RoomTemplate[]> {
    const templates = await getRoomTemplates();
    return getVisibleTemplates(templates.map(roomTemplateDtoToDomain));
  }
};
