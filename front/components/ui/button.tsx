import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-extrabold tracking-[-0.01em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-gold text-ink shadow-glow hover:bg-[#ffd84a]",
        variant === "secondary" && "border border-white/10 bg-white/[0.06] text-platinum hover:border-gold/30 hover:bg-white/[0.1] hover:text-white",
        variant === "ghost" && "text-smoke hover:bg-white/[0.06] hover:text-platinum",
        variant === "danger" && "bg-ember/90 text-platinum hover:bg-[#f05d48]",
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  href,
  children
}: {
  className?: string;
  variant?: ButtonProps["variant"];
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-extrabold tracking-[-0.01em] transition duration-200",
        variant === "primary" && "bg-gold text-ink shadow-glow hover:bg-[#ffd84a]",
        variant === "secondary" && "border border-white/10 bg-white/[0.06] text-platinum hover:border-gold/30 hover:bg-white/[0.1] hover:text-white",
        variant === "ghost" && "text-smoke hover:bg-white/[0.06] hover:text-platinum",
        variant === "danger" && "bg-ember/90 text-platinum hover:bg-[#f05d48]",
        className
      )}
    >
      {children}
    </Link>
  );
}
