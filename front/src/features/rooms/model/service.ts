import type { Room, RoomTemplate, TestUser } from "@/lib/domain/types";
import { ApiClientError } from "@/src/shared/api/errors";
import { activateBoost } from "@/src/features/rooms/api/activateBoost";
import { createRoom } from "@/src/features/rooms/api/createRoom";
import { getRoomEvents } from "@/src/features/rooms/api/getRoomEvents";
import { getRoomState } from "@/src/features/rooms/api/getRoomState";
import { getRooms } from "@/src/features/rooms/api/getRooms";
import { joinByTemplate } from "@/src/features/rooms/api/joinByTemplate";
import { joinRoom } from "@/src/features/rooms/api/joinRoom";
import { roomDtoToDomain, roomTemplateToCreateRequest } from "@/src/features/rooms/model/mappers";
import type { CreateRoomRequest, FilterRoomsParams, RoomDto } from "@/src/features/rooms/model/types";
import { roomTemplateService } from "@/src/features/room-templates/model/service";

export const roomApiService = {
  async createRoom(params: CreateRoomRequest, user?: TestUser) {
    const dto = await createRoom(params);
    const template = await getTemplateById(dto.templateId ?? params.templateId);
    return roomDtoToDomain(dto, user, false, template);
  },

  async createRoomFromTemplate(template: { id: string }, user?: TestUser) {
    const dto = await createRoom(roomTemplateToCreateRequest(template));
    const domainTemplate = await getTemplateById(dto.templateId ?? template.id);
    return roomDtoToDomain(dto, user, false, domainTemplate);
  },

  async joinByTemplate(template: { id: string }, user: TestUser): Promise<Room> {
    try {
      const response = await joinByTemplate({ templateId: template.id });
      const dto = roomDtoFromUnknown(response);
      if (dto) {
        const domainTemplate = await getTemplateById(dto.templateId ?? template.id);
        return roomDtoToDomain(dto, user, true, domainTemplate);
      }
    } catch (error) {
      if (!isAlreadyJoinedError(error)) throw error;
    }

    return recoverJoinedRoomByTemplate(template.id, user);
  },

  async getRoom(id: string, user?: TestUser) {
    try {
      const dto = await getRoomState(id);
      const template = await getTemplateById(dto.templateId);
      return roomDtoToDomain(dto, user, false, template);
    } catch (error) {
      const room = (await this.getRooms()).find((item) => item.id === id);
      if (room) return room;
      throw error;
    }
  },

  async getJoinedRoom(id: string, user: TestUser) {
    try {
      const dto = await getRoomState(id);
      const template = await getTemplateById(dto.templateId);
      return roomDtoToDomain(dto, user, true, template);
    } catch (error) {
      const room = (await this.getRooms()).find((item) => item.id === id);
      if (room) return addCurrentUserToRoom(room, user);
      throw error;
    }
  },

  async getRoomEvents(roomId: string) {
    return getRoomEvents(roomId);
  },

  async getRooms() {
    const rooms = await getRooms();
    return mapRoomsWithTemplates(rooms);
  },

  async getWaitingRooms() {
    const rooms = await getRooms();
    return mapRoomsWithTemplates(rooms.filter((room) => room.status === "WAITING"));
  },

  async filterRooms(params: FilterRoomsParams) {
    const rooms = await getRooms();
    const filteredRooms = rooms
      .filter((room) => room.status === "WAITING")
      .filter((room) => params.maxPlayers === undefined || room.maxPlayers === params.maxPlayers)
      .filter((room) => params.entryCost === undefined || room.entryCost === params.entryCost)
      .filter((room) => params.boostAllowed === undefined || (room.boostAllowed ?? room.bonusEnabled ?? false) === params.boostAllowed);
    return mapRoomsWithTemplates(filteredRooms);
  },

  async joinRoom(roomId: string, user: TestUser) {
    let response: unknown;
    try {
      response = await joinRoom(roomId, false);
    } catch (error) {
      if (isAlreadyJoinedError(error)) return this.getJoinedRoom(roomId, user);
      throw error;
    }
    const joinedDto = roomDtoFromUnknown(response);
    if (joinedDto) {
      const template = await getTemplateById(joinedDto.templateId);
      return roomDtoToDomain(joinedDto, user, true, template);
    }
    return this.getJoinedRoom(roomId, user);
  },

  async activateBoost(roomId: string, user: TestUser) {
    const response = await activateBoost(roomId);
    const boostedDto = roomDtoFromUnknown(response);
    if (boostedDto) {
      const template = await getTemplateById(boostedDto.templateId);
      return roomDtoToDomain(boostedDto, user, true, template);
    }
    return this.getRoom(roomId, user);
  },

  async createAndJoinRoom(template: { id: string }, user: TestUser): Promise<Room> {
    return this.joinByTemplate(template, user);
  }
};

function roomDtoFromUnknown(response: unknown): RoomDto | null {
  if (isRoomDto(response)) return response;
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (isRoomDto(record.room)) return record.room;
    if (isRoomDto(record.state)) return record.state;
    if (isRoomDto(record.data)) return record.data;
  }
  return null;
}

function isRoomDto(value: unknown): value is RoomDto {
  return Boolean(value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string");
}

async function mapRoomsWithTemplates(rooms: RoomDto[]): Promise<Room[]> {
  const templates = await getTemplatesMap();
  return rooms.map((room) => roomDtoToDomain(room, undefined, false, room.templateId ? templates.get(room.templateId) : undefined));
}

async function getTemplateById(templateId?: string): Promise<RoomTemplate | undefined> {
  if (!templateId) return undefined;
  return (await getTemplatesMap()).get(templateId);
}

async function getTemplatesMap(): Promise<Map<string, RoomTemplate>> {
  try {
    const templates = await roomTemplateService.getTemplates();
    return new Map(templates.map((template) => [template.id, template]));
  } catch {
    return new Map<string, RoomTemplate>();
  }
}

async function recoverJoinedRoomByTemplate(templateId: string, user: TestUser): Promise<Room> {
  const rooms = await getRooms();
  const candidates = rooms
    .filter((room) => room.templateId === templateId)
    .filter((room) => room.status === "WAITING" || room.status === "FULL")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const candidate = candidates[0];
  if (!candidate) {
    throw new Error("Комната создана, но backend не вернул ее состояние. Обновите список активных комнат.");
  }

  try {
    const state = await getRoomState(candidate.id);
    const template = await getTemplateById(state.templateId ?? templateId);
    return roomDtoToDomain(state, user, true, template);
  } catch {
    const template = await getTemplateById(candidate.templateId ?? templateId);
    return roomDtoToDomain(candidate, user, true, template);
  }
}

function isAlreadyJoinedError(error: unknown) {
  if (error instanceof ApiClientError) {
    const message = error.message.toLowerCase();
    return message.includes("already joined") || message.includes("уже") || error.status === 409;
  }
  return error instanceof Error && error.message.toLowerCase().includes("already joined");
}

function addCurrentUserToRoom(room: Room, user: TestUser): Room {
  if (room.participants.some((participant) => participant.id === user.id)) return room;
  const currentUserParticipant = {
    id: user.id,
    name: user.name,
    kind: "user" as const,
    avatar: user.avatar,
    vipTier: user.tier,
    hasBoost: false,
    weight: 1
  };
  const participants = room.participants.length && /^Игрок \d+$/.test(room.participants[0].name)
    ? [currentUserParticipant, ...room.participants.slice(1)]
    : [currentUserParticipant, ...room.participants];
  return {
    ...room,
    participants: participants.slice(0, room.seats),
    occupied: Math.max(room.occupied, Math.min(participants.length, room.seats))
  };
}
