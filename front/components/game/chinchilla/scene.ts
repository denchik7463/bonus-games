import { Payload } from "@/components/game/shared/types";
import {
  bell,
  clamp,
  drawConfetti,
  drawWinnerPopup,
  height,
  lerp,
  pointOnPolyline,
  roundRect,
  sampleSpline,
  shade,
  smoothstep,
  width
} from "@/components/game/shared/primitives";
import type { Participant } from "@/lib/domain/types";

const lanePalette = ["#b57bff", "#60caff", "#c8c8c8", "#ffd24b", "#84e63b", "#ff9b2f", "#33d1ff", "#ff6eb6", "#ff6a4d", "#f6f0e6"];
const chinchillaSources = [
  "/mascots/ch1.png",
  "/mascots/ch2.png",
  "/mascots/ch3.png",
  "/mascots/ch4.png",
  "/mascots/ch5.png",
  "/mascots/ch6.png",
  "/mascots/ch7.png",
  "/mascots/ch8.png",
  "/mascots/ch9.png",
  encodeURI("/mascots/сh10.png")
];

type AssetEntry = {
  image: HTMLImageElement;
  ready: boolean;
  error: boolean;
};

const assetCache = new Map<string, AssetEntry>();
type RaceMemory = {
  order: string[];
  headline: string;
  lastSeenAt: number;
};

const raceMemory = new Map<string, RaceMemory>();

const trackGuide = sampleSpline([
  { x: 130, y: 118 },
  { x: 246, y: 94 },
  { x: 362, y: 138 },
  { x: 472, y: 112 },
  { x: 602, y: 142 },
  { x: 714, y: 110 },
  { x: 758, y: 178 },
  { x: 666, y: 248 },
  { x: 548, y: 220 },
  { x: 448, y: 276 },
  { x: 314, y: 250 },
  { x: 208, y: 286 },
  { x: 134, y: 242 }
], 14);

export function drawChinchillaRaceScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const participants = payload.participants.slice(0, 10);
  const count = Math.max(participants.length, 1);
  const winner = participants.find((participant) => participant.id === payload.winnerId || participant.winner) ?? participants[0];
  const winnerId = winner?.id ?? payload.winnerId;
  const rows = participants.map((participant, index) => buildRow(participant, index, count, progress, time, winnerId));
  const sortedRows = [...rows].sort((a, b) => a.travel - b.travel);
  const leader = sortedRows[sortedRows.length - 1];
  const winnerRow = rows.find((row) => row.participant.id === winner?.id);
  const liveFeed = updateRaceMemory(payload.roundId, sortedRows, progress, time);

  drawBackdropScene(ctx, time);
  drawTrackScene(ctx, progress, time);
  drawStartFinish(ctx, progress, time);
  drawPerimeterLights(ctx, time);
  drawTitleBlock(ctx, progress, leader?.participant.name ?? "Старт");
  drawPositionsPanel(ctx, participants, rows, time);
  drawBoostPanel(ctx, participants, rows, progress, time, winner);
  drawLaneTrails(ctx, sortedRows, progress, time);
  drawOvertakeBursts(ctx, rows, progress, time, winnerId);
  rows.forEach((row) => drawChinchilla(ctx, row, progress, time));
  drawFinishRush(ctx, rows, progress, time, winnerId);
  drawStandingsFeed(ctx, liveFeed, time);
  drawRaceTicker(ctx, leader, progress);

  if (progress > 0.9) {
    drawConfetti(ctx, time, progress);
    drawWinnerPopup(
      ctx,
      winner?.name ?? "Победитель",
      winnerRow?.participant.seatNumber ? `Место ${winnerRow.participant.seatNumber}` : "Победившая дорожка",
      smoothstep(0.94, 1, progress)
    );
  }
}

function buildRow(participant: Participant, index: number, count: number, progress: number, time: number, winnerId?: string) {
  const travel = raceTravel(progress, participant, index, count, winnerId);
  const point = pointOnPolyline(trackGuide, travel);
  const tangent = trackTangent(travel);
  const normal = trackNormal(tangent);
  const density = count >= 8 ? 0.78 : count >= 6 ? 0.88 : 1;
  const laneSpread = lerp(20, 30, density);
  const laneOffset = count <= 1 ? 0 : lerp(-laneSpread, laneSpread, index / (count - 1));
  const speed = raceSpeed(progress, participant, index, winnerId);
  const bob = Math.sin(time * (5.6 + speed * 3.2) + index * 0.72 + travel * 5) * (0.8 + speed * 0.7);
  const travelDrift = Math.sin(progress * Math.PI * 2 + index) * (0.8 + speed * 1.4);

  return {
    participant,
    index,
    travel,
    x: point.x + normal.x * laneOffset + tangent.x * travelDrift * 0.02,
    y: point.y + normal.y * laneOffset + tangent.y * travelDrift * 0.02 + bob,
    normal,
    tangent,
    color: lanePalette[index % lanePalette.length],
    scale: density,
    speed,
    isWinner: participant.id === winnerId || participant.winner
  };
}

function drawBackdropScene(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#04050a");
  bg.addColorStop(0.48, "#0b0d15");
  bg.addColorStop(1, "#050608");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.45;
  const sky = ctx.createRadialGradient(450, 58, 30, 450, 58, 500);
  sky.addColorStop(0, "rgba(255,205,24,.16)");
  sky.addColorStop(0.25, "rgba(123,60,255,.12)");
  sky.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 64; i += 1) {
    const x = (i * 137 + time * 16) % width;
    const y = 20 + ((i * 31 + time * 9) % 120);
    ctx.fillStyle = i % 3 === 0 ? "#ffcd18" : i % 3 === 1 ? "#8be1ec" : "#b98cff";
    ctx.beginPath();
    ctx.arc(x, y, i % 5 ? 1.4 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSilhouette(ctx);
  ctx.restore();
}

function drawSilhouette(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(4,5,8,.72)";
  const shapes = [
    [0, 238, 86, 206],
    [78, 248, 116, 186],
    [214, 232, 108, 196],
    [636, 244, 136, 184],
    [740, 252, 132, 170]
  ] as const;
  shapes.forEach(([x, y, w, h]) => {
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
  });
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(255,205,24,.12)";
  roundRect(ctx, 0, 290, width, 140, 0);
  ctx.fill();
  ctx.restore();
}

function drawTrackScene(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.92 + progress * 0.08;

  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 24;
  ctx.strokeStyle = "#211d1c";
  ctx.lineWidth = 112;
  strokeTrack(ctx, trackGuide);

  ctx.shadowColor = "rgba(255,205,24,.10)";
  ctx.shadowBlur = 16;
  const asphalt = ctx.createLinearGradient(0, 92, width, 352);
  asphalt.addColorStop(0, "#312824");
  asphalt.addColorStop(0.45, "#1b181d");
  asphalt.addColorStop(1, "#2b2220");
  ctx.strokeStyle = asphalt;
  ctx.lineWidth = 84;
  strokeTrack(ctx, trackGuide);

  ctx.shadowBlur = 0;
  const sheen = ctx.createLinearGradient(100, 70, 780, 290);
  sheen.addColorStop(0, "rgba(255,255,255,.08)");
  sheen.addColorStop(0.25, "rgba(255,255,255,.02)");
  sheen.addColorStop(0.5, "rgba(255,205,24,.08)");
  sheen.addColorStop(1, "rgba(255,255,255,.035)");
  ctx.strokeStyle = sheen;
  ctx.lineWidth = 64;
  strokeTrack(ctx, trackGuide);

  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = "#ffcd18";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([10, 18]);
  ctx.lineDashOffset = -time * 26;
  strokeTrack(ctx, trackGuide);
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 8; i += 1) {
    const t = i / 7;
    const point = pointOnPolyline(trackGuide, t);
    const tangent = trackTangent(t);
    const normal = trackNormal(tangent);
    const x = point.x + normal.x * 46;
    const y = point.y + normal.y * 46;
    drawLamp(ctx, x, y, i % 2 ? "#8be1ec" : "#ffd24b", 0.7 + Math.sin(time + i) * 0.12);
  }

  ctx.restore();
}

function drawStartFinish(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  ctx.save();
  drawLineGate(ctx, 0.03, "СТАРТ", "#39d98a");
  drawLineGate(ctx, 0.95, "ФИНИШ", "#ffcd18");
  if (progress > 0.75) {
    const shimmer = 0.35 + Math.sin(time * 10) * 0.18;
    ctx.globalAlpha = shimmer;
    ctx.fillStyle = "rgba(255,205,24,.12)";
    ctx.beginPath();
    ctx.moveTo(650, 70);
    ctx.lineTo(782, 82);
    ctx.lineTo(782, 262);
    ctx.lineTo(632, 240);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPerimeterLights(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  const lights = [
    { x: 76, y: 84, color: "#ffd24b" },
    { x: 134, y: 66, color: "#8be1ec" },
    { x: 402, y: 48, color: "#b98cff" },
    { x: 676, y: 68, color: "#ffd24b" },
    { x: 792, y: 134, color: "#8be1ec" },
    { x: 782, y: 306, color: "#ffcd18" },
    { x: 452, y: 348, color: "#39d98a" },
    { x: 126, y: 320, color: "#b98cff" }
  ];
  lights.forEach((light, index) => {
    const pulse = 0.64 + Math.sin(time * 4 + index) * 0.18;
    drawLamp(ctx, light.x, light.y, light.color, pulse);
  });
  ctx.restore();
}

function drawTitleBlock(ctx: CanvasRenderingContext2D, progress: number, leaderName: string) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.38)";
  roundRect(ctx, 18, 14, 228, 80, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,205,24,.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffcd18";
  ctx.font = "900 27px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ГОНКИ", 34, 38);
  ctx.fillStyle = "#f7f2e7";
  ctx.font = "900 21px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("ШИНШИЛЛ", 34, 60);
  ctx.fillStyle = "#9b978d";
  ctx.font = "800 11px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(progress > 0.9 ? "ФИНАЛЬНЫЙ СПРИНТ" : `ЛИДЕР: ${leaderName}`, 34, 76);
  ctx.restore();
}

function drawPositionsPanel(ctx: CanvasRenderingContext2D, participants: Participant[], rows: ReturnType<typeof buildRow>[], time: number) {
  const compact = participants.length > 5;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.42)";
  roundRect(ctx, 16, 124, 176, compact ? 236 : 198, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.stroke();

  ctx.fillStyle = "#9b978d";
  ctx.font = "800 12px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("ПОЗИЦИИ", 28, 144);
  ctx.fillStyle = "#f7f2e7";
  ctx.font = "900 11px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${participants.length} участн.`, 116, 144);

  const order = [...rows].sort((a, b) => b.travel - a.travel);
  const visible = compact ? order.slice(0, 10) : order.slice(0, 5);
  visible.forEach((row, index) => {
    const column = compact ? index % 2 : 0;
    const rowIndex = compact ? Math.floor(index / 2) : index;
    const x = compact ? 24 + column * 82 : 24;
    const y = 168 + rowIndex * (compact ? 27 : 28);
    const participant = row.participant;
    const isWinner = participant.winner || participant.id === order[0]?.participant.id;
    ctx.fillStyle = isWinner ? "rgba(255,205,24,.14)" : "rgba(255,255,255,.045)";
    roundRect(ctx, x, y - 12, compact ? 74 : 146, compact ? 22 : 22, 10);
    ctx.fill();
    ctx.strokeStyle = row.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    drawMiniAsset(ctx, participant, x + 12, y - 1, compact ? 10 : 18, row.color, participant.hasBoost, time);
    ctx.fillStyle = isWinner ? "#ffcd18" : "#f7f2e7";
    ctx.font = compact ? "900 10px Inter, ui-sans-serif, system-ui, sans-serif" : "900 13px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(String(index + 1), x + (compact ? 24 : 30), y);
    ctx.fillStyle = "#f7f2e7";
    ctx.font = compact ? "800 9px Inter, ui-sans-serif, system-ui, sans-serif" : "800 12px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(participant.name.slice(0, compact ? 6 : 10), x + (compact ? 36 : 50), y);
  });

  ctx.restore();
}

function drawBoostPanel(ctx: CanvasRenderingContext2D, participants: Participant[], rows: ReturnType<typeof buildRow>[], progress: number, time: number, winner?: Participant) {
  const boosted = participants.filter((participant) => participant.hasBoost);
  const leader = rows.reduce((best, row) => (row.travel > best.travel ? row : best), rows[0]);
  const boostCount = boosted.length;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.44)";
  roundRect(ctx, 726, 34, 138, 116, 18);
  ctx.fill();
  ctx.strokeStyle = boostCount ? "rgba(185,140,255,.58)" : "rgba(255,255,255,.08)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const glow = ctx.createRadialGradient(846, 48, 8, 846, 48, 100);
  glow.addColorStop(0, "rgba(185,140,255,.22)");
  glow.addColorStop(0.4, "rgba(255,205,24,.1)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(726, 34, 138, 116);

  ctx.fillStyle = "#b98cff";
  ctx.font = "900 11px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("АКТИВНЫЙ БУСТ", 742, 53);
  ctx.fillStyle = "#f7f2e7";
  ctx.font = "900 18px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(boostCount ? `x${boostCount}` : "0", 742, 77);
  ctx.fillStyle = "#9b978d";
  ctx.font = "800 10px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(boostCount ? "Ускоряет участок трассы" : "Сейчас бустов нет", 742, 95);
  ctx.fillStyle = "#f7f2e7";
  ctx.font = "800 10px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`Лидер: ${leader?.participant.name ?? winner?.name ?? "Старт"}`, 742, 111);
  if (boostCount) {
    drawBoostMark(ctx, 840, 48, time);
  }
  ctx.restore();
}

function drawStandingsFeed(ctx: CanvasRenderingContext2D, feed: RaceFeed, time: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.48)";
  roundRect(ctx, 20, 344, 860, 70, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.stroke();

  ctx.fillStyle = "#9b978d";
  ctx.font = "800 11px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("LIVE ПОЗИЦИИ", 38, 370);
  ctx.fillStyle = "#f7f2e7";
  ctx.font = "900 14px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(feed.headline, 38, 390);

  const chips = feed.entries.slice(0, 10);
  chips.forEach((entry, index) => {
    const row = index >= 5 ? 1 : 0;
    const col = index % 5;
    const x = 230 + col * 132;
    const y = row ? 377 : 354;
    ctx.fillStyle = entry.highlight ? `${entry.color}26` : "rgba(255,255,255,.05)";
    roundRect(ctx, x, y, 122, 18, 8);
    ctx.fill();
    ctx.strokeStyle = entry.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    drawMiniAsset(ctx, entry.participant, x + 11, y + 9, 7, entry.color, entry.participant.hasBoost, time);
    ctx.fillStyle = "#f7f2e7";
    ctx.font = "900 9px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(String(index + 1), x + 22, y + 9);
    ctx.font = "800 8px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(entry.participant.name.slice(0, 8), x + 34, y + 9);
    const deltaLabel = entry.delta > 0 ? `▲${entry.delta}` : entry.delta < 0 ? `▼${Math.abs(entry.delta)}` : "—";
    ctx.fillStyle = entry.delta > 0 ? "#7ee7a7" : entry.delta < 0 ? "#ff7a68" : "#9b978d";
    ctx.font = "900 8px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(deltaLabel, x + 86, y + 9);
    if (entry.participant.kind === "bot") {
      ctx.fillStyle = "rgba(216,181,95,.9)";
      ctx.font = "800 7px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("BOT", x + 86, y + 16);
    }
  });
  ctx.restore();
}

function drawRaceTicker(ctx: CanvasRenderingContext2D, leader: ReturnType<typeof buildRow> | undefined, progress: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.42)";
  roundRect(ctx, 330, 16, 240, 42, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,205,24,.18)";
  ctx.stroke();
  ctx.fillStyle = "#9b978d";
  ctx.font = "800 11px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(progress > 0.85 ? "ДО ФИНИША" : "ДИНАМИКА", 348, 31);
  ctx.fillStyle = "#8be1ec";
  ctx.font = "900 24px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${Math.max(0, Math.ceil((1 - progress) * 18))}s`, 446, 33);
  if (leader) {
    ctx.fillStyle = "#f7f2e7";
    ctx.font = "800 11px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`лидер: ${leader.participant.name}`, 490, 31);
  }
  ctx.restore();
}

function drawLaneTrails(ctx: CanvasRenderingContext2D, rows: ReturnType<typeof buildRow>[], progress: number, time: number) {
  rows.forEach((row) => {
    const tail = sampleTrail(row.travel, row.index, progress);
    ctx.save();
    ctx.shadowColor = row.participant.hasBoost ? row.color : "rgba(255,255,255,.1)";
    ctx.shadowBlur = row.participant.hasBoost || row.isWinner ? 24 + row.speed * 20 : 8 + row.speed * 8;
    const trail = ctx.createLinearGradient(tail.start.x, tail.start.y, row.x, row.y);
    trail.addColorStop(0, "rgba(0,0,0,0)");
    trail.addColorStop(0.55, row.speed > 0.55 ? `${row.color}88` : "rgba(255,255,255,.05)");
    trail.addColorStop(1, row.participant.hasBoost || row.isWinner ? `${row.color}DD` : `${row.color}88`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = row.participant.hasBoost || row.isWinner ? 9 + row.speed * 3 : 5 + row.speed * 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tail.start.x, tail.start.y);
    ctx.lineTo(tail.mid.x, tail.mid.y);
    ctx.lineTo(row.x, row.y);
    ctx.stroke();
    if (row.participant.hasBoost || row.isWinner || row.speed > 0.6) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 14]);
      ctx.lineDashOffset = -time * (70 + row.speed * 70);
      ctx.beginPath();
      ctx.moveTo(tail.start.x, tail.start.y);
      ctx.lineTo(row.x, row.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  });
}

function drawChinchilla(ctx: CanvasRenderingContext2D, row: ReturnType<typeof buildRow>, progress: number, time: number) {
  const participant = row.participant;
  const highlighted = progress > 0.82 && row.isWinner;
  const size = (participant.hasBoost ? 92 : highlighted ? 90 : 78) * row.scale * (1 + row.speed * 0.035);
  const angle = Math.atan2(row.tangent.y, row.tangent.x);
  const facing = row.tangent.x >= 0 ? 1 : -1;
  const bob = Math.sin(time * (7 + row.speed * 4) + row.index * 0.8) * (0.9 + row.speed * 0.8);
  const image = getChinchillaImage(row.index);

  ctx.save();
  ctx.translate(row.x, row.y + bob);
  ctx.rotate(angle * 0.08);
  ctx.scale(facing, 1);

  if (participant.hasBoost || highlighted || row.speed > 0.72) {
    const trail = ctx.createRadialGradient(0, 0, 8, 0, 0, 58);
    trail.addColorStop(0, "rgba(255,255,255,.86)");
    trail.addColorStop(0.3, `${row.color}CC`);
    trail.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.arc(-6, 0, 56, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = participant.hasBoost || highlighted ? row.color : "rgba(255,255,255,.12)";
  ctx.shadowBlur = participant.hasBoost || highlighted ? 26 + row.speed * 18 : 12 + row.speed * 8;

  if (image) {
    const glow = participant.hasBoost ? 1.18 : 1;
    ctx.drawImage(image, -size * 0.5 * glow, -size * 0.5 * glow, size * glow, size * glow);
  } else {
    drawFallbackChinchilla(ctx, row.color, participant, size);
  }

  if (participant.hasBoost) {
    ctx.strokeStyle = row.color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5 + 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (highlighted) {
    ctx.strokeStyle = "#ffcd18";
    ctx.lineWidth = 3 + Math.sin(time * 12) * 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5 + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#fff6c7";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5 + 19 + Math.sin(time * 10) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOvertakeBursts(ctx: CanvasRenderingContext2D, rows: ReturnType<typeof buildRow>[], progress: number, time: number, winnerId?: string) {
  ctx.save();
  rows.forEach((row) => {
    const burst = row.isWinner
      ? bell(progress, 0.79, 0.985)
      : bell(progress, 0.34 + row.index * 0.018, 0.72 + row.index * 0.012) * 0.65;
    if (burst <= 0.015) return;
    ctx.globalAlpha = burst;
    ctx.strokeStyle = row.isWinner ? "#ffcd18" : row.color;
    ctx.lineWidth = row.isWinner ? 3.2 : 2;
    ctx.shadowColor = row.isWinner ? "rgba(255,205,24,.55)" : row.color;
    ctx.shadowBlur = row.isWinner ? 20 : 10;
    for (let i = 0; i < 5; i += 1) {
      const back = pointOnPolyline(trackGuide, clamp(row.travel - 0.025 - i * 0.015, 0, 1));
      const tangent = trackTangent(row.travel);
      ctx.beginPath();
      ctx.moveTo(back.x - tangent.x * 0.03, back.y - tangent.y * 0.03);
      ctx.lineTo(back.x - tangent.x * (0.15 + row.speed * 0.06), back.y - tangent.y * (0.15 + row.speed * 0.06));
      ctx.stroke();
    }
  });

  const winner = rows.find((row) => row.participant.id === winnerId);
  if (winner && progress > 0.82) {
    const alpha = smoothstep(0.82, 0.96, progress) * (1 - smoothstep(0.985, 1, progress) * 0.4);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,205,24,.14)";
    ctx.shadowColor = "rgba(255,205,24,.45)";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.ellipse(winner.x - winner.tangent.x * 35, winner.y - winner.tangent.y * 35, 74, 22, Math.atan2(winner.tangent.y, winner.tangent.x), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFinishRush(ctx: CanvasRenderingContext2D, rows: ReturnType<typeof buildRow>[], progress: number, time: number, winnerId?: string) {
  if (progress < 0.78) return;
  const winner = rows.find((row) => row.participant.id === winnerId);
  if (!winner) return;
  const alpha = smoothstep(0.78, 0.94, progress);
  const gate = pointOnPolyline(trackGuide, 0.95);
  const tangent = trackTangent(0.95);
  const normal = trackNormal(tangent);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255,205,24,.42)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 12]);
  ctx.lineDashOffset = -time * 120;
  ctx.beginPath();
  ctx.moveTo(gate.x - normal.x * 84, gate.y - normal.y * 84);
  ctx.lineTo(gate.x + normal.x * 84, gate.y + normal.y * 84);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,205,24,.92)";
  ctx.font = "900 13px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("РЫВОК!", winner.x + normal.x * 34, winner.y + normal.y * 34 - 20 + Math.sin(time * 8) * 4);
  ctx.restore();
}

function drawFallbackChinchilla(ctx: CanvasRenderingContext2D, color: string, participant: Participant, size: number) {
  const body = ctx.createRadialGradient(-size * 0.18, -size * 0.18, 4, 0, 0, size * 0.5);
  body.addColorStop(0, "#fff7df");
  body.addColorStop(0.35, color);
  body.addColorStop(1, shade(color, -58));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.42, size * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, -20);
  ctx.beginPath();
  ctx.arc(-size * 0.18, -size * 0.16, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f2e7";
  ctx.beginPath();
  ctx.arc(size * 0.18, -size * 0.06, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.arc(size * 0.23, -size * 0.07, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (participant.hasBoost) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMiniAsset(ctx: CanvasRenderingContext2D, participant: Participant, x: number, y: number, size: number, color: string, boosted: boolean, time: number) {
  const image = getChinchillaImage((participant.seatNumber ?? 1) - 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(boosted ? 1.03 : 1, 1);
  if (boosted) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + Math.sin(time * 8) * 2;
  }
  if (image) {
    ctx.drawImage(image, -size, -size, size * 2, size * 2);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLineGate(ctx: CanvasRenderingContext2D, t: number, text: string, color: string) {
  const point = pointOnPolyline(trackGuide, t);
  const tangent = trackTangent(t);
  ctx.save();
  ctx.translate(point.x, point.y);
  const angle = Math.atan2(tangent.y, tangent.x);
  ctx.rotate(angle);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(0,0,0,.68)";
  roundRect(ctx, -44, -40, 88, 24, 10);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "900 12px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, -28);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-24, -12);
  ctx.lineTo(-24, 28);
  ctx.moveTo(24, -12);
  ctx.lineTo(24, 28);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(-18, 18, 36, 6);
  ctx.restore();
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, pulse: number) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16 + pulse * 8;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 18);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, `${color}88`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoostMark(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 1.8) * 0.1);
  ctx.fillStyle = "#b98cff";
  ctx.font = "900 34px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡", 0, 0);
  ctx.restore();
}

function strokeTrack(ctx: CanvasRenderingContext2D, path: { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i += 1) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function sampleTrail(travel: number, index: number, progress: number) {
  const startT = clamp(travel - 0.14, 0.02, travel);
  const midT = clamp(travel - 0.07 + Math.sin(progress * 5 + index) * 0.01, startT, travel);
  return {
    start: pointOnPolyline(trackGuide, startT),
    mid: pointOnPolyline(trackGuide, midT)
  };
}

function trackTangent(t: number) {
  const delta = 0.0025;
  const a = pointOnPolyline(trackGuide, clamp(t - delta, 0, 1));
  const b = pointOnPolyline(trackGuide, clamp(t + delta, 0, 1));
  return { x: b.x - a.x, y: b.y - a.y };
}

function trackNormal(tangent: { x: number; y: number }) {
  const length = Math.hypot(tangent.x, tangent.y) || 1;
  return { x: -tangent.y / length, y: tangent.x / length };
}

function raceTravel(progress: number, participant: Participant, index: number, count: number, winnerId?: string) {
  const seed = stableSeed(participant.id, index);
  const isWinner = participant.id === winnerId || participant.winner;
  const t = clamp(progress, 0, 1);
  const start = 0.018;

  if (isWinner) {
    const steadyRun = 0.55 * t;
    const delayedPower = 0.31 * Math.pow(t, 2.35);
    const finalSprint = 0.14 * Math.pow(t, 7.2);
    return start + (1 - start) * (steadyRun + delayedPower + finalSprint);
  }

  const slotBias = ((count - index - 1) / Math.max(count - 1, 1)) * 0.014;
  const finishTarget = 0.895 + seed * 0.045 + (participant.hasBoost ? 0.014 : 0);
  const earlyPower = 1.15 + seed * 0.55 + (participant.hasBoost ? 0.18 : 0);
  const frontLoaded = 1 - Math.pow(1 - t, earlyPower);
  const steady = t;
  const curve = 0.68 * frontLoaded + 0.32 * steady;
  const safeCurve = Math.min(curve + slotBias * t * (1 - t), 1);
  return start + (finishTarget - start) * safeCurve;
}

function raceSpeed(progress: number, participant: Participant, index: number, winnerId?: string) {
  const before = raceTravel(clamp(progress - 0.016, 0, 1), participant, index, 10, winnerId);
  const after = raceTravel(clamp(progress + 0.016, 0, 1), participant, index, 10, winnerId);
  return clamp((after - before) * 8.5, 0, 1);
}

type RaceFeedEntry = {
  participant: Participant;
  color: string;
  delta: number;
  highlight: boolean;
};

type RaceFeed = {
  headline: string;
  entries: RaceFeedEntry[];
};

function updateRaceMemory(roundId: string, rows: ReturnType<typeof buildRow>[], progress: number, time: number): RaceFeed {
  const sorted = [...rows].sort((a, b) => b.travel - a.travel);
  const memory = raceMemory.get(roundId) ?? { order: [], headline: "Стартовый разгон", lastSeenAt: 0 };
  const previousOrder = memory.order;
  const previousIndex = new Map(previousOrder.map((id, index) => [id, index]));
  const currentOrder = sorted.map((row) => row.participant.id);
  const leaderChanged = previousOrder[0] && previousOrder[0] !== currentOrder[0];
  const leaderName = sorted[0]?.participant.name ?? "Старт";
  const entryMoves = sorted.map((row, index) => {
    const prior = previousIndex.get(row.participant.id);
    const delta = prior == null ? 0 : prior - index;
    return {
      participant: row.participant,
      color: row.color,
      delta,
      highlight: Boolean(index < 3 && (delta > 0 || row.participant.winner))
    };
  });

  let headline = "Плотная борьба";
  const biggestUp = [...entryMoves]
    .filter((entry) => entry.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
  if (progress < 0.15) headline = "Стартовый разгон";
  else if (progress > 0.86) headline = `Финишный рывок · ${leaderName}`;
  else if (leaderChanged) headline = `${leaderName} выходит вперёд`;
  else if (biggestUp && biggestUp.delta >= 2) headline = `${biggestUp.participant.name} красиво обгоняет`;
  else if (entryMoves.some((entry) => entry.delta !== 0)) headline = "Борьба за позиции продолжается";

  raceMemory.set(roundId, {
    order: currentOrder,
    headline,
    lastSeenAt: time
  });

  for (const [key, value] of raceMemory.entries()) {
    if (time - value.lastSeenAt > 90) {
      raceMemory.delete(key);
    }
  }

  return { headline, entries: entryMoves };
}

function stableSeed(id: string, index: number) {
  let hash = index * 17 + 11;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return hash / 997;
}

function getChinchillaImage(index: number) {
  if (typeof window === "undefined") return null;
  const source = chinchillaSources[index % chinchillaSources.length];
  let entry = assetCache.get(source);
  if (!entry) {
    const image = new window.Image();
    entry = { image, ready: false, error: false };
    image.onload = () => {
      const current = assetCache.get(source);
      if (current) current.ready = true;
    };
    image.onerror = () => {
      const current = assetCache.get(source);
      if (current) current.error = true;
    };
    image.src = source;
    assetCache.set(source, entry);
  }
  return entry.ready && !entry.error ? entry.image : null;
}
