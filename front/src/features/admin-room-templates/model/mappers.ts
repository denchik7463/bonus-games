import type { AdminRoomConfig, RoomTemplate } from "@/lib/domain/types";
import { backendMechanicFromMode, modeFromBackendMechanic } from "@/src/shared/config/game-mechanics";
import type {
  ConfigReportParams,
  ConfigTestRequest,
  CreateRoomTemplateRequest,
  RoomTemplateDto,
  RoomTemplateFormValues
} from "@/src/features/admin-room-templates/model/types";

export function roomTemplateDtoToDomain(dto: RoomTemplateDto): RoomTemplate {
  const mode = modeFromBackendMechanic(dto.gameMechanic);
  const id = dto.id ?? dto.templateId ?? "";
  return {
    id,
    title: dto.templateName,
    mode,
    entryCost: dto.entryCost,
    prizeFund: positiveNumber(dto.prizeFund) ?? Math.round(dto.entryCost * dto.maxPlayers * ((dto.winnerPercent ?? 80) / 100)),
    boostCost: dto.bonusEnabled ? dto.bonusPrice : 0,
    boostLabel: dto.bonusEnabled ? "Буст участия" : "Буст отключен",
    boostImpact: dto.bonusEnabled ? `+${dto.bonusWeight}% к весу участия` : "буст отключен",
    boostEnabled: dto.bonusEnabled,
    prizePoolPercent: dto.winnerPercent ?? 80,
    seats: dto.maxPlayers,
    reservedUntilSec: 60,
    volatility: 62,
    templateVisible: dto.active,
    recommendedFor: ["Gold", "Platinum", "Black Diamond"]
  };
}

export function formValuesToCreateRequest(values: RoomTemplateFormValues): CreateRoomTemplateRequest {
  return {
    templateName: values.title,
    active: values.templateVisible,
    entryCost: values.entryCost,
    bonusEnabled: values.boostEnabled,
    bonusPrice: values.boostEnabled ? values.boostCost : 0,
    bonusWeight: values.boostEnabled ? values.boostWeight : 0,
    maxPlayers: values.seats,
    winnerPercent: values.prizePoolPercent,
    gameMechanic: backendMechanicFromMode(values.mode)
  };
}

export function formValuesToConfigRequest(values: RoomTemplateFormValues): ConfigTestRequest {
  const players = normalizePlayers(values.players, values.seats);
  return {
    players,
    baseWeight: values.baseWeight,
    boostBonus: values.boostEnabled ? values.boostWeight : 0,
    boostCost: values.boostEnabled ? values.boostCost : 0,
    entryCost: values.entryCost,
    winnerPercent: values.prizePoolPercent,
    simRounds: values.simRounds
  };
}

export function formValuesToReportParams(values: RoomTemplateFormValues): ConfigReportParams {
  const request = formValuesToConfigRequest(values);
  return {
    baseWeight: request.baseWeight,
    boostBonus: request.boostBonus,
    boostCost: request.boostCost,
    entryCost: request.entryCost,
    winnerPercent: request.winnerPercent,
    simRounds: request.simRounds,
    players: request.players.map((player) => player.name).join(","),
    boosted: request.players.filter((player) => player.boost).map((player) => player.name).join(",")
  };
}

export function domainTemplateToFormValues(template: RoomTemplate): RoomTemplateFormValues {
  const boostWeight = Number(template.boostImpact.match(/\+(\d+)%/)?.[1] ?? 10);
  return {
    title: template.title,
    mode: template.mode,
    entryCost: template.entryCost,
    seats: template.seats,
    boostCost: template.boostCost,
    boostEnabled: template.boostEnabled,
    boostWeight: template.boostEnabled ? boostWeight : 0,
    prizePoolPercent: template.prizePoolPercent,
    botFillDelay: 60,
    volatility: template.volatility,
    templateVisible: template.templateVisible !== false,
    baseWeight: 100,
    simRounds: 10000,
    players: buildDefaultPlayers(template.seats, template.boostEnabled)
  };
}

export function formValuesToAdminConfig(values: RoomTemplateFormValues): AdminRoomConfig {
  return {
    title: values.title,
    mode: values.mode,
    entryCost: values.entryCost,
    seats: values.seats,
    boostCost: values.boostEnabled ? values.boostCost : 0,
    boostEnabled: values.boostEnabled,
    boostWeight: values.boostEnabled ? values.boostWeight : 0,
    prizePoolPercent: values.prizePoolPercent,
    botFillDelay: values.botFillDelay,
    volatility: values.volatility,
    templateVisible: values.templateVisible
  };
}

export function buildDefaultPlayers(count: number, boostEnabled: boolean) {
  return Array.from({ length: Math.max(2, Math.min(10, count)) }, (_, index) => ({
    name: `Игрок ${index + 1}`,
    boost: boostEnabled && index === 2
  }));
}

function normalizePlayers(players: RoomTemplateFormValues["players"], seats: number) {
  const source = players.length ? players : buildDefaultPlayers(seats, false);
  return source.slice(0, seats).map((player, index) => ({
    name: player.name.trim() || `Игрок ${index + 1}`,
    boost: Boolean(player.boost)
  }));
}

function positiveNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
