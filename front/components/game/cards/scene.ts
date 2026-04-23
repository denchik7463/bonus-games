import { Payload } from "@/components/game/shared/types";
import { colors, drawConfetti, label, lerp, roundRect, shade, smoothstep } from "@/components/game/shared/primitives";

type LetterCard = {
  char: string;
  index: number;
  fromX: number;
  fromY: number;
  rotation: number;
  color: string;
};

export function drawCardsScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const winner = payload.participants.find((participant) => participant.id === payload.winnerId) ?? payload.participants[0];
  const winnerName = cleanName(winner?.name ?? "WINNER");
  const decoys = buildDecoyNames(payload, winnerName);
  const finalCards = buildLetterCards(winnerName, 450, 214, time, 0);

  ctx.save();
  drawCardArena(ctx, time, progress);
  drawPremiumFrame(ctx, time, progress);
  drawHeader(ctx, progress, winnerName);
  drawSideParticipants(ctx, payload, winner?.id);
  drawDecks(ctx, time, progress);
  drawCardTrails(ctx, progress, time);
  drawNameRitual(ctx, decoys, progress, time);
  drawFinalName(ctx, finalCards, progress, time, winnerName);
  drawBottomFeed(ctx, payload, decoys, winnerName, progress);

  if (progress > 0.91) {
    drawFinalReveal(ctx, winner?.name ?? winnerName, winner?.seatNumber, smoothstep(0.91, 1, progress));
    drawConfetti(ctx, time, progress);
  }

  ctx.restore();
}

function drawCardArena(ctx: CanvasRenderingContext2D, time: number, progress: number) {
  const vignette = ctx.createLinearGradient(0, 0, 900, 430);
  vignette.addColorStop(0, "rgba(29,16,44,.48)");
  vignette.addColorStop(0.5, "rgba(6,7,12,.04)");
  vignette.addColorStop(1, "rgba(1,2,4,.62)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 900, 430);

  const glow = ctx.createRadialGradient(450, 210, 20, 450, 210, 360);
  glow.addColorStop(0, "rgba(255,205,24,.26)");
  glow.addColorStop(0.28, "rgba(123,60,255,.14)");
  glow.addColorStop(0.58, "rgba(77,215,200,.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 900, 430);

  ctx.save();
  ctx.globalAlpha = 0.36;
  for (let i = 0; i < 28; i += 1) {
    const x = 450 + Math.cos(time * 0.28 + i * 0.74) * (110 + (i % 7) * 38);
    const y = 204 + Math.sin(time * 0.36 + i * 0.9) * (34 + (i % 5) * 18);
    drawGlyph(ctx, x, y, i, progress);
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(255,205,24,.16)";
  ctx.shadowBlur = 36;
  ctx.fillStyle = "rgba(5,6,10,.70)";
  roundRect(ctx, 148, 68, 604, 252, 38);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,205,24,.24)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const table = ctx.createLinearGradient(170, 84, 730, 310);
  table.addColorStop(0, "rgba(255,205,24,.16)");
  table.addColorStop(0.42, "rgba(123,60,255,.10)");
  table.addColorStop(1, "rgba(77,215,200,.10)");
  ctx.fillStyle = table;
  roundRect(ctx, 176, 88, 548, 212, 32);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  ctx.stroke();

  ctx.globalAlpha = 0.46;
  ctx.strokeStyle = "rgba(255,205,24,.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 11; i += 1) {
    ctx.beginPath();
    ctx.ellipse(450, 198, 82 + i * 23, 22 + i * 8, Math.sin(time * 0.16) * 0.04, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPremiumFrame(ctx: CanvasRenderingContext2D, time: number, progress: number) {
  ctx.save();
  const pulse = 0.5 + Math.sin(time * 1.4) * 0.5;
  const border = ctx.createLinearGradient(42, 40, 858, 390);
  border.addColorStop(0, `rgba(255,205,24,${0.18 + pulse * 0.12})`);
  border.addColorStop(0.5, "rgba(123,60,255,.16)");
  border.addColorStop(1, "rgba(77,215,200,.16)");
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 42, 44, 816, 344, 28);
  ctx.stroke();

  ctx.globalAlpha = 0.75;
  [
    [66, 68, 56, 0],
    [834, 68, 56, Math.PI / 2],
    [834, 364, 56, Math.PI],
    [66, 364, 56, -Math.PI / 2]
  ].forEach(([x, y, size, rotation]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = "rgba(255,205,24,.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size * 0.62);
    ctx.stroke();
    ctx.restore();
  });

  for (let i = 0; i < 24; i += 1) {
    const x = (i * 97 + time * 22) % 900;
    const y = 58 + ((i * 53 + time * 15) % 306);
    ctx.globalAlpha = (0.12 + (i % 4) * 0.03) * (1 - smoothstep(0.92, 1, progress) * 0.35);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHeader(ctx: CanvasRenderingContext2D, progress: number, winnerName: string) {
  ctx.save();
  ctx.shadowColor = "rgba(255,205,24,.18)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "rgba(7,7,10,.82)";
  roundRect(ctx, 252, 48, 396, 58, 20);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,205,24,.22)";
  ctx.stroke();
  label(ctx, "МАГИЯ ИМЕНИ", 450, 69, "#ffcd18", 14, "900", "center");
  const subtitle = progress < 0.5
    ? "карты пробуют чужие фрагменты"
    : progress < 0.86
      ? "буквы сходятся к настоящему имени"
      : `${winnerName} собирается полностью`;
  label(ctx, subtitle, 450, 88, "#b9b3a7", 12, "700", "center");
  ctx.restore();
}

function drawDecks(ctx: CanvasRenderingContext2D, time: number, progress: number) {
  const lift = Math.sin(time * 2.1) * 2;
  drawCardStack(ctx, 224, 198 + lift, -0.14, "#8be1ec", progress < 0.55);
  drawCardStack(ctx, 676, 198 - lift, 0.14, "#bfa2ff", progress < 0.78);

  ctx.save();
  ctx.strokeStyle = "rgba(255,205,24,.26)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.lineDashOffset = -time * 22;
  ctx.beginPath();
  ctx.moveTo(268, 198);
  ctx.bezierCurveTo(340, 118, 560, 118, 632, 198);
  ctx.stroke();
  ctx.restore();
}

function drawCardStack(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, color: string, active: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  for (let i = 4; i >= 0; i -= 1) {
    ctx.save();
    ctx.translate(i * 3, i * -3);
    ctx.shadowColor = active ? `${color}66` : "rgba(0,0,0,.3)";
    ctx.shadowBlur = active ? 14 : 5;
    ctx.fillStyle = i === 0 ? "rgba(12,14,20,.94)" : "rgba(20,22,30,.86)";
    roundRect(ctx, -24, -34, 48, 68, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? `${color}88` : "rgba(255,255,255,.12)";
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = `${color}33`;
  roundRect(ctx, -14, -22, 28, 12, 5);
  ctx.fill();
  ctx.restore();
}

function drawCardTrails(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  ctx.save();
  const intensity = smoothstep(0.18, 0.8, progress) * (1 - smoothstep(0.9, 1, progress) * 0.35);
  ctx.globalAlpha = intensity;
  for (let i = 0; i < 12; i += 1) {
    const t = (time * 0.12 + i / 12) % 1;
    const x = lerp(238, 662, t);
    const y = 194 + Math.sin(t * Math.PI * 2 + i) * 46;
    const trail = ctx.createLinearGradient(x - 40, y, x + 40, y);
    trail.addColorStop(0, "rgba(255,255,255,0)");
    trail.addColorStop(0.5, `${colors[i % colors.length]}88`);
    trail.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 42, y);
    ctx.quadraticCurveTo(x, y - 12, x + 42, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNameRitual(ctx: CanvasRenderingContext2D, decoys: string[], progress: number, time: number) {
  decoys.forEach((name, row) => {
    const start = 0.13 + row * 0.18;
    const end = start + 0.23;
    const appear = smoothstep(start, start + 0.07, progress);
    const dissolve = 1 - smoothstep(end - 0.07, end, progress);
    const alpha = appear * dissolve;
    if (alpha <= 0.01) return;

    const y = 142 + row * 46;
    const cards = buildLetterCards(name, 450, y, time, row + 1);
    cards.forEach((card) => {
      const t = smoothstep(start, end - 0.06, progress);
      const shake = Math.sin(time * 9 + card.index * 1.9 + row) * (1 - t) * 7;
      const x = lerp(card.fromX, targetX(name, card.index), t) + shake;
      const cy = lerp(card.fromY, y, t) + Math.cos(time * 8 + card.index) * (1 - t) * 5;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawLetterCard(ctx, x, cy, card.char, card.rotation * (1 - t), 0.82, card.color, false);
      ctx.restore();
    });

    ctx.save();
    ctx.globalAlpha = alpha * smoothstep(start + 0.08, end - 0.09, progress);
    label(ctx, row === 2 ? "почти похоже" : "ложный след", 696, y, "rgba(139,225,236,.78)", 11, "800", "right");
    ctx.restore();
  });
}

function drawFinalName(ctx: CanvasRenderingContext2D, cards: LetterCard[], progress: number, time: number, winnerName: string) {
  const appear = smoothstep(0.58, 0.73, progress);
  const lock = smoothstep(0.76, 0.9, progress);
  if (appear <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = appear;
  ctx.shadowColor = "rgba(255,205,24,.35)";
  ctx.shadowBlur = 28 + lock * 18;
  ctx.strokeStyle = `rgba(255,205,24,${0.16 + lock * 0.38})`;
  ctx.lineWidth = 2;
  roundRect(ctx, 194, 154, 512, 118, 26);
  ctx.stroke();
  ctx.shadowBlur = 0;
  label(ctx, "ФИНАЛЬНОЕ ИМЯ", 450, 145, "#ffcd18", 12, "900", "center");

  cards.forEach((card) => {
    const tx = targetX(winnerName, card.index);
    const ty = 212;
    const t = smoothstep(0.58 + card.index * 0.012, 0.84 + card.index * 0.006, progress);
    const arc = Math.sin(t * Math.PI) * (58 + (card.index % 3) * 16);
    const x = lerp(card.fromX, tx, t);
    const y = lerp(card.fromY, ty, t) - arc;
    const scale = 0.92 + lock * 0.12 + Math.sin(time * 8 + card.index) * 0.015 * (1 - lock);
    drawLetterCard(ctx, x, y, card.char, card.rotation * (1 - t), scale, card.color, true);
  });

  if (progress > 0.86) {
    const sweep = smoothstep(0.86, 0.96, progress);
    const x = lerp(208, 692, sweep);
    const beam = ctx.createLinearGradient(x - 90, 212, x + 90, 212);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.5, "rgba(255,255,255,.38)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = beam;
    roundRect(ctx, x - 90, 164, 180, 96, 22);
    ctx.fill();
  }
  if (progress > 0.82) {
    drawWinnerCrown(ctx, 450, 118, smoothstep(0.82, 0.95, progress));
  }
  ctx.restore();
}

function drawWinnerCrown(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "rgba(255,205,24,.54)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffcd18";
  ctx.beginPath();
  ctx.moveTo(x - 28, y + 12);
  ctx.lineTo(x - 20, y - 10);
  ctx.lineTo(x - 7, y + 4);
  ctx.lineTo(x, y - 16);
  ctx.lineTo(x + 7, y + 4);
  ctx.lineTo(x + 20, y - 10);
  ctx.lineTo(x + 28, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5,6,10,.5)";
  roundRect(ctx, x - 28, y + 12, 56, 8, 3);
  ctx.fill();
  ctx.restore();
}

function drawFinalReveal(ctx: CanvasRenderingContext2D, winnerName: string, seatNumber: number | undefined, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "rgba(255,205,24,.32)";
  ctx.shadowBlur = 30;
  const bg = ctx.createLinearGradient(254, 282, 646, 374);
  bg.addColorStop(0, "rgba(255,205,24,.18)");
  bg.addColorStop(0.42, "rgba(8,9,14,.90)");
  bg.addColorStop(1, "rgba(123,60,255,.18)");
  ctx.fillStyle = bg;
  roundRect(ctx, 252, 282, 396, 92, 26);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,205,24,.70)";
  ctx.lineWidth = 2;
  ctx.stroke();
  label(ctx, "ИМЯ СОБРАНО", 450, 306, "#ffcd18", 13, "900", "center");
  label(ctx, winnerName, 450, 336, "#ede8dc", 30, "900", "center");
  label(ctx, seatNumber ? `победило место ${seatNumber}` : "победитель зафиксирован", 450, 360, "#b9b3a7", 12, "800", "center");
  ctx.restore();
}

function drawBottomFeed(ctx: CanvasRenderingContext2D, payload: Payload, decoys: string[], winnerName: string, progress: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.38)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "rgba(4,5,8,.70)";
  roundRect(ctx, 54, 336, 792, 58, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.stroke();
  label(ctx, "ход раскрытия", 80, 354, "#ffcd18", 11, "900", "left");

  const steps = [
    { at: 0.2, text: "фрагмент найден" },
    { at: 0.42, text: "след не подошел" },
    { at: 0.66, text: "карты меняют порядок" },
    { at: 0.86, text: "собираем финальное слово" }
  ];
  steps.forEach((step, index) => {
    const active = progress >= step.at;
    const x = 80 + index * 190;
    ctx.fillStyle = active ? "rgba(255,205,24,.14)" : "rgba(255,255,255,.035)";
    roundRect(ctx, x, 364, 168, 20, 10);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = "rgba(255,205,24,.22)";
      ctx.stroke();
    }
    label(ctx, step.text, x + 84, 374, active ? "#ede8dc" : "#79756f", 10, "800", "center");
  });

  const shown = payload.participants.slice(0, 6);
  shown.forEach((participant, index) => {
    const x = 646 + index * 30;
    const winner = participant.id === payload.winnerId;
    ctx.fillStyle = winner ? "#ffcd18" : "rgba(237,232,220,.16)";
    ctx.beginPath();
    ctx.arc(x, 352, winner ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawSideParticipants(ctx: CanvasRenderingContext2D, payload: Payload, winnerId: string | undefined) {
  const participants = payload.participants.slice(0, 8);
  participants.forEach((participant, index) => {
    const left = index % 2 === 0;
    const row = Math.floor(index / 2);
    const x = left ? 62 : 838;
    const y = 92 + row * 54;
    const active = participant.id === winnerId;
    ctx.save();
    ctx.shadowColor = active ? "rgba(255,205,24,.20)" : "rgba(0,0,0,.15)";
    ctx.shadowBlur = active ? 18 : 6;
    ctx.fillStyle = active ? "rgba(255,205,24,.14)" : "rgba(255,255,255,.045)";
    roundRect(ctx, left ? x : x - 126, y - 18, 126, 36, 15);
    ctx.fill();
    ctx.strokeStyle = active ? "rgba(255,205,24,.44)" : "rgba(255,255,255,.07)";
    ctx.stroke();
    label(ctx, participant.seatNumber ? `${participant.seatNumber}` : `${index + 1}`, left ? x + 18 : x - 108, y, active ? "#ffcd18" : "#8f8a80", 12, "900", "center");
    label(ctx, participant.name.slice(0, 11), left ? x + 38 : x - 20, y, "#ede8dc", 11, "800", left ? "left" : "right");
    ctx.restore();
  });
}

function drawLetterCard(ctx: CanvasRenderingContext2D, x: number, y: number, char: string, rotation: number, scale: number, color: string, highlighted: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.shadowColor = highlighted ? "rgba(255,205,24,.48)" : `${color}55`;
  ctx.shadowBlur = highlighted ? 24 : 12;
  const card = ctx.createLinearGradient(-28, -38, 28, 38);
  card.addColorStop(0, highlighted ? "#fff4b0" : "#272a34");
  card.addColorStop(0.46, highlighted ? color : "#11131b");
  card.addColorStop(1, highlighted ? shade(color, -42) : "#07080d");
  ctx.fillStyle = card;
  roundRect(ctx, -28, -38, 56, 76, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = highlighted ? "rgba(255,255,255,.78)" : "rgba(237,232,220,.20)";
  ctx.lineWidth = highlighted ? 2.2 : 1.4;
  ctx.stroke();
  ctx.fillStyle = highlighted ? "rgba(5,6,10,.72)" : `${color}28`;
  roundRect(ctx, -18, -28, 36, 14, 5);
  ctx.fill();
  label(ctx, char, 0, 5, highlighted ? "#08090d" : "#ede8dc", 28, "900", "center");
  if (highlighted) {
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-18, -24);
    ctx.lineTo(14, 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, index: number, progress: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(index * 0.8 + progress * 2);
  ctx.strokeStyle = `${colors[index % colors.length]}66`;
  ctx.lineWidth = 1.4;
  roundRect(ctx, -12, -16, 24, 32, 6);
  ctx.stroke();
  ctx.restore();
}

function buildDecoyNames(payload: Payload, winnerName: string) {
  const names = payload.participants
    .filter((participant) => participant.id !== payload.winnerId)
    .map((participant) => cleanName(participant.name))
    .filter(Boolean);
  const source = names.length ? names : ["AURUM", "LUCKY"];
  return [
    source[0]?.slice(0, Math.max(3, Math.min(7, source[0].length))) ?? "AUR",
    source[1 % source.length]?.slice(0, Math.max(3, Math.min(7, source[1 % source.length].length))) ?? winnerName.slice(0, 3),
    `${source[0]?.slice(0, 2) ?? "VI"}${winnerName.slice(-2)}`
  ];
}

function buildLetterCards(name: string, centerX: number, baselineY: number, time: number, seed: number): LetterCard[] {
  return name.split("").map((char, index) => {
    const angle = time * (0.45 + seed * 0.04) + index * 1.37 + seed;
    return {
      char,
      index,
      fromX: centerX + Math.cos(angle) * (230 + (index % 4) * 24),
      fromY: baselineY + Math.sin(angle * 1.18) * (120 + (index % 3) * 18),
      rotation: Math.sin(angle) * 1.8,
      color: colors[(index + seed * 3) % colors.length]
    };
  });
}

function targetX(name: string, index: number) {
  const gap = name.length > 8 ? 42 : 48;
  return 450 - ((name.length - 1) * gap) / 2 + index * gap;
}

function cleanName(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/g, "");
  return (cleaned || "WINNER").slice(0, 10);
}
