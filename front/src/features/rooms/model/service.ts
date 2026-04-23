import type { Room, RoomTemplate, TestUser } from "@/lib/domain/types";
import { ApiClientError } from "@/src/shared/api/errors";
import { activateBoost } from "@/src/features/rooms/api/activateBoost";
import { createRoom } from "@/src/features/rooms/api/createRoom";
import { findRoom } from "@/src/features/rooms/api/findRoom";
import { getRoomByCode } from "@/src/features/rooms/api/getRoomByCode";
import { getRoomById } from "@/src/features/rooms/api/getRoomById";
import { getRoomEvents } from "@/src/features/rooms/api/getRoomEvents";
import { getRiskierRoomRecommendation } from "@/src/features/rooms/api/getRiskierRoomRecommendation";
import { getRoomState } from "@/src/features/rooms/api/getRoomState";
import { getRooms } from "@/src/features/rooms/api/getRooms";
import { getSimilarRoomRecommendations } from "@/src/features/rooms/api/getSimilarRoomRecommendations";
import { getWaitingRooms } from "@/src/features/rooms/api/getWaitingRooms";
import { filterRooms as filterRoomsApi } from "@/src/features/rooms/api/filterRooms";
import { joinRoomByCode } from "@/src/features/rooms/api/joinRoomByCode";
import { joinRoom } from "@/src/features/rooms/api/joinRoom";
import { finishRoom } from "@/src/features/rooms/api/finishRoom";
import { cancelRoom } from "@/src/features/rooms/api/cancelRoom";
import { roomDtoToDomain, roomTemplateToCreateRequest } from "@/src/features/rooms/model/mappers";
import type { CreateRoomRequest, FilterRoomsParams, FindRoomRequest, JoinRoomParams, RoomDto, SimilarRoomRecommendationsParams } from "@/src/features/rooms/model/types";
import { roomTemplateService } from "@/src/features/room-templates/model/service";

export const roomApiService = {
  async createRoom(params: CreateRoomRequest, user?: TestUser) {
    const dto = await createRoom(params);
    const template = await getTemplateById(dto.templateId ?? params.templateId);
    return roomDtoToDomain(dto, user, template);
  },

  async createRoomFromTemplate(template: { id: string }, user?: TestUser) {
    const dto = await createRoom(roomTemplateToCreateRequest(template));
    const domainTemplate = await getTemplateById(dto.templateId ?? template.id);
    return roomDtoToDomain(dto, user, domainTemplate);
  },

  async findRoom(params: FindRoomRequest, user?: TestUser): Promise<Room> {
    const dto = await findRoom(params);
    const template = await getTemplateById(dto.templateId ?? params.templateId);
    return roomDtoToDomain(dto, user, template);
  },

  async getRoomByCode(shortId: string, user?: TestUser): Promise<Room> {
    const baseDto = await getRoomByCode(shortId);
    const dto = await getRoomDetailsDto(baseDto);
    const template = await getTemplateById(dto.templateId);
    return roomDtoToDomain(dto, user, template);
  },

  async getRoom(id: string, user?: TestUser) {
    try {
      if (/^\d{6}$/.test(id)) return this.getRoomByCode(id, user);
      const baseDto = await getRoomById(id);
      const dto = await getRoomDetailsDto(baseDto);
      const template = await getTemplateById(dto.templateId);
      return roomDtoToDomain(dto, user, template);
    } catch (error) {
      const room = (await this.getRooms()).find((item) => item.id === id);
      if (room) return room;
      throw error;
    }
  },

  async getJoinedRoom(id: string, user: TestUser) {
    try {
      const baseDto = /^\d{6}$/.test(id) ? await getRoomByCode(id) : await getRoomById(id);
      const dto = await getRoomDetailsDto(baseDto);
      const template = await getTemplateById(dto.templateId);
      return roomDtoToDomain(dto, user, template);
    } catch (error) {
      const room = (await this.getRooms()).find((item) => item.id === id);
      if (room) return room;
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
    const rooms = await getWaitingRooms();
    return mapRoomsWithTemplates(rooms);
  },

  async filterRooms(params: FilterRoomsParams) {
    const rooms = await filterRoomsApi(params);
    return mapRoomsWithTemplates(rooms);
  },

  async getSimilarRecommendations(params: SimilarRoomRecommendationsParams, user?: TestUser) {
    const rooms = await getSimilarRoomRecommendations(params);
    return rooms.map((room) => roomDtoToDomain(room, user));
  },

  async getRiskierRecommendation(user?: TestUser): Promise<Room | null> {
    const room = await getRiskierRoomRecommendation();
    return roomDtoToDomain(room, user);
  },

  async getPostGameSimilarRecommendations(round: { entryCost: number; maxPlayers?: number; boostAllowed?: boolean }, user?: TestUser, params: SimilarRoomRecommendationsParams = { priceDelta: 200, limit: 10 }) {
    try {
      return await this.getSimilarRecommendations(params, user);
    } catch {
      const rooms = await this.getWaitingRooms();
      return rooms
        .filter((room) => Math.abs(room.entryCost - round.entryCost) <= params.priceDelta)
        .filter((room) => !round.maxPlayers || room.seats === round.maxPlayers)
        .filter((room) => typeof round.boostAllowed !== "boolean" || room.boostEnabled === round.boostAllowed)
        .sort((a, b) => Math.abs(a.entryCost - round.entryCost) - Math.abs(b.entryCost - round.entryCost))
        .slice(0, params.limit);
    }
  },

  async getPostGameRiskierRecommendation(round: { entryCost: number; maxPlayers?: number; boostAllowed?: boolean }, user?: TestUser): Promise<Room | null> {
    try {
      return await this.getRiskierRecommendation(user);
    } catch {
      const rooms = await this.getWaitingRooms();
      return rooms
        .filter((room) => room.entryCost > round.entryCost)
        .filter((room) => !round.maxPlayers || room.seats === round.maxPlayers)
        .filter((room) => typeof round.boostAllowed !== "boolean" || room.boostEnabled === round.boostAllowed)
        .sort((a, b) => a.entryCost - b.entryCost)[0] ?? null;
    }
  },

  async joinRoom(roomId: string, user: TestUser, payload: Omit<JoinRoomParams, "roomId"> = { seatsCount: 1 }) {
    let response: unknown;
    try {
      response = await joinRoom(roomId, payload);
    } catch (error) {
      if (isAlreadyJoinedError(error)) return this.getJoinedRoom(roomId, user);
      throw error;
    }
    const joinedDto = roomDtoFromUnknown(response);
    if (joinedDto) {
      const template = await getTemplateById(joinedDto.templateId);
      return roomDtoToDomain(joinedDto, user, template);
    }
    return this.getJoinedRoom(roomId, user);
  },

  async joinRoomByCode(shortId: string, user: TestUser, payload: Omit<JoinRoomParams, "roomId"> = { seatsCount: 1 }) {
    let response: unknown;
    try {
      response = await joinRoomByCode(shortId, payload);
    } catch (error) {
      if (isAlreadyJoinedError(error)) {
        const room = await this.getRoomByCode(shortId, user);
        return this.getJoinedRoom(room.id, user);
      }
      throw error;
    }
    const joinedDto = roomDtoFromUnknown(response);
    if (joinedDto) {
      const template = await getTemplateById(joinedDto.templateId);
      return roomDtoToDomain(joinedDto, user, template);
    }
    const room = await this.getRoomByCode(shortId, user);
    return this.getJoinedRoom(room.id, user);
  },

  async activateBoost(roomId: string, user: TestUser, seatNumber: number) {
    const response = await activateBoost(roomId, seatNumber);
    const boostedDto = roomDtoFromUnknown(response);
    if (boostedDto) {
      const template = await getTemplateById(boostedDto.templateId);
      return roomDtoToDomain(boostedDto, user, template);
    }
    return this.getJoinedRoom(roomId, user);
  },

  async findRoomFromTemplate(template: RoomTemplate, user?: TestUser, join: Omit<JoinRoomParams, "roomId"> = { seatsCount: 1 }): Promise<Room> {
    return this.findRoom({
      templateId: template.id,
      maxPlayers: template.seats,
      entryCost: template.entryCost,
      boostAllowed: template.boostEnabled,
      ...join
    }, user);
  },

  async createAndJoinRoom(template: RoomTemplate, user: TestUser, join: Omit<JoinRoomParams, "roomId"> = { seatsCount: 1 }): Promise<Room> {
    return this.findRoomFromTemplate(template, user, join);
  },

  async finishRoom(roomId: string, payload: { baseWeight: number; boostBonus: number }) {
    return finishRoom(roomId, payload);
  },

  async cancelRoom(roomId: string, reason: string) {
    return cancelRoom(roomId, reason);
  }
};

async function getRoomDetailsDto(baseDto: RoomDto): Promise<RoomDto> {
  const roomId = baseDto.roomId ?? baseDto.id;
  if (!roomId) return baseDto;
  try {
    const stateDto = await getRoomState(roomId);
    return mergeRoomDtos(baseDto, stateDto);
  } catch {
    return baseDto;
  }
}

function mergeRoomDtos(baseDto: RoomDto, stateDto: RoomDto): RoomDto {
  return {
    ...baseDto,
    ...stateDto,
    id: stateDto.id ?? baseDto.id,
    roomId: stateDto.roomId ?? baseDto.roomId ?? baseDto.id,
    shortId: stateDto.shortId ?? baseDto.shortId,
    templateId: stateDto.templateId ?? baseDto.templateId,
    templateName: stateDto.templateName ?? baseDto.templateName,
    maxPlayers: stateDto.maxPlayers ?? baseDto.maxPlayers,
    entryCost: stateDto.entryCost ?? baseDto.entryCost,
    prizeFund: positiveNumber(stateDto.prizeFund) ?? positiveNumber(baseDto.prizeFund) ?? baseDto.prizeFund,
    boostAllowed: stateDto.boostAllowed ?? baseDto.boostAllowed,
    bonusEnabled: stateDto.bonusEnabled ?? baseDto.bonusEnabled,
    bonusPrice: stateDto.bonusPrice ?? baseDto.bonusPrice,
    bonusWeight: stateDto.bonusWeight ?? baseDto.bonusWeight,
    currentChancePercent: stateDto.currentChancePercent ?? baseDto.currentChancePercent,
    chanceWithBoostPercent: stateDto.chanceWithBoostPercent ?? baseDto.chanceWithBoostPercent,
    boostAbsoluteGainPercent: stateDto.boostAbsoluteGainPercent ?? baseDto.boostAbsoluteGainPercent,
    timerSeconds: stateDto.timerSeconds ?? baseDto.timerSeconds,
    currentPlayers: stateDto.currentPlayers ?? baseDto.currentPlayers,
    botCount: stateDto.botCount ?? baseDto.botCount,
    createdAt: stateDto.createdAt ?? baseDto.createdAt,
    firstPlayerJoinedAt: hasDtoField(stateDto, "firstPlayerJoinedAt") ? stateDto.firstPlayerJoinedAt : baseDto.firstPlayerJoinedAt,
    startedAt: hasDtoField(stateDto, "startedAt") ? stateDto.startedAt : baseDto.startedAt,
    finishedAt: hasDtoField(stateDto, "finishedAt") ? stateDto.finishedAt : baseDto.finishedAt,
    remainingSeconds: hasDtoField(stateDto, "remainingSeconds") ? stateDto.remainingSeconds : baseDto.remainingSeconds,
    gameResultId: stateDto.gameResultId ?? baseDto.gameResultId,
    roundId: stateDto.roundId ?? baseDto.roundId,
    resultId: stateDto.resultId ?? baseDto.resultId,
    winnerPositionIndex: stateDto.winnerPositionIndex ?? stateDto.winnerSeatNumber ?? stateDto.winnerSeat ?? baseDto.winnerPositionIndex,
    gameMechanic: stateDto.gameMechanic ?? baseDto.gameMechanic,
    players: stateDto.players ?? baseDto.players,
    participants: stateDto.participants ?? baseDto.participants
  };
}

function positiveNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function hasDtoField<T extends string>(dto: RoomDto, field: T) {
  return field in dto;
}

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
  return Boolean(
    value &&
    typeof value === "object" &&
    (typeof (value as { id?: unknown }).id === "string" || typeof (value as { roomId?: unknown }).roomId === "string")
  );
}

async function mapRoomsWithTemplates(rooms: RoomDto[]): Promise<Room[]> {
  const templates = await getTemplatesMap();
  return rooms.map((room) => roomDtoToDomain(room, undefined, room.templateId ? templates.get(room.templateId) : undefined));
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

function isAlreadyJoinedError(error: unknown) {
  if (error instanceof ApiClientError) {
    const message = error.message.toLowerCase();
    return message.includes("already joined") || message.includes("уже") || error.status === 409;
  }
  return error instanceof Error && error.message.toLowerCase().includes("already joined");
}
