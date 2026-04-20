import type { AnalysisIssue, AnalysisIssueLevel, ConfigTestResponse } from "@/src/features/admin-room-templates/model/types";
import type { RoomTemplateFormValues } from "@/src/features/admin-room-templates/model/types";

type UnknownRecord = Record<string, unknown>;

export function normalizeConfigTestResponse(raw: unknown): ConfigTestResponse {
  const record = isRecord(raw) ? raw : {};
  const parsedFromText = typeof raw === "string" ? parseTextReport(raw) : [];
  const explicitIssues = [
    ...extractIssueArray(record.issues),
    ...extractIssueArray(record.warnings).map((issue) => ({ ...issue, level: normalizeLevel(issue.level, "warning") })),
    ...extractIssueArray(record.blockers).map((issue) => ({ ...issue, level: normalizeLevel(issue.level, "blocker") })),
    ...extractIssueArray(record.recommendations).map((issue) => ({ ...issue, level: normalizeLevel(issue.level, "recommendation") })),
    ...parsedFromText
  ];
  const summaryIssues = typeof record.summary === "string" ? parseTextReport(record.summary) : [];
  const issues = dedupeIssues([...explicitIssues, ...summaryIssues]);
  const blocked = Boolean(record.blocked) || issues.some((issue) => issue.level === "blocker");

  const names = asStringArray(record.names ?? record.players);
  const wins = normalizeWins(record.wins, names);
  return {
    blocked,
    issues,
    blockers: issues.filter((issue) => issue.level === "blocker"),
    warnings: issues.filter((issue) => issue.level === "warning"),
    recommendations: issues.filter((issue) => issue.level === "recommendation"),
    metrics: normalizeMetrics(record),
    names,
    probs: asNumberArray(record.probs ?? record.probabilities),
    wins,
    raw
  };
}

export function localRecommendations(response: ConfigTestResponse) {
  const recommendations: AnalysisIssue[] = [...response.recommendations];
  const metrics = response.metrics;

  if (typeof metrics.houseMargin === "number" && metrics.houseMargin > 0.35) {
    recommendations.push({
      level: "recommendation",
      code: "HOUSE_MARGIN_HIGH",
      title: "Проверьте привлекательность фонда",
      message: "Доля организатора выглядит высокой. Игроку может не хватить ощущения ценности комнаты."
    });
  }

  if (typeof metrics.boostImpactShare === "number" && metrics.boostImpactShare > 0.1) {
    recommendations.push({
      level: "recommendation",
      code: "BOOST_IMPACT_REVIEW",
      title: "Смягчите влияние буста",
      message: "Буст заметно влияет на шанс. Лучше держать его как аккуратное усиление, а не доминирующий фактор."
    });
  }

  if (!recommendations.length && !response.blockers.length && !response.warnings.length) {
    recommendations.push({
      level: "recommendation",
      code: "CONFIG_OK",
      title: "Конфигурация выглядит стабильной",
      message: "Критичных рисков не найдено. Можно публиковать после финальной проверки параметров."
    });
  }

  return dedupeIssues(recommendations);
}

export function buildLocalConfigAnalysis(values: RoomTemplateFormValues): ConfigTestResponse {
  const players = values.players.length ? values.players.slice(0, values.seats) : [];
  const weights = players.map((player) => values.baseWeight + (values.boostEnabled && player.boost ? values.boostWeight : 0));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const names = players.map((player, index) => player.name.trim() || `Игрок ${index + 1}`);
  const probs = weights.map((weight) => weight / totalWeight);
  const wins = Object.fromEntries(names.map((name, index) => [name, Math.round(probs[index] * values.simRounds)]));
  const totalEntry = values.entryCost * players.length;
  const prizePool = totalEntry * (values.prizePoolPercent / 100);
  const houseMargin = totalEntry ? (totalEntry - prizePool) / totalEntry : 0;
  const averagePlayerROI = values.entryCost ? prizePool / players.length / values.entryCost : 0;
  const minPlayerROI = values.entryCost ? Math.min(...probs.map((prob) => (prob * prizePool) / values.entryCost)) : 0;
  const baseChance = players.length ? 1 / players.length : 0;
  const maxBoostChance = Math.max(...probs, 0);
  const boostImpactShare = Math.max(0, maxBoostChance - baseChance);
  const boostEfficiencyVsCosts = values.boostEnabled && values.boostCost + values.entryCost > 0
    ? boostImpactShare / ((values.boostCost + values.entryCost) / Math.max(values.entryCost, 1))
    : 0;

  const issues: AnalysisIssue[] = [];
  if (values.entryCost < 1000 || values.entryCost > 10000) {
    issues.push({
      level: "blocker",
      code: "ENTRY_COST_OUT_OF_RANGE",
      title: "Цена входа вне диапазона",
      message: "Нормальный диапазон 1000–10000."
    });
  }
  if (values.prizePoolPercent !== 80) {
    issues.push({
      level: "warning",
      code: "WINNER_PERCENT_NOT_RECOMMENDED",
      title: "Нерекомендуемая выплата победителю",
      message: "Рекомендовано 80%."
    });
  }
  if (values.boostEnabled && values.boostWeight > 20) {
    issues.push({
      level: "warning",
      code: "BOOST_WEIGHT_HIGH",
      title: "Буст слишком заметно влияет на шанс",
      message: "Сильный буст может выглядеть как покупка преимущества."
    });
  }
  if (players.length < values.seats) {
    issues.push({
      level: "recommendation",
      code: "PLAYERS_LESS_THAN_SEATS",
      title: "Игроков для анализа меньше, чем мест",
      message: "Добавьте участников до количества мест, чтобы график точнее отражал комнату."
    });
  }

  return {
    blocked: issues.some((issue) => issue.level === "blocker"),
    issues,
    blockers: issues.filter((issue) => issue.level === "blocker"),
    warnings: issues.filter((issue) => issue.level === "warning"),
    recommendations: issues.filter((issue) => issue.level === "recommendation"),
    metrics: {
      totalEntry,
      prizePool,
      houseMargin,
      averagePlayerROI,
      minPlayerROI,
      boostImpactShare,
      boostEfficiencyVsCosts
    },
    names,
    probs,
    wins,
    raw: { source: "local-preview" }
  };
}

function parseTextReport(text: string): AnalysisIssue[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const issues: AnalysisIssue[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/\[(БЛОК|ПРЕДУПРЕЖДЕНИЕ|WARNING|BLOCK|ERROR|RECOMMENDATION)\]\s*(?:\[([^\]]+)\])?\s*(.*)/i);
    if (!match) continue;

    const level = textLevel(match[1]);
    const code = match[2];
    const title = match[3] || (level === "blocker" ? "Блокировка" : "Предупреждение");
    const message = lines[index + 1] && !lines[index + 1].startsWith("[") ? lines[index + 1] : title;
    issues.push({ level, code, title, message });
  }

  return issues;
}

function extractIssueArray(value: unknown): AnalysisIssue[] {
  if (!Array.isArray(value)) return [];
  return value.map(issueFromUnknown).filter(Boolean) as AnalysisIssue[];
}

function issueFromUnknown(value: unknown): AnalysisIssue | null {
  if (typeof value === "string") {
    const parsed = parseTextReport(value);
    return parsed[0] ?? { level: "warning", title: value, message: value };
  }

  if (!isRecord(value)) return null;
  const level = normalizeLevel(value.level ?? value.severity ?? value.type, "warning");
  const title = String(value.title ?? value.code ?? value.message ?? "Предупреждение");
  const message = String(value.message ?? value.description ?? title);
  return {
    level,
    code: value.code ? String(value.code) : undefined,
    title,
    message
  };
}

function normalizeLevel(value: unknown, fallback: AnalysisIssueLevel): AnalysisIssueLevel {
  if (typeof value !== "string") return fallback;
  const normalized = value.toLowerCase();
  if (["blocker", "block", "error", "critical", "блок"].includes(normalized)) return "blocker";
  if (["warning", "warn", "предупреждение"].includes(normalized)) return "warning";
  if (["recommendation", "recommend", "совет", "рекомендация"].includes(normalized)) return "recommendation";
  return fallback;
}

function textLevel(value: string): AnalysisIssueLevel {
  return normalizeLevel(value, value.toUpperCase() === "БЛОК" ? "blocker" : "warning");
}

function normalizeWins(value: unknown, names: string[]): Record<string, number> {
  if (Array.isArray(value)) {
    return Object.fromEntries(value.map((item, index) => [names[index] ?? `Игрок ${index + 1}`, Number(item) || 0]));
  }
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item) || 0]));
}

function normalizeMetrics(record: UnknownRecord) {
  if (isRecord(record.metrics)) return numberRecord(record.metrics);
  const metricKeys = [
    "totalEntry",
    "prizePool",
    "houseMargin",
    "averagePlayerROI",
    "minPlayerROI",
    "boostImpactShare",
    "boostEfficiencyVsCosts"
  ];
  return Object.fromEntries(
    metricKeys
      .map((key) => [key, Number(record[key])] as const)
      .filter(([, value]) => Number.isFinite(value))
  );
}

function numberRecord(value: UnknownRecord) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)]).filter(([, item]) => Number.isFinite(item)));
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asNumberArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

function dedupeIssues(issues: AnalysisIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.level}:${issue.code ?? ""}:${issue.title}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
