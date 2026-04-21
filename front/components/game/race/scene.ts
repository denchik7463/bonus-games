import { Payload, Point } from "@/components/game/shared/types";
import { clamp, colors, drawConfetti, drawMarble, drawWinnerPopup, label, lerp, pointOnPolyline, roundRect, sampleSpline, smoothstep } from "@/components/game/shared/primitives";

export function drawRaceScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const track = raceTrack();
  drawRaceFrame(ctx);
  drawTrack(ctx, track, time);

  const positions = payload.participants.map((participant, index) => {
    const t = raceProgress(progress, index, participant.id === payload.winnerId, participant.hasBoost, payload.participants.length);
    const point = pointOnPolyline(track, t);
    return { participant, index, t, point };
  });
  const leader = positions.reduce((best, item) => item.t > best.t ? item : best, positions[0]);

  positions
    .slice()
    .sort((a, b) => a.point.y - b.point.y)
    .forEach(({ participant, index, point, t }) => {
      const roll = time * 5 + t * 18 + index;
      drawMarble(ctx, point.x, point.y + Math.sin(roll) * 1.8, 15 + (participant.hasBoost ? 2 : 0), colors[index % colors.length], participant, participant.id === payload.winnerId && progress > 0.88, roll);
    });

  drawRaceHud(ctx, leader?.participant.name ?? "", progress);
  if (progress > 0.9) {
    drawConfetti(ctx, time, progress);
    const winner = payload.participants.find((participant) => participant.id === payload.winnerId) ?? payload.participants[0];
    drawWinnerPopup(ctx, winner.name, payload.combination.label, smoothstep(0.9, 1, progress));
  }
}

function drawRaceFrame(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(125,117,184,.18)";
  ctx.fillRect(48, 45, 10, 338);
  ctx.fillRect(840, 45, 10, 338);
  ctx.fillStyle = "rgba(188,196,214,.45)";
  ctx.fillRect(48, 384, 802, 8);
  ctx.restore();
}

function drawTrack(ctx: CanvasRenderingContext2D, points: Point[], time: number) {
  const path = new Path2D();
  points.forEach((point, index) => index === 0 ? path.moveTo(point.x, point.y) : path.lineTo(point.x, point.y));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(126,88,255,.55)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(43,18,100,.92)";
  ctx.lineWidth = 42;
  ctx.stroke(path);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(188,196,214,.38)";
  ctx.lineWidth = 2.5;
  ctx.stroke(path);

  ctx.setLineDash([12, 14]);
  ctx.lineDashOffset = -time * 36;
  ctx.strokeStyle = "rgba(216,181,95,.38)";
  ctx.lineWidth = 3;
  ctx.stroke(path);
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(237,232,220,.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < points.length - 1; i += 2) {
    const a = points[i];
    const b = points[i + 1];
    for (let step = 0; step < 13; step += 1) {
      const t = step / 12;
      const x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t);
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 23);
      ctx.lineTo(x + 10, y + 23);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#68e985";
  roundRect(ctx, 48, 47, 72, 12, 4);
  ctx.fill();
  ctx.fillStyle = "#f1da72";
  roundRect(ctx, 812, 391, 62, 14, 4);
  ctx.fill();
  label(ctx, "СТАРТ", 53, 30, "#68e985", 15, "900");
  label(ctx, "ФИНИШ", 799, 374, "#f1da72", 15, "900");
  ctx.restore();
}

function raceTrack() {
  return sampleSpline([
    { x: 96, y: 78 },
    { x: 778, y: 110 },
    { x: 794, y: 146 },
    { x: 166, y: 176 },
    { x: 126, y: 214 },
    { x: 760, y: 250 },
    { x: 800, y: 286 },
    { x: 240, y: 318 },
    { x: 320, y: 346 },
    { x: 642, y: 356 },
    { x: 724, y: 370 },
    { x: 792, y: 390 },
    { x: 844, y: 392 }
  ], 18);
}

function raceProgress(progress: number, index: number, isWinner: boolean, boosted: boolean, count: number) {
  const lane = index % 4;
  const baseTravel = progress * 0.6;
  const launchBurst = smoothstep(0.02, 0.18, progress) * (lane === 0 ? 0.16 : lane === 1 ? 0.1 : lane === 2 ? 0.06 : 0.03);
  const spiralGain = smoothstep(0.2, 0.42, progress) * (lane === 2 ? 0.15 : lane === 3 ? 0.11 : lane === 1 ? 0.08 : 0.05);
  const lowerSlopeGain = smoothstep(0.46, 0.72, progress) * (lane === 1 ? 0.17 : lane === 3 ? 0.13 : lane === 0 ? 0.1 : 0.07);
  const finishPressure = smoothstep(0.74, 0.9, progress) * (lane === 3 ? 0.08 : lane === 0 ? 0.05 : 0.03);
  const boostGain = boosted ? smoothstep(0.18, 0.88, progress) * 0.025 : 0;
  const winnerSurge = isWinner ? smoothstep(0.82, 1, progress) * 0.19 : 0;
  const laneOffset = ((count - index) / Math.max(count, 1)) * 0.012;
  const travel = baseTravel + launchBurst + spiralGain + lowerSlopeGain + finishPressure + boostGain + winnerSurge + laneOffset;
  return clamp(travel, 0.018, isWinner ? 1 : 0.972);
}

function drawRaceHud(ctx: CanvasRenderingContext2D, leader: string, progress: number) {
  ctx.save();
  ctx.fillStyle = "rgba(7,7,7,.58)";
  roundRect(ctx, 604, 55, 238, 54, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(216,181,95,.34)";
  ctx.stroke();
  label(ctx, progress > 0.88 ? "ФИНАЛЬНЫЙ РЫВОК" : "ЛИДЕР СЕЙЧАС", 622, 74, "#d8b55f", 11, "900");
  label(ctx, leader, 622, 96, "#ede8dc", 18, "900");
  ctx.restore();
}
