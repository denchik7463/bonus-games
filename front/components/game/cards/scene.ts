import { Payload } from "@/components/game/shared/types";
import { colors, drawWinnerPopup, label, lerp, roundRect, smoothstep } from "@/components/game/shared/primitives";

export function drawCardsScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const winner = payload.participants.find((participant) => participant.id === payload.winnerId) ?? payload.participants[0];
  const decoy = payload.participants.find((participant) => participant.id !== payload.winnerId) ?? winner;
  const swarm = Array.from({ length: 18 }, (_, index) => buildCardOrbit(index, time, progress));
  const falseName = decoy.name.toUpperCase().replace(/\s+/g, "").slice(0, 7);
  const trueName = winner.name.toUpperCase().replace(/\s+/g, "").slice(0, 7);

  ctx.save();
  const glow = ctx.createRadialGradient(450, 215, 40, 450, 215, 320);
  glow.addColorStop(0, "rgba(216,181,95,.18)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 900, 430);

  swarm.forEach((card, index) => {
    drawFlyingCard(ctx, card.x, card.y, card.rotation, card.scale, card.color, index, false);
  });

  drawNameFormation(ctx, falseName, progress, 0.34, 0.6, "#8be1ec");
  drawNameFormation(ctx, trueName, progress, 0.68, 0.95, "#d8b55f");

  if (progress > 0.93) {
    drawWinnerPopup(ctx, winner.name, payload.combination.label, smoothstep(0.93, 1, progress));
  }
  ctx.restore();
}

function buildCardOrbit(index: number, time: number, progress: number) {
  const orbit = 110 + index * 16;
  const angle = time * (0.7 + index * 0.04) + index * 0.8;
  const settle = 1 - smoothstep(0.3, 0.92, progress);
  const x = 450 + Math.cos(angle) * orbit * settle + Math.sin(time * 3 + index) * 26;
  const y = 215 + Math.sin(angle * 1.2) * 100 * settle + Math.cos(time * 4 + index) * 18 + 12;
  const scale = 0.72 + ((index % 5) * 0.08) + Math.sin(time * 2 + index) * 0.03;
  const rotation = angle + Math.sin(time * 5 + index) * 0.45;
  return { x, y, scale, rotation, color: colors[index % colors.length] };
}

function drawFlyingCard(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, scale: number, color: string, index: number, highlighted: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.shadowColor = highlighted ? "rgba(216,181,95,.45)" : "rgba(0,0,0,.35)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(14,14,18,.92)";
  roundRect(ctx, -28, -40, 56, 80, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = highlighted ? "#d8b55f" : "rgba(237,232,220,.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = `${color}66`;
  ctx.fillRect(-18, -28, 36, 16);
  ctx.fillStyle = "#ede8dc";
  ctx.fillRect(-16, 8, 32, 2);
  ctx.fillRect(-16, 14, 22, 2);
  label(ctx, `${(index % 9) + 1}`, 0, -18, "#ede8dc", 16, "900", "center");
  ctx.restore();
}

function drawNameFormation(ctx: CanvasRenderingContext2D, name: string, progress: number, start: number, end: number, color: string) {
  const appear = smoothstep(start, start + 0.12, progress);
  const hold = 1 - smoothstep(end - 0.08, end, progress);
  const alpha = appear * hold;
  if (alpha <= 0.01) return;
  const chars = name.split("");
  const centerX = 450;
  const baselineY = 215 + (start < 0.5 ? -18 : 48);
  chars.forEach((char, index) => {
    const slotX = centerX - ((chars.length - 1) * 40) / 2 + index * 40;
    const t = smoothstep(start, end - 0.04, progress);
    const fromX = centerX + Math.cos(index * 1.7 + progress * 8) * (190 - index * 8);
    const fromY = baselineY - 110 + Math.sin(index * 2.3 + progress * 9) * 90;
    const x = lerp(fromX, slotX, t);
    const y = lerp(fromY, baselineY, t);
    drawFlyingCard(ctx, x, y, (1 - t) * (index % 2 === 0 ? 1 : -1) * 1.8, 0.88 + t * 0.08, color, index, start > 0.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    label(ctx, char, x, y + 1, start > 0.6 ? "#101018" : "#ede8dc", 22, "900", "center");
    ctx.restore();
  });
}
