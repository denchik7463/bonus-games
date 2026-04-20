import { apiPostUnknown } from "@/src/shared/api/client";
import type { JoinByTemplateRequest } from "@/src/features/rooms/model/types";

export function joinByTemplate(payload: JoinByTemplateRequest) {
  return apiPostUnknown<JoinByTemplateRequest>("/api/rooms/join-by-template", payload);
}
