import { GameMode, RoundPhase } from "@/lib/domain/types";

export type VisualGameModule = {
  id: GameMode;
  title: string;
  phases: RoundPhase[];
  durationMs: number;
  description: string;
};

export const visualGameModules: Record<GameMode, VisualGameModule> = {
  "arena-sprint": {
    id: "arena-sprint",
    title: "Гонка шаров",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 12400,
    description: "Шары проходят более длинную закрученную трассу, меняют лидерство и приходят к ясному финишу без движения назад."
  },
  "duel-clash": {
    id: "duel-clash",
    title: "Дуэль шиншилл",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 9800,
    description: "Шиншиллы сходятся парами, проходят турнирную сетку и доводят битву до финального удара."
  },
  "claw-machine": {
    id: "claw-machine",
    title: "Призовой автомат",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 20800,
    description: "Аркадный автомат с ярким краном, ложной попыткой и финальным выпадением победной капсулы."
  },
  "slot-reveal": {
    id: "slot-reveal",
    title: "Магия имени",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 11800,
    description: "Карты собирают чужие фрагменты, меняют порядок и в финале складывают имя победителя."
  },
  "chinchilla-race": {
    id: "chinchilla-race",
    title: "Гонки шиншилл",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 15600,
    description: "Премиальная гонка с живой драматургией, эффектными обгонами и финалом, который подтверждает backend."
  }
};

export const phaseCopy: Record<RoundPhase, { title: string; body: string }> = {
  intro: { title: "Запускаем раунд", body: "Собираем состав и готовим сцену к короткому розыгрышу." },
  live: { title: "Идет розыгрыш", body: "Сцена набирает ход, а интрига постепенно растет." },
  suspense: { title: "Финальный момент", body: "Еще немного — и станет ясно, кто заберет этот раунд." },
  reveal: { title: "Победитель определяется", body: "Смотрим на финальное движение и ждем точку раскрытия." },
  result: { title: "Вот ваш результат", body: "Раунд завершен: можно посмотреть итог и решить, что делать дальше." }
};
