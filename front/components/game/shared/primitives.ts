import { GameMode, Participant } from "@/lib/domain/types";
import { Point } from "@/components/game/shared/types";

export const width = 900;
export const height = 430;
export const colors = ["#e86aa8", "#8be1ec", "#8d95ff", "#eadf8c", "#7ee7a7", "#f27b68", "#bfa2ff", "#7cd2ff", "#e3eef8", "#d8b55f"];

export function drawBackdrop(ctx: CanvasRenderingContext2D, mode: GameMode) {
  const accent = mode === "claw-machine" ? "#4dd7c8" : mode === "duel-clash" ? "#e4503d" : mode === "slot-reveal" ? "#d8b55f" : "#39d98a";
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#050508");
  bg.addColorStop(0.52, "#10101a");
  bg.addColorStop(1, "#060607");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.17;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let x = -80; x < width + 80; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 42);
    ctx.lineTo(x + 118, height - 36);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(237,232,220,.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, 34, 38, width - 68, height - 76, 18);
  ctx.stroke();
}

export function drawCaption(ctx: CanvasRenderingContext2D, mode: GameMode, phase: string) {
  const modeLabel = {
    "arena-sprint": "ГОНКА ШАРОВ",
    "duel-clash": "ДУЭЛЬ АРЕНЫ",
    "claw-machine": "АВТОМАТ С ШАРАМИ",
    "slot-reveal": "РАСКРЫТИЕ СИМВОЛОВ"
  }[mode];
  ctx.save();
  ctx.fillStyle = "rgba(7,7,7,.78)";
  roundRect(ctx, 246, 10, 408, 30, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(237,232,220,.12)";
  ctx.stroke();
  label(ctx, `${modeLabel} · ${phase}`, width / 2, 26, "#9b978d", 12, "700", "center");
  ctx.restore();
}

export function scenePhase(progress: number) {
  if (progress < 0.18) return "ПОДГОТОВКА К СТАРТУ";
  if (progress < 0.58) return "ИДЕТ РОЗЫГРЫШ";
  if (progress < 0.82) return "ФИНАЛЬНЫЙ МОМЕНТ";
  if (progress < 0.94) return "КТО ЖЕ ПОБЕДИТ";
  return "ПОБЕДИТЕЛЬ ОПРЕДЕЛЕН";
}

export function drawMarble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  participant: Participant,
  highlighted: boolean,
  roll: number
) {
  ctx.save();
  ctx.shadowColor = highlighted ? "rgba(216,181,95,.65)" : "rgba(77,215,200,.2)";
  ctx.shadowBlur = highlighted ? 24 : 10;
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.38, radius * 0.1, x, y, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(0.78, shade(color, -38));
  gradient.addColorStop(1, "#101018");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = highlighted ? "#d8b55f" : "rgba(237,232,220,.38)";
  ctx.lineWidth = highlighted ? 3 : 1.5;
  ctx.stroke();
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.58, roll, roll + Math.PI * 1.2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  label(ctx, participant.name.slice(0, 9), x, y - radius - 13, "#ede8dc", 11, "800", "center");
  if (participant.hasBoost) {
    ctx.strokeStyle = "#39d98a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWinnerPopup(ctx: CanvasRenderingContext2D, winnerName: string, combination: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(7,7,7,.78)";
  roundRect(ctx, 244, 126, 412, 150, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(216,181,95,.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  label(ctx, "ПОБЕДИТЕЛЬ", 450, 154, "#d8b55f", 18, "900", "center");
  label(ctx, winnerName, 450, 203, "#ede8dc", 34, "900", "center");
  label(ctx, combination, 450, 240, "#9b978d", 14, "800", "center");
  ctx.restore();
}

export function drawConfetti(ctx: CanvasRenderingContext2D, time: number, progress: number) {
  ctx.save();
  ctx.globalAlpha = smoothstep(0.9, 1, progress);
  for (let i = 0; i < 54; i += 1) {
    const x = (i * 67 + time * 90) % width;
    const y = 52 + ((i * 41 + time * 120) % 286);
    ctx.fillStyle = colors[i % colors.length];
    ctx.translate(x, y);
    ctx.rotate(time * 2 + i);
    roundRect(ctx, -3, -5, 6, 11, 2);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.restore();
}

export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  weight: string,
  align: CanvasTextAlign = "left"
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function bell(value: number, start: number, end: number) {
  return smoothstep(start, (start + end) / 2, value) * (1 - smoothstep((start + end) / 2, end, value));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function shade(hex: string, amount: number) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = clamp((value >> 16) + amount, 0, 255);
  const g = clamp(((value >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((value & 0xff) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function pointOnPolyline(points: Point[], t: number) {
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return { point, next, length: Math.hypot(next.x - point.x, next.y - point.y) };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let distance = t * total;
  for (const segment of segments) {
    if (distance <= segment.length) {
      const local = distance / segment.length;
      return { x: lerp(segment.point.x, segment.next.x, local), y: lerp(segment.point.y, segment.next.y, local) };
    }
    distance -= segment.length;
  }
  return points[points.length - 1];
}

export function sampleSpline(points: Point[], detail = 12) {
  if (points.length < 3) return points;
  const output: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let step = 0; step < detail; step += 1) {
      const t = step / detail;
      const t2 = t * t;
      const t3 = t2 * t;
      output.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      });
    }
  }
  output.push(points[points.length - 1]);
  return output;
}
