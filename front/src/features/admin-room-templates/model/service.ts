import { createRoomTemplate } from "@/src/features/admin-room-templates/api/createRoomTemplate";
import { deleteRoomTemplate } from "@/src/features/admin-room-templates/api/deleteRoomTemplate";
import { downloadConfigReport } from "@/src/features/admin-room-templates/api/downloadConfigReport";
import { getRoomTemplates } from "@/src/features/admin-room-templates/api/getRoomTemplates";
import { testConfig } from "@/src/features/admin-room-templates/api/testConfig";
import { updateRoomTemplate } from "@/src/features/admin-room-templates/api/updateRoomTemplate";
import {
  formValuesToConfigRequest,
  formValuesToCreateRequest,
  formValuesToReportParams,
  roomTemplateDtoToDomain
} from "@/src/features/admin-room-templates/model/mappers";
import type { AdminTemplateService } from "@/src/features/admin-room-templates/model/types";

export const adminTemplateService: AdminTemplateService = {
  async getTemplates() {
    const templates = await getRoomTemplates();
    return templates.map(roomTemplateDtoToDomain);
  },

  async createTemplate(values) {
    const template = await createRoomTemplate(formValuesToCreateRequest(values));
    return roomTemplateDtoToDomain(template);
  },

  async updateTemplate(id, values) {
    const template = await updateRoomTemplate(id, formValuesToCreateRequest(values));
    return roomTemplateDtoToDomain(template);
  },

  async deleteTemplate(id) {
    await deleteRoomTemplate(id);
  },

  testConfig(values) {
    return testConfig(formValuesToConfigRequest(values));
  },

  downloadReport(values) {
    return downloadConfigReport(formValuesToReportParams(values));
  }
};
