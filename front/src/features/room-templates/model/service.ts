import type { RoomTemplate } from "@/lib/domain/types";
import { ApiClientError } from "@/src/shared/api/errors";
import { roomTemplateDtoToDomain } from "@/src/features/admin-room-templates/model/mappers";
import { getRoomTemplates } from "@/src/features/room-templates/api/getRoomTemplates";
import { getVisibleTemplates } from "@/src/features/room-templates/model/selectors";

export const roomTemplateService = {
  async getTemplates(): Promise<RoomTemplate[]> {
    const templates = await getUserAccessibleRoomTemplates();
    return templates.map(roomTemplateDtoToDomain);
  },

  async getVisibleTemplates(): Promise<RoomTemplate[]> {
    const templates = await getUserAccessibleRoomTemplates();
    return getVisibleTemplates(templates.map(roomTemplateDtoToDomain));
  }
};

async function getUserAccessibleRoomTemplates() {
  try {
    return await getRoomTemplates();
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 403) return [];
    throw error;
  }
}
