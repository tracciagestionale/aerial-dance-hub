import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions, tone = "primary" }: { title: string; subtitle?: ReactNode; actions?: ReactNode; tone?: "primary" | "people" | "attend" | "money" | "settings" }) {
  const bar = { primary: "bg-primary", people: "bg-people", attend: "bg-attend", money: "bg-money", settings: "bg-settings" }[tone];
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className={cn("mb-2 h-1 w-10 rounded-full", bar)} />
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, children, className, tone, right }: { title?: ReactNode; children: ReactNode; className?: string; tone?: "people" | "attend" | "money" | "alert" | "settings"; right?: ReactNode }) {
  const soft = tone ? { people: "bg-people-soft", attend: "bg-attend-soft", money: "bg-money-soft", alert: "bg-alert-soft", settings: "bg-settings-soft" }[tone] : "bg-card";
  return (
    <section className={cn("rounded-2xl border p-4 shadow-sm md:p-5", soft, className)}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function DemoBadge() {
  return <span className="rounded-full bg-settings-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-settings">Demo</span>;
}

export function Stat({ label, value, tone = "people" }: { label: string; value: ReactNode; tone?: "people" | "attend" | "money" | "alert" | "settings" }) {
  const text = { people: "text-people", attend: "text-attend", money: "text-money", alert: "text-alert", settings: "text-settings" }[tone];
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold", text)} style={{ fontFamily: "var(--font-display)" }}>{value}</div>
    </div>
  );
}
