"use client";

import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { DemoRole } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/app-store";

export function AccessGuard({ roles, children, title }: { roles: DemoRole[]; children: React.ReactNode; title: string }) {
  const user = useAppStore((state) => state.user);
  if (roles.includes(user.role)) return <>{children}</>;

  return (
    <Panel className="surface-solid border-0 shadow-none">
      <ShieldAlert className="mb-4 h-8 w-8 text-ember" />
      <h1 className="text-3xl font-black text-platinum">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Для этого раздела нужен другой уровень доступа.</p>
      <ButtonLink href="/lobby" className="mt-5">Вернуться в лобби</ButtonLink>
    </Panel>
  );
}
