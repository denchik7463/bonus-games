import type { GameMode } from "@/lib/domain/types";

export type BackendGameMechanic = "classic" | "tournament" | "claw-machine" | "slot-reveal" | "chinchilla-race" | string;

export type GameMechanicConfig = {
  key: GameMode;
  backendValue: BackendGameMechanic;
  renderer: GameMode;
  label: string;
  shortLabel: string;
  description: string;
};

export const GAME_MECHANICS: Record<GameMode, GameMechanicConfig> = {
  "arena-sprint": {
    key: "arena-sprint",
    backendValue: "classic",
    renderer: "arena-sprint",
    label: "Гонка шаров",
    shortLabel: "Гонка",
    description: "Шары несутся по трассе, обгоняют друг друга и доходят до напряженного финиша."
  },
  "claw-machine": {
    key: "claw-machine",
    backendValue: "claw-machine",
    renderer: "claw-machine",
    label: "Призовой автомат",
    shortLabel: "Автомат",
    description: "Кран наводится на капсулы, делает ложный захват и эффектно отправляет победный шар в призовую шахту."
  },
  "duel-clash": {
    key: "duel-clash",
    backendValue: "tournament",
    renderer: "duel-clash",
    label: "Дуэль шиншилл",
    shortLabel: "Дуэль",
    description: "Шиншиллы выходят на арену, сходятся в парах, проходят дуэли и добираются до финального удара."
  },
  "slot-reveal": {
    key: "slot-reveal",
    backendValue: "slot-reveal",
    renderer: "slot-reveal",
    label: "Магия имени",
    shortLabel: "Карты",
    description: "Карты собирают ложные фрагменты имен, сбивают интригу и в финале складывают имя победителя."
  },
  "chinchilla-race": {
    key: "chinchilla-race",
    backendValue: "chinchilla-race",
    renderer: "chinchilla-race",
    label: "Гонки шиншилл",
    shortLabel: "Шиншиллы",
    description: "Цветные шиншиллы бегут по премиальной трассе, меняют лидерство и эффектно пересекают финиш."
  }
};

const backendToFrontend: Record<string, GameMode> = Object.values(GAME_MECHANICS).reduce(
  (acc, item) => {
    acc[normalizeMechanicValue(item.backendValue)] = item.key;
    return acc;
  },
  {} as Record<string, GameMode>
);

[
  "WEIGHTED_RANDOM",
  "CLASSIC",
  "BALL_RACE",
  "RACE",
  "arena-sprint",
  "Гонка шаров"
].forEach((value) => {
  backendToFrontend[normalizeMechanicValue(value)] = "arena-sprint";
});

[
  "TOURNAMENT",
  "DUEL",
  "DUEL_CLASH",
  "duel-clash",
  "Дуэль"
].forEach((value) => {
  backendToFrontend[normalizeMechanicValue(value)] = "duel-clash";
});

[
  "CLAW_MACHINE",
  "CLAW",
  "BALL_MACHINE",
  "BALL_AUTOMAT",
  "claw-machine",
  "Автомат с шарами"
].forEach((value) => {
  backendToFrontend[normalizeMechanicValue(value)] = "claw-machine";
});

[
  "SLOT_REVEAL",
  "CARDS",
  "CARD",
  "CARD_REVEAL",
  "slot-reveal",
  "Карточки"
].forEach((value) => {
  backendToFrontend[normalizeMechanicValue(value)] = "slot-reveal";
});

[
  "CHINCHILLA_RACE",
  "CHINCHILLA",
  "CHINCHILLAS",
  "CHINCHILLA_RUN",
  "CHINCHILLA_SPRINT",
  "chinchilla-race",
  "Гонки шиншилл",
  "ГОНКИ ШИНШИЛЛ"
].forEach((value) => {
  backendToFrontend[normalizeMechanicValue(value)] = "chinchilla-race";
});

export function backendMechanicFromMode(mode: GameMode) {
  return GAME_MECHANICS[mode].backendValue;
}

export function modeFromBackendMechanic(value?: BackendGameMechanic): GameMode {
  if (!value) return "arena-sprint";
  return backendToFrontend[normalizeMechanicValue(value)] ?? "arena-sprint";
}

export function mechanicTitleByMode(mode: GameMode) {
  return GAME_MECHANICS[mode]?.label ?? "Гонка шаров";
}

function normalizeMechanicValue(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}
