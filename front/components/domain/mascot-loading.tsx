"use client";

import { ChinchillaRunner } from "@/components/mascots/chinchilla-runner";

export function MascotLoading({
  title = "Шиншилла очень старается...",
  description = "Подгружаем данные и собираем красивый экран."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="surface-solid relative min-h-[260px] overflow-hidden rounded-[30px] p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-85">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.16),transparent_62%)]" />
        <div className="absolute right-[-8rem] bottom-[-10rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(77,215,200,0.10),transparent_64%)]" />
      </div>
      <div className="relative max-w-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Загрузка</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-platinum">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-smoke">{description}</p>
      </div>
      <div className="relative mt-10 h-24 overflow-hidden rounded-[24px] bg-black/15">
        <ChinchillaRunner bottom={-18} />
      </div>
    </section>
  );
}
