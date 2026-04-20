import { apiPostUnknown } from "@/src/shared/api/client";
import { normalizeConfigTestResponse } from "@/src/features/admin-room-templates/model/analysis";
import type { ConfigTestRequest } from "@/src/features/admin-room-templates/model/types";

export async function testConfig(payload: ConfigTestRequest) {
  const response = await apiPostUnknown<ConfigTestRequest>("/api/config/test", payload);
  return normalizeConfigTestResponse(response);
}
