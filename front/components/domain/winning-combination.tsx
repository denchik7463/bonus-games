import { motion } from "framer-motion";
import { WinningCombination } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function WinningCombinationBlock({ combination, compact = false }: { combination: WinningCombination; compact?: boolean }) {
  return (
    <div className={cn("winning-combo-shell relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,rgba(255,205,24,0.09),rgba(255,255,255,0.03)_44%,rgba(9,10,14,0.92))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055)]", compact && "p-3.5")}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,205,24,0.12),transparent_64%)]" />
      <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Выигрышная комбинация</p>
          <h3 className={cn("font-black tracking-[-0.03em] text-platinum", compact ? "text-base" : "text-2xl")}>{combination.label}</h3>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-smoke surface-inset">{rarityLabel(combination.rarity)}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {combination.tokens.map((token, index) => (
          <motion.div
            key={`${combination.id}-${token}`}
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
            className="winning-combo-token flex aspect-square items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,205,24,0.1),rgba(8,9,12,0.98))] text-center text-xs font-black text-platinum shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{ color: combination.palette[index % combination.palette.length] }}
          >
            {token}
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
}

function rarityLabel(rarity: WinningCombination["rarity"]) {
  return {
    mythic: "особая",
    signature: "фирменная",
    rare: "редкая"
  }[rarity];
}
