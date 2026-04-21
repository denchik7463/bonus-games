import { Participant, Room, RoomTemplate, Round, TestUser, WinningCombination } from "@/lib/domain/types";

export const testUsers: TestUser[] = [
  {
    id: "u-aurora",
    name: "Анна Воронцова",
    handle: "@aurora",
    tier: "Black Diamond",
    balance: 1000,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    riskStyle: "bold",
    role: "player"
  },
  {
    id: "u-noir",
    name: "Марк Левин",
    handle: "@noir",
    tier: "Platinum",
    balance: 6420,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
    riskStyle: "balanced",
    role: "expert"
  },
  {
    id: "u-velvet",
    name: "София Рэй",
    handle: "@velvet",
    tier: "Gold",
    balance: 15,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80",
    riskStyle: "calm",
    role: "player"
  },
  {
    id: "u-admin",
    name: "Илья Орлов",
    handle: "@operator",
    tier: "Black Diamond",
    balance: 50000,
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=240&q=80",
    riskStyle: "balanced",
    role: "admin"
  }
];

export const combinations: WinningCombination[] = [
  {
    id: "orbital-7",
    label: "Орбитальный код 7",
    rarity: "mythic",
    tokens: ["VIP", "17", "К", "ИОН", "03"],
    palette: ["#d8b55f", "#39d98a", "#ede8dc"]
  },
  {
    id: "signal-crown",
    label: "Коронный сигнал",
    rarity: "signature",
    tokens: ["КОР", "5", "VX", "11", "НОВА"],
    palette: ["#d8b55f", "#e4503d", "#ede8dc"]
  },
  {
    id: "jade-vector",
    label: "Нефритовый вектор",
    rarity: "rare",
    tokens: ["J", "21", "РИФТ", "8", "ВХОД"],
    palette: ["#39d98a", "#4dd7c8", "#ede8dc"]
  }
];

const bots: Participant[] = [
  { id: "b-01", name: "Милан", kind: "bot", avatar: "М", hasBoost: false, weight: 1 },
  { id: "b-02", name: "Рея", kind: "bot", avatar: "Р", hasBoost: false, weight: 1 },
  { id: "b-03", name: "Вектор", kind: "bot", avatar: "В", hasBoost: true, weight: 1.18 },
  { id: "b-04", name: "Ноа", kind: "bot", avatar: "Н", hasBoost: false, weight: 1 }
];

export const roomTemplates: RoomTemplate[] = [
  {
    id: "room-neon-01",
    templateVisible: true,
    title: "Гонка шаров: коронная трасса",
    mode: "arena-sprint",
    entryCost: 320,
    boostCost: 90,
    boostLabel: "Векторный буст",
    boostImpact: "+12% к весу участия",
    boostEnabled: true,
    prizePoolPercent: 100,
    seats: 6,
    reservedUntilSec: 18,
    recommendedFor: ["Gold", "Platinum", "Black Diamond"],
    volatility: 62
  },
  {
    id: "room-duel-02",
    templateVisible: true,
    title: "Арена столкновения: обсидиан",
    mode: "duel-clash",
    entryCost: 540,
    boostCost: 140,
    boostLabel: "Импульсная аура",
    boostImpact: "+15% к весу участия",
    boostEnabled: true,
    prizePoolPercent: 100,
    seats: 4,
    reservedUntilSec: 12,
    recommendedFor: ["Platinum", "Black Diamond"],
    volatility: 77
  },
  {
    id: "room-claw-03",
    templateVisible: true,
    title: "Автомат с шарами: сейфовый дроп",
    mode: "claw-machine",
    entryCost: 180,
    boostCost: 50,
    boostLabel: "Импульс захвата",
    boostImpact: "+8% к весу участия",
    boostEnabled: true,
    prizePoolPercent: 100,
    seats: 8,
    reservedUntilSec: 24,
    recommendedFor: ["Gold", "Platinum"],
    volatility: 44
  },
  {
    id: "room-slot-04",
    templateVisible: true,
    title: "Раскрытие символов: редкий паттерн",
    mode: "slot-reveal",
    entryCost: 760,
    boostCost: 190,
    boostLabel: "Редкая фиксация",
    boostImpact: "+18% к весу участия",
    boostEnabled: true,
    prizePoolPercent: 100,
    seats: 5,
    reservedUntilSec: 9,
    recommendedFor: ["Black Diamond"],
    volatility: 86
  }
];

export const rooms: Room[] = [];

export const rounds: Round[] = [
  {
    id: "round-1007",
    roomId: "room-neon-01",
    roomPublicId: "КОРОНА",
    roomTitle: "Гонка шаров: коронная трасса",
    mode: "arena-sprint",
    startedAt: "2026-04-17T16:48:00+03:00",
    entryCost: 320,
    boostUsed: true,
    boostCost: 90,
    boostImpact: "+12% к весу участия",
    prizePoolPercent: 100,
    roomVolatility: 62,
    prizePool: 1920,
    participants: [
      { id: "u-aurora", name: "Анна Воронцова", kind: "user", avatar: testUsers[0].avatar, vipTier: "Black Diamond", hasBoost: true, weight: 1.16 },
      bots[0],
      bots[1],
      bots[2],
      bots[3],
      { ...bots[0], id: "b-06", name: "Люми", avatar: "Л" }
    ],
    winnerId: "u-aurora",
    userId: "u-aurora",
    balanceDelta: 1510,
    balanceChanges: [
      { participantId: "u-aurora", participantName: "Анна Воронцова", kind: "user", delta: -320, reason: "entry-reserve" },
      { participantId: "u-aurora", participantName: "Анна Воронцова", kind: "user", delta: -90, reason: "boost" },
      { participantId: "u-aurora", participantName: "Анна Воронцова", kind: "user", delta: 1920, reason: "prize" },
      { participantId: "b-01", participantName: "Милан", kind: "bot", delta: -320, reason: "entry-reserve" },
      { participantId: "b-02", participantName: "Рея", kind: "bot", delta: -320, reason: "entry-reserve" }
    ],
    combination: combinations[0],
    auditTrail: ["резерв:320", "буст:90", "боты:3", "победитель:внешний seed", "комбинация:орбитальный код"]
  },
  {
    id: "round-1006",
    roomId: "room-duel-02",
    roomPublicId: "ОБСИДН",
    roomTitle: "Арена столкновения: обсидиан",
    mode: "duel-clash",
    startedAt: "2026-04-17T16:21:00+03:00",
    entryCost: 540,
    boostUsed: false,
    boostCost: 140,
    boostImpact: "+15% к весу участия",
    prizePoolPercent: 100,
    roomVolatility: 77,
    prizePool: 2160,
    participants: [
      { id: "u-aurora", name: "Анна Воронцова", kind: "user", avatar: testUsers[0].avatar, vipTier: "Black Diamond", hasBoost: false, weight: 1 },
      bots[0],
      bots[2],
      bots[3]
    ],
    winnerId: "b-03",
    userId: "u-aurora",
    balanceDelta: -540,
    balanceChanges: [
      { participantId: "u-aurora", participantName: "Анна Воронцова", kind: "user", delta: -540, reason: "entry-reserve" },
      { participantId: "b-03", participantName: "Вектор", kind: "bot", delta: 2160, reason: "prize" }
    ],
    combination: combinations[1],
    auditTrail: ["резерв:540", "боты:2", "победитель:внешний seed", "комбинация:коронный сигнал"]
  }
];
