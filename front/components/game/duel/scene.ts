import { Payload, Point } from "@/components/game/shared/types";
import { clamp, colors, drawWinnerPopup, easeInOutCubic, label, lerp, roundRect, shade, smoothstep } from "@/components/game/shared/primitives";

export function drawDuelScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const fighters = payload.participants.slice(0, 5);
  const center = { x: 450, y: 243 };
  const winner = fighters.find((participant) => participant.id === payload.winnerId) ?? fighters[0];
  const eliminated = fighters.filter((participant) => participant.id !== winner.id);
  const phases = eliminated.map((participant, index) => ({
    targetId: participant.id,
    attackerId: index % 2 === 0 ? winner.id : fighters[(index + 1) % fighters.length]?.id ?? winner.id,
    start: 0.12 + index * 0.15,
    end: 0.29 + index * 0.15
  }));

  drawPixelArena(ctx, progress, time);

  const shake = phases.reduce((acc, phase) => {
    const attackWindow = smoothstep(phase.start + 0.1, phase.start + 0.18, progress) * (1 - smoothstep(phase.start + 0.18, phase.end, progress));
    return acc + Math.sin(time * 60) * attackWindow * 5;
  }, 0);

  ctx.save();
  ctx.translate(shake, 0);

  fighters.forEach((participant, index) => {
    const anchor = duelAnchor(index, fighters.length, center);
    const lastPhase = phases.find((phase) => phase.targetId === participant.id);
    const isEliminated = Boolean(lastPhase && progress > lastPhase.end);
    const activeAttack = phases.find((phase) => progress >= phase.start && progress <= phase.end && phase.attackerId === participant.id);
    const activeDefense = phases.find((phase) => progress >= phase.start && progress <= phase.end && phase.targetId === participant.id);

    let x = anchor.x;
    let y = anchor.y;
    let facing = anchor.x < center.x ? 1 : -1;
    let hitFlash = 0;

    if (activeAttack) {
      const attackT = clamp((progress - activeAttack.start) / (activeAttack.end - activeAttack.start), 0, 1);
      const target = duelAnchor(fighters.findIndex((item) => item.id === activeAttack.targetId), fighters.length, center);
      const lunge = attackT < 0.52 ? easeInOutCubic(attackT / 0.52) : 1 - easeInOutCubic((attackT - 0.52) / 0.48);
      x = lerp(anchor.x, lerp(anchor.x, target.x, 0.58), lunge);
      y = lerp(anchor.y, anchor.y - 12, lunge);
      facing = target.x > anchor.x ? 1 : -1;
    }

    if (activeDefense) {
      const defenseT = clamp((progress - activeDefense.start) / (activeDefense.end - activeDefense.start), 0, 1);
      x += Math.sin(defenseT * Math.PI * 5) * 6;
      hitFlash = smoothstep(0.28, 0.42, defenseT) * (1 - smoothstep(0.42, 0.7, defenseT));
    }

    if (isEliminated) {
      const fallT = clamp((progress - (lastPhase?.end ?? 0)) / 0.12, 0, 1);
      y += fallT * 28;
    }

    drawPixelFighter(ctx, {
      x,
      y,
      color: colors[index % colors.length],
      participantName: participant.name,
      facing,
      winner: participant.id === winner.id && progress > 0.82,
      eliminated: isEliminated,
      hitFlash
    });
  });

  phases.forEach((phase) => {
    if (progress < phase.start || progress > phase.end) return;
    const attackT = clamp((progress - phase.start) / (phase.end - phase.start), 0, 1);
    const attackerIndex = fighters.findIndex((item) => item.id === phase.attackerId);
    const targetIndex = fighters.findIndex((item) => item.id === phase.targetId);
    const attacker = duelAnchor(attackerIndex, fighters.length, center);
    const target = duelAnchor(targetIndex, fighters.length, center);
    if (attackT > 0.38 && attackT < 0.62) drawSlash(ctx, lerp(attacker.x, target.x, 0.7), lerp(attacker.y, target.y, 0.48), phase.attackerId === winner.id ? "#d8b55f" : "#e4503d");
  });

  ctx.restore();

  if (progress > 0.9) {
    drawWinnerPopup(ctx, winner.name, payload.combination.label, smoothstep(0.9, 1, progress));
  }
}

function drawPixelArena(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  ctx.save();
  const sky = ctx.createLinearGradient(0, 60, 0, 430);
  sky.addColorStop(0, "#151420");
  sky.addColorStop(1, "#231718");
  ctx.fillStyle = sky;
  roundRect(ctx, 78, 78, 744, 272, 16);
  ctx.fill();
  for (let x = 100; x < 804; x += 18) {
    for (let y = 110; y < 332; y += 18) {
      ctx.fillStyle = (x + y) % 36 === 0 ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.04)";
      ctx.fillRect(x, y, 12, 12);
    }
  }
  ctx.fillStyle = "rgba(228,80,61,.16)";
  ctx.fillRect(110, 302, 680, 24);
  ctx.strokeStyle = "rgba(216,181,95,.22)";
  ctx.strokeRect(110, 302, 680, 24);
  ctx.globalAlpha = 0.45 + smoothstep(0.76, 1, progress) * 0.35;
  ctx.fillStyle = "#d8b55f";
  ctx.fillRect(414, 90 + Math.sin(time * 3) * 2, 72, 8);
  ctx.restore();
}

function duelAnchor(index: number, count: number, center: Point) {
  const spread = [
    { x: -220, y: 38 },
    { x: -82, y: -24 },
    { x: 76, y: -18 },
    { x: 214, y: 34 },
    { x: 0, y: 82 }
  ];
  const slot = spread[index % Math.min(count, spread.length)] ?? spread[0];
  return { x: center.x + slot.x, y: center.y + slot.y };
}

function drawPixelFighter(
  ctx: CanvasRenderingContext2D,
  config: {
    x: number;
    y: number;
    color: string;
    participantName: string;
    facing: number;
    winner: boolean;
    eliminated: boolean;
    hitFlash: number;
  }
) {
  const { x, y, color, participantName, facing, winner, eliminated, hitFlash } = config;
  const px = 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.globalAlpha = eliminated ? 0.28 : 1;

  if (winner) {
    ctx.fillStyle = "rgba(216,181,95,.2)";
    ctx.fillRect(-24, -44, 48, 74);
  }

  ctx.fillStyle = hitFlash > 0 ? "#ffffff" : color;
  ctx.fillRect(-2 * px, -8 * px, 4 * px, 3 * px);
  ctx.fillStyle = "#101018";
  ctx.fillRect(-px, -7 * px, px, px);
  ctx.fillRect(px, -7 * px, px, px);

  ctx.fillStyle = hitFlash > 0 ? "#ffcfb8" : "#f2dcc6";
  ctx.fillRect(-3 * px, -5 * px, 6 * px, 4 * px);

  ctx.fillStyle = shade(color, -20);
  ctx.fillRect(-4 * px, -px, 8 * px, 6 * px);
  ctx.fillStyle = shade(color, 18);
  ctx.fillRect(-3 * px, px, 6 * px, 3 * px);

  ctx.fillStyle = "#d8b55f";
  ctx.fillRect(-5 * px, 0, 2 * px, px);
  ctx.fillRect(3 * px, -2 * px, 2 * px, px);

  ctx.fillStyle = "#101018";
  ctx.fillRect(-3 * px, 5 * px, 2 * px, 4 * px);
  ctx.fillRect(px, 5 * px, 2 * px, 4 * px);
  ctx.restore();

  label(ctx, participantName.slice(0, 9), x, y - 54, winner ? "#d8b55f" : "#ede8dc", 12, "800", "center");
}

function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 12);
  ctx.lineTo(x + 16, y - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 18);
  ctx.lineTo(x + 10, y - 6);
  ctx.stroke();
  ctx.restore();
}
