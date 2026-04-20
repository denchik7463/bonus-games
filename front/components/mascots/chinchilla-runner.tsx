"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function ChinchillaRunner({
  className = "",
  bottom = 18
}: {
  className?: string;
  bottom?: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const style = useMemo(() => ({ ["--chin-bottom" as never]: `${bottom}px` }), [bottom]);

  return (
    <div
      aria-hidden
      className={[
        "chin-runner",
        reducedMotion ? "chin-runner--reduced" : "",
        className
      ].join(" ")}
      style={style}
    >
      <div className="chin-runner__track">
        <div className="chin-runner__shadow" />
        <Image
          src="/mascots/chinchilla.png"
          alt=""
          className="chin-runner__sprite"
          width={140}
          height={140}
          priority
        />
        <div className="chin-runner__tag">
          <span className="chin-runner__tagText">Бежит за удачей</span>
        </div>
      </div>
    </div>
  );
}
