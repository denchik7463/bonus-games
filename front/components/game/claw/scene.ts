import { Payload, ClawBall } from "@/components/game/shared/types";
import { colors, drawConfetti, drawMarble, drawWinnerPopup, easeInOutCubic, label, lerp, roundRect, smoothstep } from "@/components/game/shared/primitives";

export function drawClawScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  const balls: ClawBall[] = clawLayout(payload.participants).map((point, index) => ({
    ...point,
    participant: payload.participants[index],
    color: colors[index % colors.length],
    index
  }));
  const winnerBall = balls.find((ball) => ball.participant.id === payload.winnerId) ?? balls[0];
  const failedAttemptCandidate =
    balls.find((ball) => ball.participant.id !== payload.winnerId && ball.x < winnerBall.x) ??
    balls.find((ball) => ball.participant.id !== payload.winnerId);
  const firstAttemptBall = failedAttemptCandidate ?? winnerBall;
  const hasDecoyAttempt = Boolean(failedAttemptCandidate);
  const firstAttemptTarget = hasDecoyAttempt
    ? { x: firstAttemptBall.x, y: firstAttemptBall.y }
    : { x: Math.max(154, winnerBall.x - 72), y: winnerBall.y - 8 };

  const railStartX = 430;
  const clawTopY = 96;
  const firstAttemptLift = { x: firstAttemptTarget.x, y: 152 };
  const firstAttemptRelease = { x: 612, y: 244 };
  const firstDropTarget = { x: firstAttemptTarget.x + 16, y: firstAttemptTarget.y + 20 };
  const winnerLift = { x: winnerBall.x, y: 142 };
  const prizeRelease = { x: 786, y: 248 };
  const prizeRest = { x: 798, y: 306 };

  const aim1 = smoothstep(0.02, 0.12, progress);
  const lower1 = smoothstep(0.12, 0.24, progress);
  const close1 = smoothstep(0.24, 0.28, progress);
  const lift1 = smoothstep(0.28, 0.4, progress);
  const carry1 = smoothstep(0.4, 0.54, progress);
  const drop1 = smoothstep(0.54, 0.64, progress);
  const reset1 = smoothstep(0.64, 0.74, progress);
  const aim2 = smoothstep(0.74, 0.84, progress);
  const lower2 = smoothstep(0.84, 0.9, progress);
  const close2 = smoothstep(0.9, 0.925, progress);
  const lift2 = smoothstep(0.925, 0.952, progress);
  const carry2 = smoothstep(0.952, 0.982, progress);
  const settle2 = smoothstep(0.982, 0.992, progress);
  const drop2 = smoothstep(0.992, 1, progress);

  let clawX = railStartX;
  let clawY = clawTopY;
  let close = 0;
  let carriedBall: ClawBall | null = null;
  let carriedX = 0;
  let carriedY = 0;
  let floatingBall: { ball: ClawBall; x: number; y: number; highlighted: boolean } | null = null;
  let failedSlipPoint: { x: number; y: number } | null = null;

  if (progress < 0.54) {
    const descendY = clawTopY + lower1 * (firstAttemptTarget.y - 104);
    clawX = progress < 0.4 ? lerp(railStartX, firstAttemptTarget.x, aim1) : lerp(firstAttemptLift.x, firstAttemptRelease.x, easeInOutCubic(carry1));
    clawY = progress < 0.28 ? descendY : progress < 0.4 ? lerp(firstAttemptTarget.y - 32, firstAttemptLift.y, lift1) : firstAttemptLift.y;
    close = progress < 0.24 ? 0 : progress < 0.28 ? close1 : 1;
    if (progress >= 0.28 && hasDecoyAttempt) {
      carriedBall = firstAttemptBall;
      carriedX = clawX;
      carriedY = clawY + 38;
    }
  } else if (progress < 0.64) {
    clawX = firstAttemptRelease.x;
    clawY = firstAttemptLift.y;
    close = 1 - drop1;
    if (hasDecoyAttempt) {
      floatingBall = {
        ball: firstAttemptBall,
        x: lerp(firstAttemptRelease.x, firstDropTarget.x, easeInOutCubic(drop1)),
        y: lerp(firstAttemptRelease.y + 38, firstDropTarget.y, drop1 * drop1),
        highlighted: false
      };
      failedSlipPoint = { x: floatingBall.x, y: floatingBall.y };
    } else {
      failedSlipPoint = { x: firstAttemptRelease.x, y: firstAttemptRelease.y + 38 + drop1 * 28 };
    }
  } else if (progress < 0.74) {
    clawX = lerp(firstAttemptRelease.x, railStartX + 18, easeInOutCubic(reset1));
    clawY = lerp(firstAttemptLift.y, clawTopY + 10, easeInOutCubic(reset1));
    close = 0;
  } else if (progress < 0.925) {
    clawX = progress < 0.84 ? lerp(railStartX + 18, winnerBall.x, easeInOutCubic(aim2)) : winnerBall.x;
    const descendY = clawTopY + lower2 * (winnerBall.y - 104);
    clawY = progress < 0.84 ? clawTopY + 10 : descendY;
    close = progress < 0.9 ? 0 : close2;
  } else if (progress < 0.952) {
    clawX = winnerLift.x;
    clawY = lerp(winnerBall.y - 32, winnerLift.y, lift2);
    close = 1;
    carriedBall = winnerBall;
    carriedX = clawX;
    carriedY = clawY + 38;
  } else if (progress < 0.982) {
    const arc = easeInOutCubic(carry2);
    clawX = lerp(winnerLift.x, prizeRelease.x - 20, arc);
    clawY = lerp(winnerLift.y, prizeRelease.y - 54, arc);
    close = 1;
    carriedBall = winnerBall;
    carriedX = clawX;
    carriedY = clawY + 38;
  } else if (progress < 0.992) {
    clawX = lerp(prizeRelease.x - 20, prizeRelease.x, settle2);
    clawY = lerp(prizeRelease.y - 54, prizeRelease.y - 40, settle2);
    close = 1;
    carriedBall = winnerBall;
    carriedX = clawX;
    carriedY = clawY + 38;
  } else {
    clawX = prizeRelease.x;
    clawY = prizeRelease.y - 40;
    close = 1 - drop2;
    floatingBall = {
      ball: winnerBall,
      x: lerp(prizeRelease.x, prizeRest.x, easeInOutCubic(drop2)),
      y: lerp(prizeRelease.y + 38, prizeRest.y, drop2 * drop2),
      highlighted: true
    };
    if (drop2 < 0.05) {
      carriedBall = winnerBall;
      carriedX = prizeRelease.x;
      carriedY = prizeRelease.y + 38;
    }
  }

  drawMachineCabinet(ctx, progress, time);
  drawPrizeTube(ctx, progress, time);
  drawStatusMarquee(ctx, progress, winnerBall.participant.name, hasDecoyAttempt ? firstAttemptBall.participant.name : "", time);
  drawCapsuleHopper(ctx, balls, progress, time, winnerBall.index);

  balls
    .filter((ball) => ball.index !== carriedBall?.index && ball.index !== floatingBall?.ball.index)
    .slice()
    .sort((a, b) => a.y - b.y)
    .forEach((ball) => {
      const bob =
        ball.index === firstAttemptBall.index && progress > 0.58 && progress < 0.74
          ? Math.sin(time * 18) * (1 - reset1) * 3
          : Math.sin(time * 2 + ball.index) * 1.2;
      drawMarble(ctx, ball.x, ball.y + bob, ball.r, ball.color, ball.participant, false, time + ball.index);
    });

  if (floatingBall) {
    drawPremiumBall(ctx, floatingBall, time, floatingBall.highlighted);
  }
  if (failedSlipPoint && progress < 0.72) {
    drawFailedAttemptEffect(ctx, failedSlipPoint.x, failedSlipPoint.y, drop1, time, hasDecoyAttempt);
  }

  drawClawPath(ctx, clawX, clawY, progress, time, close);
  drawClaw(ctx, clawX, clawY, close, progress, time);

  if (carriedBall) {
    drawPremiumBall(ctx, { ball: carriedBall, x: carriedX, y: carriedY, highlighted: carriedBall.index === winnerBall.index && progress > 0.97 }, time, carriedBall.index === winnerBall.index && progress > 0.97);
  }

  drawPrizeBay(ctx, progress, time);
  if (progress > 0.996) {
    drawConfetti(ctx, time, progress);
    drawWinnerPopup(ctx, winnerBall.participant.name, payload.combination.label, smoothstep(0.996, 1, progress));
  }
}

function drawMachineCabinet(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  ctx.save();
  const aura = ctx.createRadialGradient(448, 210, 40, 448, 210, 420);
  aura.addColorStop(0, "rgba(77,215,200,.16)");
  aura.addColorStop(0.4, "rgba(255,205,24,.10)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, 900, 430);

  ctx.shadowColor = "rgba(77,215,200,.18)";
  ctx.shadowBlur = 26;
  const back = ctx.createLinearGradient(86, 54, 744, 372);
  back.addColorStop(0, "#121827");
  back.addColorStop(0.52, "#211a32");
  back.addColorStop(1, "#0f1624");
  ctx.fillStyle = back;
  roundRect(ctx, 86, 54, 658, 318, 14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(77,215,200,.42)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "rgba(237,232,220,.78)";
  ctx.beginPath();
  ctx.moveTo(122, 346);
  ctx.lineTo(744, 346);
  ctx.lineTo(710, 392);
  ctx.lineTo(92, 392);
  ctx.closePath();
  ctx.fill();

  const glass = ctx.createLinearGradient(104, 78, 724, 336);
  glass.addColorStop(0, "rgba(11,18,30,.72)");
  glass.addColorStop(0.5, "rgba(18,20,36,.48)");
  glass.addColorStop(1, "rgba(7,10,16,.80)");
  ctx.fillStyle = glass;
  ctx.fillRect(104, 78, 620, 258);
  ctx.fillStyle = "rgba(188,248,255,.14)";
  ctx.fillRect(122, 92, 584, 2);
  ctx.fillStyle = "rgba(188,248,255,.18)";
  roundRect(ctx, 114, 72, 590, 16, 6);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.28;
  const shine = ctx.createLinearGradient(120, 86, 336, 320);
  shine.addColorStop(0, "rgba(255,255,255,.34)");
  shine.addColorStop(0.36, "rgba(255,255,255,.05)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.moveTo(128, 84);
  ctx.lineTo(282, 84);
  ctx.lineTo(204, 334);
  ctx.lineTo(104, 334);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawLedStrip(ctx, 122, 100, 566, progress, time);

  ctx.fillStyle = "rgba(8,10,18,.96)";
  roundRect(ctx, 748, 228, 112, 156, 9);
  ctx.fill();
  ctx.strokeStyle = "rgba(7,7,7,.65)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#d8b55f";
  roundRect(ctx, 740, 216, 128, 20, 4);
  ctx.fill();
  label(ctx, "ПРИЗОВАЯ ШАХТА", 744, 205, "#d8b55f", 12, "900");
  ctx.restore();
}

function drawLedStrip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, progress: number, time: number) {
  ctx.save();
  for (let i = 0; i < 18; i += 1) {
    const active = ((i / 18 + time * 0.32) % 1) < progress + 0.08;
    ctx.fillStyle = active ? colors[i % colors.length] : "rgba(255,255,255,.12)";
    ctx.shadowColor = active ? colors[i % colors.length] : "transparent";
    ctx.shadowBlur = active ? 10 : 0;
    ctx.beginPath();
    ctx.arc(x + 14 + (w - 28) * (i / 17), y, active ? 3.3 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStatusMarquee(ctx: CanvasRenderingContext2D, progress: number, winnerName: string, decoyName: string, time: number) {
  ctx.save();
  ctx.fillStyle = "rgba(3,5,10,.78)";
  roundRect(ctx, 274, 34, 352, 42, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(77,215,200,.24)";
  ctx.stroke();
  const decoyLabel = decoyName ? "Шар выскользнул" : "Кран прошел мимо";
  const text = progress < 0.12
    ? "КРАН ИЩЕТ ШАР"
    : progress < 0.28
      ? "ЗАХВАТ ПОШЕЛ"
      : progress < 0.54
        ? "ШАР ПОЧТИ У ВЫХОДА"
        : progress < 0.72
          ? decoyLabel
          : progress < 0.84
            ? "АВТОМАТ НЕ СДАЕТСЯ"
            : progress < 0.952
              ? "КРАН ВЫБРАЛ КАПСУЛУ"
              : progress < 0.992
                ? "КАПСУЛА ЛЕТИТ В ВЫДАЧУ"
                : "ПОБЕДНЫЙ ШАР В ШАХТЕ";
  const statusColor = progress >= 0.54 && progress < 0.72 ? "#ff9b61" : progress > 0.925 ? "#ffcd18" : "#8be1ec";
  label(ctx, text, 450, 55, statusColor, 15, "900", "center");
  ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.16;
  label(ctx, progress > 0.992 ? winnerName.slice(0, 16) : "НАПРЯЖЕНИЕ У ВЫДАЧИ", 450, 69, "#9b978d", 9, "800", "center");
  ctx.restore();
}

function drawFailedAttemptEffect(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number, time: number, hasBall: boolean) {
  ctx.save();
  const alpha = 1 - phase * 0.7;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = "rgba(255,124,91,.76)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -time * 34;
  ctx.beginPath();
  ctx.arc(x, y, 26 + phase * 16, -0.35, Math.PI * 1.15);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,124,91,.16)";
  ctx.beginPath();
  ctx.arc(x, y, 38 + Math.sin(time * 10) * 3, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, hasBall ? "сорвался" : "мимо", x, y - 34, "#ff9b61", 13, "950", "center");
  ctx.restore();
}

function drawCapsuleHopper(ctx: CanvasRenderingContext2D, balls: ClawBall[], progress: number, time: number, winnerIndex: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.035)";
  roundRect(ctx, 126, 244, 540, 84, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.055)";
  ctx.stroke();
  balls.forEach((ball) => {
    const pulse = ball.index === winnerIndex ? smoothstep(0.86, 0.98, progress) : 0;
    const glow = pulse > 0 ? 0.5 + Math.sin(time * 10) * 0.15 : 0;
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = `${ball.color}33`;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  ctx.restore();
}

function drawPrizeBay(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  if (progress < 0.82) return;
  ctx.save();
  ctx.globalAlpha = smoothstep(0.82, 0.94, progress);
  ctx.shadowColor = "rgba(216,181,95,.55)";
  ctx.shadowBlur = 24 + Math.sin(time * 6) * 4;
  const bay = ctx.createLinearGradient(760, 274, 838, 334);
  bay.addColorStop(0, "rgba(216,181,95,.22)");
  bay.addColorStop(1, "rgba(77,215,200,.08)");
  ctx.fillStyle = bay;
  roundRect(ctx, 760, 274, 78, 60, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(216,181,95,.55)";
  ctx.stroke();
  label(ctx, "DROP", 799, 342, "#d8b55f", 10, "900", "center");
  ctx.restore();
}

function clawLayout(participants: Payload["participants"]) {
  const coords = [
    [184, 316, 27], [238, 294, 25], [292, 322, 28], [350, 286, 24], [402, 318, 27],
    [462, 292, 25], [518, 322, 28], [580, 292, 26], [638, 320, 27], [316, 250, 23]
  ];
  return participants.map((_, index) => {
    const item = coords[index % coords.length];
    return { x: item[0], y: item[1], r: item[2] };
  });
}

function drawPrizeTube(ctx: CanvasRenderingContext2D, progress: number, time: number) {
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = "rgba(216,181,95,.28)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(784, 220);
  ctx.lineTo(784, 314);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath();
  ctx.moveTo(802, 222);
  ctx.lineTo(802, 314);
  ctx.stroke();
  ctx.setLineDash([]);
  if (progress > 0.95) {
    ctx.globalAlpha = smoothstep(0.95, 1, progress);
    ctx.fillStyle = "rgba(216,181,95,.12)";
    roundRect(ctx, 752, 220, 92, 126, 16);
    ctx.fill();
  }
  ctx.restore();
}

function drawClawPath(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, time: number, close: number) {
  ctx.save();
  ctx.globalAlpha = progress < 0.12 || progress > 0.74 ? 0.36 : 0.18;
  ctx.strokeStyle = close > 0.6 ? "rgba(255,205,24,.34)" : "rgba(77,215,200,.26)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 10]);
  ctx.lineDashOffset = -time * 34;
  ctx.beginPath();
  ctx.moveTo(x, 96);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPremiumBall(ctx: CanvasRenderingContext2D, item: { ball: ClawBall; x: number; y: number; highlighted: boolean }, time: number, highlighted: boolean) {
  ctx.save();
  if (highlighted) {
    ctx.fillStyle = `${item.ball.color}22`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.ball.r + 16 + Math.sin(time * 8) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  drawMarble(ctx, item.x, item.y, item.ball.r, item.ball.color, item.ball.participant, highlighted, time * 2);
  ctx.restore();
}

function drawClaw(ctx: CanvasRenderingContext2D, x: number, y: number, close: number, progress: number, time: number) {
  ctx.save();
  ctx.shadowColor = "rgba(77,215,200,.18)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(188,248,255,.70)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(118, 82);
  ctx.lineTo(704, 82);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const cart = ctx.createLinearGradient(x - 34, 62, x + 34, 96);
  cart.addColorStop(0, "#52617d");
  cart.addColorStop(1, "#1b2538");
  ctx.fillStyle = cart;
  roundRect(ctx, x - 34, 62, 68, 34, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.stroke();
  ctx.fillStyle = close > 0.6 ? "#d8b55f" : "#46536c";
  roundRect(ctx, x - 22, 96, 44, 34, 4);
  ctx.fill();
  ctx.strokeStyle = close > 0.6 ? "#ffcd18" : "#bcc4d6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, 96);
  ctx.lineTo(x, y);
  ctx.stroke();

  const spread = lerp(30, 15, close);
  const tremble = Math.sin(time * 18) * (close > 0.7 ? 1.2 : 0.35);
  ctx.strokeStyle = close > 0.65 || progress > 0.9 ? "#ffcd18" : "#bcc4d6";
  ctx.shadowColor = close > 0.65 ? "rgba(255,205,24,.45)" : "rgba(188,248,255,.22)";
  ctx.shadowBlur = close > 0.65 ? 16 : 8;
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - spread + tremble, y + 38);
  ctx.moveTo(x, y);
  ctx.lineTo(x + spread - tremble, y + 38);
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 43);
  ctx.stroke();
  ctx.restore();
}
