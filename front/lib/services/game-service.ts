import { combinations, roomTemplates, rooms, rounds, testUsers } from "@/lib/mock/data";
import { AdminRoomConfig, MatchmakingParams, Participant, Room, RoomTemplate, Round, TestUser } from "@/lib/domain/types";

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

let activeUser: TestUser = testUsers[0];
let joinedRoom: Room | null = null;
let autoRoomCounter = 1;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function allVisibleRooms() {
  const active = [...rooms];
  if (joinedRoom) {
    const index = active.findIndex((room) => roomMatches(room, joinedRoom?.id ?? ""));
    if (index >= 0) active[index] = joinedRoom;
    else active.unshift(joinedRoom);
  }
  return active;
}

function matchesParams(room: Room, params: { entryCost: number; seats: number; boostEnabled: boolean }) {
  return room.entryCost === params.entryCost && room.seats === params.seats && room.boostEnabled === params.boostEnabled;
}

function buildInviteUrl(publicId: string) {
  return `/room/${publicId.toLowerCase()}`;
}

function roomMatches(room: Room, roomId: string) {
  const normalized = roomId.toLowerCase();
  return room.id === roomId || room.sourceTemplateId === roomId || room.publicId.toLowerCase() === normalized;
}

function syncActiveRoom(room: Room) {
  const index = rooms.findIndex((item) => item.id === room.id);
  if (index >= 0) rooms[index] = room;
  else rooms.unshift(room);
  joinedRoom = room;
}

function makePublicId(seed: number) {
  const readableIds = ["ОРБИТА", "ВЕКТОР", "КВАРЦА", "НЕОНИК", "СПЕКТР", "АРКАДА", "ФОТОНЫ", "ПУЛЬСА"];
  return readableIds[(seed - 1) % readableIds.length];
}

function materializeRoom(template: RoomTemplate, kind: Room["kind"] = "active") {
  const publicId = makePublicId(autoRoomCounter++);
  return {
    ...template,
    id: `${kind}-${template.id}-${Date.now()}-${autoRoomCounter}`,
    publicId,
    inviteUrl: buildInviteUrl(publicId),
    kind,
    sourceTemplateId: template.id,
    status: "open" as const,
    occupied: 0,
    participants: [],
    prizePool: template.prizeFund ?? template.entryCost * template.seats * (template.prizePoolPercent / 100),
    fillRate: 0
  };
}

export const gameService = {
  async getUsers() {
    await wait();
    return clone(testUsers);
  },

  async login(userId: string) {
    await wait(180);
    activeUser = testUsers.find((user) => user.id === userId) ?? testUsers[0];
    return clone(activeUser);
  },

  async getMe() {
    await wait(120);
    return clone(activeUser);
  },

  async getRooms() {
    await wait();
    return clone(allVisibleRooms());
  },

  async getActiveRooms() {
    await wait();
    return clone(allVisibleRooms());
  },

  async getRoomsCatalog() {
    await wait();
    return clone(allVisibleRooms());
  },

  async getRoomTemplates() {
    await wait();
    return clone(roomTemplates);
  },

  async getVisibleRoomTemplates() {
    await wait();
    return clone(roomTemplates.filter((template) => template.templateVisible !== false));
  },

  async createRoomTemplate(config: AdminRoomConfig) {
    await wait(280);
    const template: RoomTemplate = {
      id: `template-${Date.now()}-${autoRoomCounter}`,
      templateVisible: config.templateVisible ?? true,
      title: config.title,
      mode: config.mode,
      entryCost: config.entryCost,
      boostCost: config.boostEnabled ? config.boostCost : 0,
      boostLabel: config.boostEnabled ? "Админский буст" : "Буст отключен",
      boostImpact: config.boostEnabled ? `+${config.boostWeight}% к весу участия` : "буст отключен",
      boostEnabled: config.boostEnabled,
      prizePoolPercent: config.prizePoolPercent,
      prizeFund: config.entryCost * config.seats * (config.prizePoolPercent / 100),
      seats: config.seats,
      reservedUntilSec: config.botFillDelay,
      recommendedFor: ["Gold", "Platinum", "Black Diamond"],
      volatility: config.volatility
    };
    roomTemplates.unshift(template);
    return clone(template);
  },

  async updateRoomTemplate(templateId: string, config: AdminRoomConfig & { templateVisible?: boolean }) {
    await wait(260);
    const index = roomTemplates.findIndex((item) => item.id === templateId);
    if (index < 0) throw new Error("Шаблон не найден.");
    const existing = roomTemplates[index];
    const next: RoomTemplate = {
      ...existing,
      title: config.title,
      mode: config.mode,
      entryCost: config.entryCost,
      seats: config.seats,
      boostEnabled: config.boostEnabled,
      boostCost: config.boostEnabled ? config.boostCost : 0,
      boostLabel: config.boostEnabled ? existing.boostLabel : "Буст отключен",
      boostImpact: config.boostEnabled ? `+${config.boostWeight}% к весу участия` : "буст отключен",
      prizePoolPercent: config.prizePoolPercent,
      prizeFund: config.entryCost * config.seats * (config.prizePoolPercent / 100),
      reservedUntilSec: config.botFillDelay,
      volatility: config.volatility,
      templateVisible: config.templateVisible ?? existing.templateVisible ?? true
    };
    roomTemplates[index] = next;
    return clone(next);
  },

  async deleteRoomTemplate(templateId: string) {
    await wait(220);
    const index = roomTemplates.findIndex((item) => item.id === templateId);
    if (index < 0) return { ok: true };
    roomTemplates.splice(index, 1);
    return { ok: true };
  },

  async setRoomTemplateVisibility(templateId: string, visible: boolean) {
    await wait(160);
    const index = roomTemplates.findIndex((item) => item.id === templateId);
    if (index < 0) throw new Error("Шаблон не найден.");
    roomTemplates[index] = { ...roomTemplates[index], templateVisible: visible };
    return clone(roomTemplates[index]);
  },

  async useRoomTemplate(templateId: string, user: TestUser) {
    await wait(220);
    const template = roomTemplates.find((item) => item.id === templateId);
    if (!template) throw new Error("Шаблон не найден.");
    const desired = { entryCost: template.entryCost, seats: template.seats, boostEnabled: template.boostEnabled };
    const existingActive = rooms.find((room) => matchesParams(room, desired));
    if (existingActive) {
      const joined = await this.joinRoom(existingActive.id, user);
      return { room: clone(joined), created: false };
    }
    const createdRoom = materializeRoom(template, "active");
    rooms.unshift(createdRoom);
    const joined = await this.joinRoom(createdRoom.id, user);
    return { room: clone(joined), created: true };
  },

  async findBestMatch(params: MatchmakingParams) {
    await wait(360);
    const activeMatches = rooms.filter((room) =>
      Math.abs(room.entryCost - params.entryCost) <= 80 &&
      room.seats === params.seats &&
      room.boostEnabled === params.boostDesired
    );
    const source = activeMatches.length ? activeMatches : roomTemplates;
    const ranked = source
      .map((room) => ({
        room,
        score:
          100 -
          Math.abs(room.entryCost - params.entryCost) / 8 -
          Math.abs(room.seats - params.seats) * 7 -
          Math.abs(room.volatility - params.volatility) / 2 +
          (params.boostDesired ? room.boostCost < room.entryCost * 0.35 ? 8 : -4 : 0)
      }))
      .sort((a, b) => b.score - a.score);
    let best: Room;
    let alternatives: Room[] = [];
    let created = false;
    if (activeMatches.length) {
      best = ranked[0].room as Room;
      alternatives = ranked.slice(1, 3).map((item) => item.room as Room);
    } else {
      best = materializeRoom({
        ...ranked[0].room,
        entryCost: params.entryCost,
        seats: params.seats,
        boostEnabled: params.boostDesired,
        boostCost: params.boostDesired ? Math.max(30, Math.round(params.entryCost * 0.25)) : 0,
        boostImpact: params.boostDesired ? "+10% к весу участия" : "буст отключен",
        volatility: params.volatility,
        title: `Комната по запросу: ${params.seats} мест`
      }, "auto-created");
      rooms.unshift(best);
      alternatives = ranked.slice(1, 3).map((item, index) => materializeRoom({
        ...item.room,
        title: `${item.room.title} · альтернатива ${index + 1}`
      }, "auto-created"));
      created = true;
    }
    return { best: clone(best), alternatives: clone(alternatives), created };
  },

  async joinRoom(roomId: string, user: TestUser, withBoost = false) {
    await wait(420);
    const sourceRoom = allVisibleRooms().find((item) => roomMatches(item, roomId));
    const sourceTemplate = roomTemplates.find((item) => item.id === roomId);
    const room = sourceRoom ? clone(sourceRoom) : materializeRoom(sourceTemplate ?? roomTemplates[0], "active");
    if (user.balance < room.entryCost) {
      throw new Error("Недостаточно бонусных баллов для резерва.");
    }
    const participant: Participant = {
      id: user.id,
      name: user.name,
      kind: "user",
      avatar: user.avatar,
      vipTier: user.tier,
      hasBoost: withBoost,
      weight: withBoost ? 1.16 : 1
    };
    room.participants = [participant, ...room.participants].slice(0, room.seats);
    room.occupied = room.participants.length;
    room.status = room.occupied >= room.seats ? "ready" : "matching";
    room.prizePool = room.prizePool ?? room.entryCost * room.seats * (room.prizePoolPercent / 100);
    syncActiveRoom(room);
    return clone(room);
  },

  async buyBoost(roomId: string, user: TestUser) {
    await wait(260);
    if (!joinedRoom || !roomMatches(joinedRoom, roomId)) return this.joinRoom(roomId, user, true);
    if (!joinedRoom.boostEnabled) {
      throw new Error("Буст отключен для этой комнаты.");
    }
    if (user.balance < joinedRoom.entryCost + joinedRoom.boostCost) {
      throw new Error("Буст недоступен: баланса хватает только на участие.");
    }
    joinedRoom.participants = joinedRoom.participants.map((participant) =>
      participant.id === user.id ? { ...participant, hasBoost: true, weight: 1.16 } : participant
    );
    syncActiveRoom(joinedRoom);
    return clone(joinedRoom);
  },

  async fillRoomWithBots(roomId: string) {
    await wait(420);
    const room =
      joinedRoom && roomMatches(joinedRoom, roomId)
        ? joinedRoom
        : clone(allVisibleRooms().find((item) => roomMatches(item, roomId)) ?? materializeRoom(roomTemplates[0], "active"));
    const filled = [...room.participants];
    while (filled.length < room.seats) {
      filled.push({
        id: `bot-live-${filled.length}`,
        name: ["Люми", "Астер", "Кай", "Нова", "Миро"][filled.length % 5],
        kind: "bot",
        avatar: ["Л", "А", "К", "Н", "М"][filled.length % 5],
        hasBoost: filled.length % 3 === 0,
        weight: filled.length % 3 === 0 ? 1.1 : 1
      });
    }
    const readyRoom: Room = {
      ...room,
      participants: filled,
      occupied: filled.length,
      status: "ready" as const,
      prizePool: room.prizePool ?? room.entryCost * room.seats * (room.prizePoolPercent / 100)
    };
    syncActiveRoom(readyRoom);
    return clone(readyRoom);
  },

  async createRound(roomId: string, user: TestUser) {
    await wait(520);
    const room = joinedRoom && roomMatches(joinedRoom, roomId) ? joinedRoom : await this.fillRoomWithBots(roomId);
    const filled = room.participants.length >= room.seats ? [...room.participants] : (await this.fillRoomWithBots(roomId)).participants;
    const userBoosted = filled.find((participant) => participant.id === user.id)?.hasBoost ?? false;
    const userWins = room.volatility < 70 || user.tier === "Black Diamond";
    const winner = userWins ? filled.find((participant) => participant.id === user.id) ?? filled[0] : filled[filled.length - 1];
    const balanceChanges = [
      ...filled.map((participant) => ({
        participantId: participant.id,
        participantName: participant.name,
        kind: participant.kind,
        delta: -room.entryCost,
        reason: "entry-reserve" as const
      })),
      ...(userBoosted
        ? [{
            participantId: user.id,
            participantName: user.name,
            kind: "user" as const,
            delta: -room.boostCost,
            reason: "boost" as const
          }]
        : []),
      {
        participantId: winner.id,
        participantName: winner.name,
        kind: winner.kind,
        delta: room.prizePool ?? room.entryCost * room.seats * (room.prizePoolPercent / 100),
        reason: "prize" as const
      }
    ];
    const round: Round = {
      id: `round-${Math.floor(1000 + Math.random() * 8000)}`,
      roomId: room.id,
      roomPublicId: room.publicId,
      roomTitle: room.title,
      mode: room.mode,
      startedAt: new Date().toISOString(),
      entryCost: room.entryCost,
      boostUsed: userBoosted,
      boostCost: room.boostCost,
      boostImpact: room.boostImpact,
      prizePoolPercent: room.prizePoolPercent,
      roomVolatility: room.volatility,
      prizePool: room.prizePool ?? room.entryCost * room.seats * (room.prizePoolPercent / 100),
      participants: filled,
      winnerId: winner.id,
      userId: user.id,
      balanceDelta: balanceChanges.filter((change) => change.participantId === user.id).reduce((sum, change) => sum + change.delta, 0),
      balanceChanges,
      combination: combinations[Math.floor(Math.random() * combinations.length)],
      auditTrail: [
        `резерв:${room.entryCost}`,
        userBoosted ? `буст:${room.boostCost}` : "буст:нет",
        `боты:${room.seats - room.occupied}`,
        "победитель:внешняя логика",
        "слот:внешняя последовательность"
      ]
    };
    rounds.unshift(round);
    syncActiveRoom({ ...room, participants: filled, occupied: filled.length, status: "running" });
    return clone(round);
  },

  async getRound(roundId: string) {
    await wait(180);
    const round = rounds.find((item) => item.id === roundId) ?? rounds[0];
    return clone(round);
  },

  async getRounds() {
    await wait();
    return clone(rounds);
  }
};
