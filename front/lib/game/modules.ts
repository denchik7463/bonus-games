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
    title: "Дуэль арены",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 9800,
    description: "Пиксельные бойцы обмениваются короткими атаками, выбывают один за другим и оставляют на арене одного победителя."
  },
  "claw-machine": {
    id: "claw-machine",
    title: "Автомат с шарами",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 16800,
    description: "Аркадный кран с драматургией почти-удачных попыток и финальным захватом капсулы победителя."
  },
  "slot-reveal": {
    id: "slot-reveal",
    title: "Раскрытие символов",
    phases: ["intro", "live", "suspense", "reveal", "result"],
    durationMs: 9800,
    description: "Летающие карточки создают управляемый хаос, собирают ложное имя и только потом складывают настоящее имя победителя."
  }
};

export const phaseCopy: Record<RoundPhase, { title: string; body: string }> = {
  intro: { title: "Запускаем раунд", body: "Собираем состав и готовим сцену к короткому розыгрышу." },
  live: { title: "Идет розыгрыш", body: "Сцена набирает ход, а интрига постепенно растет." },
  suspense: { title: "Финальный момент", body: "Еще немного — и станет ясно, кто заберет этот раунд." },
  reveal: { title: "Победитель определяется", body: "Смотрим на финальное движение и ждем точку раскрытия." },
  result: { title: "Вот ваш результат", body: "Раунд завершен: можно посмотреть итог и решить, что делать дальше." }
};
