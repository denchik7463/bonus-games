"use client";

import { useEffect, useMemo, useRef } from "react";
import { GameMode } from "@/lib/domain/types";
import { drawCardsScene } from "@/components/game/cards/scene";
import { drawClawScene } from "@/components/game/claw/scene";
import { drawDuelScene } from "@/components/game/duel/scene";
import { drawRaceScene } from "@/components/game/race/scene";
import { drawBackdrop, drawCaption, scenePhase, width, height, clamp } from "@/components/game/shared/primitives";
import { Payload, SceneProps } from "@/components/game/shared/types";

const durationByMode: Record<GameMode, number> = {
  "arena-sprint": 12400,
  "duel-clash": 9800,
  "claw-machine": 20800,
  "slot-reveal": 9800
};

export function ArenaSprintScene({ roundId, mode, participants, winnerId, combination }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef(0);
  const payloadRef = useRef<Payload>({ roundId, mode, participants, winnerId, combination, signature: "" });
  const signature = useMemo(
    () => `${roundId}:${mode}:${winnerId}:${combination.id}:${participants.map((participant) => `${participant.id}:${participant.hasBoost}`).join("|")}`,
    [roundId, mode, winnerId, combination.id, participants]
  );

  useEffect(() => {
    payloadRef.current = { roundId, mode, participants, winnerId, combination, signature };
    startRef.current = performance.now();
  }, [roundId, mode, participants, winnerId, combination, signature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (now: number) => {
      const payload = payloadRef.current;
      const duration = durationByMode[payload.mode];
      const progress = clamp((now - startRef.current) / duration, 0, 1);
      ctx.clearRect(0, 0, width, height);
      drawBackdrop(ctx, payload.mode);
      if (payload.mode === "claw-machine") drawClawScene(ctx, payload, progress, now / 1000);
      else if (payload.mode === "duel-clash") drawDuelScene(ctx, payload, progress, now / 1000);
      else if (payload.mode === "slot-reveal") drawCardsScene(ctx, payload, progress, now / 1000);
      else drawRaceScene(ctx, payload, progress, now / 1000);
      drawCaption(ctx, payload.mode, scenePhase(progress));
      raf = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame((now) => {
      startRef.current = now;
      render(now);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="overflow-hidden bg-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_rgba(0,0,0,0.55)]">
      <canvas ref={canvasRef} width={width} height={height} aria-label="Визуальная трансляция розыгрыша" />
    </div>
  );
}
