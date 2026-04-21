import { Payload, ClawBall } from "@/components/game/shared/types";
import { colors, drawConfetti, drawMarble, drawWinnerPopup, easeInOutCubic, label, lerp, roundRect, smoothstep } from "@/components/game/shared/primitives";

export function drawClawScene(ctx: CanvasRenderingContext2D, payload: Payload, progress: number, time: number) {
  drawMachineCabinet(ctx);
  const balls: ClawBall[] = clawLayout(payload.participants).map((point, index) => ({
    ...point,
    participant: payload.participants[index],
    color: colors[index % colors.length],
    index
  }));
  const winnerBall = balls.find((ball) => ball.participant.id === payload.winnerId) ?? balls[0];
  const firstAttemptBall =
    balls.find((ball) => ball.participant.id !== payload.winnerId && ball.x < winnerBall.x) ??
    balls.find((ball) => ball.participant.id !== payload.winnerId) ??
    winnerBall;

  const railStartX = 430;
  const clawTopY = 96;
  const firstAttemptLift = { x: firstAttemptBall.x, y: 152 };
  const firstAttemptRelease = { x: 612, y: 244 };
  const firstDropTarget = { x: firstAttemptBall.x + 16, y: firstAttemptBall.y + 20 };
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

  if (progress < 0.54) {
    const descendY = clawTopY + lower1 * (firstAttemptBall.y - 104);
    clawX = progress < 0.4 ? lerp(railStartX, firstAttemptBall.x, aim1) : lerp(firstAttemptLift.x, firstAttemptRelease.x, easeInOutCubic(carry1));
    clawY = progress < 0.28 ? descendY : progress < 0.4 ? lerp(firstAttemptBall.y - 32, firstAttemptLift.y, lift1) : firstAttemptLift.y;
    close = progress < 0.24 ? 0 : progress < 0.28 ? close1 : 1;
    if (progress >= 0.28) {
      carriedBall = firstAttemptBall;
      carriedX = clawX;
      carriedY = clawY + 38;
    }
  } else if (progress < 0.64) {
    clawX = firstAttemptRelease.x;
    clawY = firstAttemptLift.y;
    close = 1 - drop1;
    floatingBall = {
      ball: firstAttemptBall,
      x: lerp(firstAttemptRelease.x, firstDropTarget.x, easeInOutCubic(drop1)),
      y: lerp(firstAttemptRelease.y + 38, firstDropTarget.y, drop1 * drop1),
      highlighted: false
    };
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
    drawMarble(ctx, floatingBall.x, floatingBall.y, floatingBall.ball.r, floatingBall.ball.color, floatingBall.ball.participant, floatingBall.highlighted, time * 2);
  }

  drawClaw(ctx, clawX, clawY, close, progress);

  if (carriedBall) {
    drawMarble(ctx, carriedX, carriedY, carriedBall.r, carriedBall.color, carriedBall.participant, carriedBall.index === winnerBall.index && progress > 0.97, time * 2);
  }

  drawPrizeBay(ctx, progress);
  if (progress > 0.996) {
    drawConfetti(ctx, time, progress);
    drawWinnerPopup(ctx, winnerBall.participant.name, payload.combination.label, smoothstep(0.996, 1, progress));
  }
}

function drawMachineCabinet(ctx: CanvasRenderingContext2D) {
  ctx.save();
  const back = ctx.createLinearGradient(100, 60, 744, 360);
  back.addColorStop(0, "#161524");
  back.addColorStop(1, "#242239");
  ctx.fillStyle = back;
  roundRect(ctx, 86, 54, 658, 318, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(157,150,214,.55)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "rgba(237,232,220,.72)";
  ctx.beginPath();
  ctx.moveTo(122, 346);
  ctx.lineTo(744, 346);
  ctx.lineTo(710, 392);
  ctx.lineTo(92, 392);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(13,13,24,.62)";
  ctx.fillRect(104, 78, 620, 258);
  ctx.fillStyle = "rgba(188,196,214,.18)";
  ctx.fillRect(122, 92, 584, 2);
  ctx.fillStyle = "rgba(188,196,214,.22)";
  roundRect(ctx, 114, 72, 590, 16, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(14,14,27,.95)";
  roundRect(ctx, 748, 228, 112, 156, 9);
  ctx.fill();
  ctx.strokeStyle = "rgba(7,7,7,.65)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#d8b55f";
  roundRect(ctx, 740, 216, 128, 20, 4);
  ctx.fill();
  label(ctx, "ЗОНА ПОБЕДИТЕЛЯ", 744, 205, "#d8b55f", 12, "900");
  ctx.restore();
}

function drawPrizeBay(ctx: CanvasRenderingContext2D, progress: number) {
  if (progress < 0.82) return;
  ctx.save();
  ctx.globalAlpha = smoothstep(0.82, 0.94, progress);
  ctx.fillStyle = "rgba(216,181,95,.12)";
  roundRect(ctx, 760, 274, 78, 60, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(216,181,95,.55)";
  ctx.stroke();
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

function drawClaw(ctx: CanvasRenderingContext2D, x: number, y: number, close: number, progress: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(188,196,214,.65)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(118, 82);
  ctx.lineTo(704, 82);
  ctx.stroke();

  ctx.fillStyle = "#263147";
  roundRect(ctx, x - 34, 62, 68, 34, 4);
  ctx.fill();
  ctx.fillStyle = "#46536c";
  roundRect(ctx, x - 22, 96, 44, 34, 4);
  ctx.fill();
  ctx.strokeStyle = "#bcc4d6";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, 96);
  ctx.lineTo(x, y);
  ctx.stroke();

  const spread = lerp(30, 15, close);
  ctx.strokeStyle = progress > 0.42 ? "#d8b55f" : "#bcc4d6";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - spread, y + 38);
  ctx.moveTo(x, y);
  ctx.lineTo(x + spread, y + 38);
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 43);
  ctx.stroke();
  ctx.restore();
}
