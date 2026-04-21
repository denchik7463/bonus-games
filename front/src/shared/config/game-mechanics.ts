import type { GameMode } from "@/lib/domain/types";

export type BackendGameMechanic = "classic" | "tournament" | "claw-machine" | "slot-reveal" | string;

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
    description: "Основная механика с трассой, сменой лидерства и читаемым финишем."
  },
  "claw-machine": {
    key: "claw-machine",
    backendValue: "claw-machine",
    renderer: "claw-machine",
    label: "Автомат с шарами",
    shortLabel: "Автомат",
    description: "Кран выбирает капсулу через постановочную сцену с попыткой и финальным drop."
  },
  "duel-clash": {
    key: "duel-clash",
    backendValue: "tournament",
    renderer: "duel-clash",
    label: "Дуэль",
    shortLabel: "Дуэль",
    description: "Пиксельная арена: участники поочередно выбывают до одного победителя."
  },
  "slot-reveal": {
    key: "slot-reveal",
    backendValue: "slot-reveal",
    renderer: "slot-reveal",
    label: "Карточки",
    shortLabel: "Карточки",
    description: "Карточный розыгрыш с движением, ложным раскрытием и финальной комбинацией."
  }
};

const backendToFrontend: Record<string, GameMode> = Object.values(GAME_MECHANICS).reduce(
  (acc, item) => {
    acc[item.backendValue] = item.key;
    return acc;
  },
  {} as Record<string, GameMode>
);

backendToFrontend.WEIGHTED_RANDOM = "arena-sprint";
backendToFrontend.CLASSIC = "arena-sprint";
backendToFrontend.TOURNAMENT = "duel-clash";
backendToFrontend.CLAW_MACHINE = "claw-machine";
backendToFrontend.SLOT_REVEAL = "slot-reveal";

export function backendMechanicFromMode(mode: GameMode) {
  return GAME_MECHANICS[mode].backendValue;
}

export function modeFromBackendMechanic(value?: BackendGameMechanic): GameMode {
  if (!value) return "arena-sprint";
  return backendToFrontend[value] ?? "arena-sprint";
}

export function mechanicTitleByMode(mode: GameMode) {
  return GAME_MECHANICS[mode]?.label ?? "Гонка шаров";
}
