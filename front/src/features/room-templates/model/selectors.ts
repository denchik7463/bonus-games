import type { RoomTemplate } from "@/lib/domain/types";

export type RoomTemplateFilterOptions = {
  entryCosts: number[];
  prizeFunds: number[];
  seats: number[];
  boostAllowed: boolean[];
  boostCosts: number[];
};

export function getVisibleTemplates(templates: RoomTemplate[]) {
  return templates.filter((template) => template.templateVisible !== false);
}

export function buildTemplateFilterOptions(templates: RoomTemplate[]): RoomTemplateFilterOptions {
  const visible = getVisibleTemplates(templates);
  return {
    entryCosts: uniqueNumbers(visible.map((template) => template.entryCost)),
    prizeFunds: uniqueNumbers(visible.map((template) => template.prizeFund ?? template.entryCost * template.seats * (template.prizePoolPercent / 100))),
    seats: uniqueNumbers(visible.map((template) => template.seats)),
    boostAllowed: Array.from(new Set(visible.map((template) => template.boostEnabled))),
    boostCosts: uniqueNumbers(visible.filter((template) => template.boostEnabled).map((template) => template.boostCost))
  };
}

export function getBoostCostOptions(
  templates: RoomTemplate[],
  params: { entryCost: number | null; seats: number | null }
) {
  const visible = getVisibleTemplates(templates);
  const scoped = visible.filter((template) =>
    template.boostEnabled &&
    (params.entryCost === null || template.entryCost === params.entryCost) &&
    (params.seats === null || template.seats === params.seats)
  );
  return uniqueNumbers((scoped.length ? scoped : visible.filter((template) => template.boostEnabled)).map((template) => template.boostCost));
}

export function findMatchingTemplates(
  templates: RoomTemplate[],
  params: { entryCost: number | null; seats: number | null; boostEnabled: boolean | null; boostCost: number | null }
) {
  return getVisibleTemplates(templates).filter((template) =>
    template.entryCost === params.entryCost &&
    template.seats === params.seats &&
    template.boostEnabled === params.boostEnabled &&
    (!params.boostEnabled || template.boostCost === params.boostCost)
  );
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values)).filter(Number.isFinite).sort((a, b) => a - b);
}
