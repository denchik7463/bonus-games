import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("glass metal-border panel-grid rounded-[28px] p-5 md:p-6", className)}>{children}</section>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-3 brand-kicker">{eyebrow}</p> : null}
        <h2 className="text-balance text-3xl font-black leading-[1.02] tracking-[-0.045em] text-platinum md:text-4xl">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-smoke">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
