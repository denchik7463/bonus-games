import { apiDelete } from "@/src/shared/api/client";

export function deleteRoomTemplate(id: string) {
  return apiDelete<void>(`/api/room-templates/${id}`);
}
