import { apiDownloadBlob } from "@/src/shared/api/client";
import type { ConfigReportParams } from "@/src/features/admin-room-templates/model/types";

export function downloadConfigReport(params: ConfigReportParams) {
  return apiDownloadBlob("/api/config/report", params);
}
