import type { GameMode, RoomTemplate } from "@/lib/domain/types";
import type { BackendGameMechanic } from "@/src/shared/config/game-mechanics";

export type RoomTemplateDto = {
  id: string;
  templateName: string;
  active: boolean;
  entryCost: number;
  bonusEnabled: boolean;
  bonusPrice: number;
  bonusWeight: number;
  maxPlayers: number;
  gameMechanic: BackendGameMechanic;
  createdAt: string;
  updatedAt: string;
};

export type CreateRoomTemplateRequest = {
  templateName: string;
  active: boolean;
  entryCost: number;
  bonusEnabled: boolean;
  bonusPrice: number;
  bonusWeight: number;
  maxPlayers: number;
  gameMechanic: BackendGameMechanic;
};

export type UpdateRoomTemplateRequest = CreateRoomTemplateRequest;

export type RoomTemplateFormValues = {
  title: string;
  mode: GameMode;
  entryCost: number;
  seats: number;
  boostCost: number;
  boostEnabled: boolean;
  boostWeight: number;
  prizePoolPercent: number;
  botFillDelay: number;
  volatility: number;
  templateVisible: boolean;
  baseWeight: number;
  simRounds: number;
  players: ConfigTestPlayer[];
};

export type ConfigTestPlayer = {
  name: string;
  boost: boolean;
};

export type ConfigTestRequest = {
  players: ConfigTestPlayer[];
  baseWeight: number;
  boostBonus: number;
  boostCost: number;
  entryCost: number;
  winnerPercent: number;
  simRounds: number;
};

export type AnalysisIssueLevel = "blocker" | "warning" | "recommendation" | "info";

export type AnalysisIssue = {
  level: AnalysisIssueLevel;
  code?: string;
  title: string;
  message: string;
};

export type ConfigAnalysisMetrics = {
  totalEntry?: number;
  prizePool?: number;
  houseMargin?: number;
  averagePlayerROI?: number;
  minPlayerROI?: number;
  boostImpactShare?: number;
  boostEfficiencyVsCosts?: number;
  [key: string]: number | undefined;
};

export type ConfigTestResponse = {
  blocked: boolean;
  issues: AnalysisIssue[];
  blockers: AnalysisIssue[];
  warnings: AnalysisIssue[];
  recommendations: AnalysisIssue[];
  metrics: ConfigAnalysisMetrics;
  names: string[];
  probs: number[];
  wins: Record<string, number>;
  raw: unknown;
};

export type ConfigReportParams = {
  baseWeight: number;
  boostBonus: number;
  boostCost: number;
  entryCost: number;
  winnerPercent: number;
  simRounds: number;
  players: string;
  boosted: string;
};

export type AdminTemplateService = {
  getTemplates: () => Promise<RoomTemplate[]>;
  createTemplate: (values: RoomTemplateFormValues) => Promise<RoomTemplate>;
  updateTemplate: (id: string, values: RoomTemplateFormValues) => Promise<RoomTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  testConfig: (values: RoomTemplateFormValues) => Promise<ConfigTestResponse>;
  downloadReport: (values: RoomTemplateFormValues) => Promise<Blob>;
};
