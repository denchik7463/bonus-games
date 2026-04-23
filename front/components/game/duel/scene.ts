import type { Participant } from "@/lib/domain/types";
import { Payload } from "@/components/game/shared/types";
import { bell, clamp, colors, drawWinnerPopup, easeInOutCubic, label, lerp, roundRect, smoothstep } from "@/components/game/shared/primitives";

const duelImages = new Map<string, HTMLImageElement>();
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
  "/mascots/ch10.png"
];

export function preloadDuelAssets() {
  if (typeof window === "undefined") return Promise.resolve();
  const assets = [
    "/mascots/duel/background.png",
    "/mascots/duel/sword.png",
    ...chinchillaSources
  ];
  return Promise.all(assets.map((src) => preloadDuelImage(src))).then(() => undefined);
}

export function drawDuelScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const fighters = payload.participants.slice(0, 10);
  const winner = fighters.find((participant) => participant.id === payload.winnerId) ?? fighters[0];
  if (!winner) return;
  const rounds = buildDuelRounds(fighters, winner);
  const activeRound = rounds.find((round) => progress >= round.start && progress <= round.end);
  const activeImpact = activeRound ? bell(progress, activeRound.start + 0.12, activeRound.end - 0.04) : 0;
  const reveal = smoothstep(0.82, 0.98, progress);
  const shake = activeImpact * Math.sin(time * 80) * 7;

  drawArenaBackground(ctx, progress, time, activeImpact);

  ctx.save();
  ctx.translate(shake, activeImpact * Math.sin(time * 68) * 2);
  drawBattleFloor(ctx, time, progress);

  fighters.forEach((participant, index) => {
    const base = duelAnchor(index, fighters.length);
    const color = colors[index % colors.length];
    const isWinner = participant.id === winner.id;
    const participantRound = rounds.find((round) => round.loser.id === participant.id);
    const eliminated = Boolean(participantRound && progress > participantRound.end);
    const attackingRound = rounds.find((round) => round.winner.id === participant.id && progress >= round.start && progress <= round.end);
    const defendingRound = rounds.find((round) => round.loser.id === participant.id && progress >= round.start && progress <= round.end);
    const finalPower = isWinner ? reveal : 0;

    let x = base.x;
    let y = base.y + Math.sin(time * 3 + index) * 2;
    let scale = 0.78 + index * 0.012;
    let facing = base.side === "left" ? 1 : -1;
    let hit = 0;
    let aura = participant.hasBoost ? 0.95 : 0.58;
    let swordPower = 0;

    if (attackingRound) {
      const attackT = clamp((progress - attackingRound.start) / (attackingRound.end - attackingRound.start), 0, 1);
      const target = duelAnchor(fighters.indexOf(attackingRound.loser), fighters.length);
      const lunge = attackT < 0.56 ? easeInOutCubic(attackT / 0.56) : 1 - easeInOutCubic((attackT - 0.56) / 0.44);
      x = lerp(base.x, target.x - target.sideSign * 92, lunge);
      y = lerp(base.y, target.y - 20, lunge) + Math.sin(attackT * Math.PI) * -8;
      scale += lunge * 0.1;
      facing = target.x > base.x ? 1 : -1;
      aura += lunge * 0.55;
      swordPower = 0.42 + lunge * 0.58;
    }

    if (defendingRound) {
      const defenseT = clamp((progress - defendingRound.start) / (defendingRound.end - defendingRound.start), 0, 1);
      hit = bell(defenseT, 0.32, 0.72);
      x += Math.sin(defenseT * Math.PI * 7) * 9;
      y += hit * 12;
      scale -= hit * 0.04;
    }

    if (eliminated) {
      const fallT = clamp((progress - (participantRound?.end ?? 0)) / 0.14, 0, 1);
      y += fallT * 32;
      scale -= fallT * 0.08;
    }

    if (finalPower) {
      x = lerp(x, 450, finalPower * 0.28);
      y = lerp(y, 218, finalPower * 0.18);
      scale += finalPower * 0.14;
      aura += finalPower * 1.2;
    }

    drawFighter(ctx, {
      participant,
      index,
      x,
      y,
      color,
      scale,
      facing,
      eliminated,
      winner: isWinner && progress > 0.82,
      hit,
      aura,
      swordPower
    });
  });

  if (activeRound) {
    const attackT = clamp((progress - activeRound.start) / (activeRound.end - activeRound.start), 0, 1);
    drawImpactClash(ctx, activeRound, fighters, attackT);
  }

  ctx.restore();

  drawDuelHud(ctx, fighters, winner, progress, time);
  if (progress > 0.86) drawDuelFireworks(ctx, time, smoothstep(0.86, 1, progress));
  if (progress > 0.9) {
    drawWinnerPopup(ctx, winner.name, winner.seatNumber ? `Победило место ${winner.seatNumber}` : payload.combination.label, smoothstep(0.9, 1, progress));
  }
}

function drawArenaBackground(ctx: CanvasRenderingContext2D, progress: number, time: number, impact: number) {
  const image = getDuelImage("/mascots/duel/background.png");
  if (image?.complete && image.naturalWidth > 0) {
    coverImage(ctx, image, 34, 46, 832, 342);
  } else {
    const bg = ctx.createLinearGradient(0, 40, 0, 390);
    bg.addColorStop(0, "#160d20");
    bg.addColorStop(0.46, "#27111a");
    bg.addColorStop(1, "#08070b");
    ctx.fillStyle = bg;
    roundRect(ctx, 34, 46, 832, 342, 20);
    ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha = 0.34 + impact * 0.22;
  const glow = ctx.createRadialGradient(450, 224, 40, 450, 224, 360);
  glow.addColorStop(0, "rgba(255,205,24,.22)");
  glow.addColorStop(0.42, "rgba(228,80,61,.12)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(34, 46, 832, 342);
  ctx.globalAlpha = 0.18 + smoothstep(0.78, 1, progress) * 0.18;
  ctx.fillStyle = `rgba(255,205,24,${0.22 + Math.sin(time * 4) * 0.04})`;
  roundRect(ctx, 372, 58, 156, 38, 6);
  ctx.fill();
  ctx.restore();
}

function drawBattleFloor(ctx: CanvasRenderingContext2D, time: number, progress: number) {
  ctx.save();
  ctx.globalAlpha = 0.72;
  const floor = ctx.createLinearGradient(88, 342, 812, 342);
  floor.addColorStop(0, "rgba(123,60,255,.08)");
  floor.addColorStop(0.48, "rgba(255,205,24,.16)");
  floor.addColorStop(1, "rgba(228,80,61,.10)");
  ctx.fillStyle = floor;
  roundRect(ctx, 92, 316, 716, 38, 16);
  ctx.fill();
  for (let i = 0; i < 18; i += 1) {
    const x = 112 + i * 41 + Math.sin(time * 1.8 + i) * 4;
    ctx.fillStyle = i % 2 ? "rgba(255,205,24,.16)" : "rgba(77,215,200,.12)";
    roundRect(ctx, x, 328 + Math.sin(time * 2 + i) * 2, 18, 3, 2);
    ctx.fill();
  }
  ctx.globalAlpha = smoothstep(0.84, 1, progress);
  ctx.strokeStyle = "rgba(255,205,24,.78)";
  ctx.lineWidth = 2;
  roundRect(ctx, 374, 304, 152, 64, 18);
  ctx.stroke();
  ctx.restore();
}

function drawFighter(
  ctx: CanvasRenderingContext2D,
  config: {
    participant: Participant;
    index: number;
    x: number;
    y: number;
    color: string;
    scale: number;
    facing: number;
    eliminated: boolean;
    winner: boolean;
    hit: number;
    aura: number;
    swordPower: number;
  }
) {
  const { participant, index, x, y, color, scale, facing, eliminated, winner, hit, aura, swordPower } = config;
  const image = getDuelImage(chinchillaSources[index % chinchillaSources.length]);
  ctx.save();
  ctx.globalAlpha = eliminated ? 0.28 : 1;

  drawAura(ctx, x, y, color, aura, participant.hasBoost, winner);

  ctx.translate(x, y + hit * 6);
  ctx.scale(facing * scale, scale);
  ctx.rotate(Math.sin(index + y) * 0.015 + hit * 0.08 * facing);

  if (image?.complete && image.naturalWidth > 0) {
    ctx.shadowColor = winner ? "rgba(255,205,24,.62)" : color;
    ctx.shadowBlur = winner ? 32 : 18;
    ctx.drawImage(image, -54, -72, 108, 108);
  } else {
    ctx.fillStyle = hit > 0.1 ? "#ffffff" : color;
    roundRect(ctx, -36, -58, 72, 62, 20);
    ctx.fill();
  }
  if (swordPower > 0 && !eliminated) drawSwordInPaws(ctx, swordPower, winner);
  ctx.restore();

  if (!eliminated) {
    label(ctx, participant.name.slice(0, 12), x, y - 82, winner ? "#ffcd18" : "#ede8dc", 12, "900", "center");
    if (participant.seatNumber) label(ctx, `${participant.seatNumber} место`, x, y - 66, color, 10, "800", "center");
  }
}

function drawAura(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, power: number, boosted: boolean, winner: boolean) {
  ctx.save();
  const radius = winner ? 88 : boosted ? 74 : 58;
  const gradient = ctx.createRadialGradient(x, y - 22, 8, x, y - 22, radius);
  gradient.addColorStop(0, winner ? "rgba(255,205,24,.38)" : hexToRgba(color, 0.32 * power));
  gradient.addColorStop(0.44, hexToRgba(color, 0.16 * power));
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y - 18, radius * 0.72, radius, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = winner ? "rgba(255,205,24,.82)" : boosted ? "rgba(255,205,24,.58)" : hexToRgba(color, 0.42);
  ctx.lineWidth = winner ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 20, radius * 0.62, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSwordInPaws(ctx: CanvasRenderingContext2D, power: number, winner: boolean) {
  const image = getDuelImage("/mascots/duel/sword.png");
  ctx.save();
  ctx.globalAlpha = clamp(power, 0, 1);
  ctx.translate(26, -34);
  ctx.rotate(-0.62 + power * 0.48);
  ctx.shadowColor = winner ? "rgba(255,205,24,.75)" : "rgba(255,255,255,.45)";
  ctx.shadowBlur = winner ? 28 : 16;
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, -28, -48, 78, 78);
  } else {
    ctx.strokeStyle = winner ? "#ffcd18" : "#ede8dc";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-18, 34);
    ctx.lineTo(28, -32);
    ctx.stroke();
  }
  ctx.restore();
}

function drawImpactClash(ctx: CanvasRenderingContext2D, round: DuelRound, fighters: Participant[], attackT: number) {
  const attacker = duelAnchor(fighters.indexOf(round.winner), fighters.length);
  const target = duelAnchor(fighters.indexOf(round.loser), fighters.length);
  const x = lerp(attacker.x, target.x, 0.54 + Math.sin(attackT * Math.PI) * 0.08);
  const y = lerp(attacker.y, target.y, 0.45) - 24;
  const impact = bell(attackT, 0.34, 0.72);

  if (impact > 0.05) {
    ctx.save();
    ctx.globalAlpha = impact;
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 24 + impact * 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,205,24,.72)";
    ctx.beginPath();
    ctx.moveTo(x - 58, y);
    ctx.lineTo(x + 58, y);
    ctx.moveTo(x, y - 42);
    ctx.lineTo(x, y + 42);
    ctx.stroke();
    ctx.restore();
  }
}

function drawDuelHud(ctx: CanvasRenderingContext2D, fighters: Participant[], winner: Participant, progress: number, time: number) {
  ctx.save();
  ctx.fillStyle = "rgba(5,6,10,.72)";
  roundRect(ctx, 350, 54, 200, 64, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,205,24,.32)";
  ctx.stroke();
  label(ctx, "ДУЭЛЬ", 450, 76, "#ffcd18", 22, "950", "center");
  label(ctx, progress < 0.82 ? "битва идет" : "финальный удар", 450, 101, "#ede8dc", 12, "800", "center");

  const alive = fighters.filter((participant) => {
    if (participant.id === winner.id) return true;
    const round = buildDuelRounds(fighters, winner).find((item) => item.loser.id === participant.id);
    return !round || progress < round.end;
  }).length;
  ctx.fillStyle = "rgba(5,6,10,.66)";
  roundRect(ctx, 74, 58, 152, 58, 14);
  ctx.fill();
  ctx.strokeStyle = alive <= 2 ? "rgba(255,205,24,.58)" : "rgba(77,215,200,.36)";
  ctx.stroke();
  label(ctx, alive <= 2 ? "финал близко" : "бойцы на арене", 150, 76 + Math.sin(time * 3) * 1.5, alive <= 2 ? "#ffcd18" : "#4dd7c8", 11, "900", "center");
  label(ctx, `${alive} из ${fighters.length} держатся`, 150, 98, "#ede8dc", 13, "900", "center");
  ctx.restore();
}

function drawDuelFireworks(ctx: CanvasRenderingContext2D, time: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const bursts = [
    { x: 164, y: 116, color: "#ffcd18", delay: 0 },
    { x: 738, y: 122, color: "#e4503d", delay: 0.22 },
    { x: 280, y: 86, color: "#4dd7c8", delay: 0.42 },
    { x: 614, y: 84, color: "#b86cff", delay: 0.62 },
    { x: 450, y: 128, color: "#ffffff", delay: 0.82 }
  ];
  bursts.forEach((burst, burstIndex) => {
    const local = (time * 0.55 + burst.delay) % 1;
    const radius = 12 + local * 48;
    const fade = 1 - local;
    for (let i = 0; i < 14; i += 1) {
      const angle = (Math.PI * 2 * i) / 14 + burstIndex * 0.18;
      const x = burst.x + Math.cos(angle) * radius;
      const y = burst.y + Math.sin(angle) * radius * 0.72;
      ctx.fillStyle = hexToRgba(burst.color, fade * 0.85);
      ctx.beginPath();
      ctx.arc(x, y, 2.5 + fade * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = hexToRgba(burst.color, fade * 0.34);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

type DuelRound = {
  winner: Participant;
  loser: Participant;
  start: number;
  end: number;
};

function buildDuelRounds(fighters: Participant[], winner: Participant): DuelRound[] {
  const rawRounds: Array<Omit<DuelRound, "start" | "end">> = [];
  let contenders = fighters.slice();
  let safety = 0;

  while (contenders.length > 1 && safety < 6) {
    const next: Participant[] = [];
    for (let index = 0; index < contenders.length; index += 2) {
      const first = contenders[index];
      const second = contenders[index + 1];
      if (!second) {
        next.push(first);
        continue;
      }
      const pairWinner = choosePairWinner(first, second, winner, rawRounds.length);
      const loser = pairWinner.id === first.id ? second : first;
      rawRounds.push({ winner: pairWinner, loser });
      next.push(pairWinner);
    }
    contenders = next;
    safety += 1;
  }

  const firstStart = 0.12;
  const lastStart = 0.78;
  const step = rawRounds.length > 1 ? (lastStart - firstStart) / (rawRounds.length - 1) : 0.18;
  return rawRounds.map((round, index) => {
    const start = firstStart + index * step;
    const end = Math.min(0.88, start + Math.min(0.16, step * 0.82 + 0.05));
    return { ...round, start, end };
  });
}

function choosePairWinner(first: Participant, second: Participant, finalWinner: Participant, roundIndex: number) {
  if (first.id === finalWinner.id || first.userId === finalWinner.userId) return first;
  if (second.id === finalWinner.id || second.userId === finalWinner.userId) return second;
  const firstScore = (first.hasBoost ? 2 : 0) + ((first.seatNumber ?? roundIndex + 1) % 3);
  const secondScore = (second.hasBoost ? 2 : 0) + ((second.seatNumber ?? roundIndex + 2) % 3);
  if (firstScore === secondScore) return roundIndex % 2 === 0 ? second : first;
  return firstScore > secondScore ? first : second;
}

function duelAnchor(index: number, count: number) {
  const leftRows = [
    { x: 230, y: 176 },
    { x: 190, y: 238 },
    { x: 255, y: 294 },
    { x: 162, y: 304 },
    { x: 304, y: 226 }
  ];
  const rightRows = [
    { x: 670, y: 176 },
    { x: 710, y: 238 },
    { x: 645, y: 294 },
    { x: 738, y: 304 },
    { x: 596, y: 226 }
  ];
  const leftCount = Math.ceil(count / 2);
  const side = index < leftCount ? "left" : "right";
  const slot = side === "left" ? leftRows[index % leftRows.length] : rightRows[(index - leftCount) % rightRows.length];
  return { ...slot, side, sideSign: side === "left" ? 1 : -1 };
}

function getDuelImage(src: string) {
  if (typeof window === "undefined") return null;
  const cached = duelImages.get(src);
  if (cached) return cached;
  const image = new Image();
  image.src = src;
  duelImages.set(src, image);
  return image;
}

function preloadDuelImage(src: string) {
  if (typeof window === "undefined") return Promise.resolve(null);
  const cached = duelImages.get(src);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  const image = cached ?? new Image();
  if (!cached) {
    duelImages.set(src, image);
    image.src = src;
  }
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve(image);
      return;
    }
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
  });
}

function coverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, 20);
  ctx.clip();
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}
