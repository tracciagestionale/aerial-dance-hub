import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Home, Users, BookOpen, GraduationCap, Wallet, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

type NavItem = { to: string; label: string; icon: typeof Home; tone: string; owner?: boolean };
const NAV: NavItem[] = [
  { to: "/oggi", label: "Panoramica", icon: Home, tone: "text-primary" },
  { to: "/allieve", label: "Allieve", icon: Users, tone: "text-people" },
  { to: "/corsi", label: "Corsi", icon: BookOpen, tone: "text-people", owner: true },
  { to: "/registro", label: "Presenze", icon: CalendarCheck, tone: "text-attend" },
  { to: "/insegnanti", label: "Insegnanti", icon: GraduationCap, tone: "text-settings", owner: true },
  { to: "/economico", label: "Economico", icon: Wallet, tone: "text-money", owner: true },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings, tone: "text-settings", owner: true },
];

function Shell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const items = NAV.filter((n) => !n.owner || me?.isOwner).map((n) =>
    n.to === "/oggi" && !me?.isOwner ? { ...n, label: "Oggi" } : n,
  );
  const mobileItems = items.filter((n) => ["/oggi", "/allieve", "/registro", "/economico", "/corsi"].includes(n.to)).slice(0, 5);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const noRole = me && !me.isOwner && !me.isTeacher;

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="px-2 py-3 text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Materi<span className="text-primary">_</span>ali
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent" }}
            >
              <n.icon className={cn("h-4 w-4", n.tone)} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-3 text-xs text-muted-foreground">
          <div className="truncate px-2">{me?.teacherName ?? me?.email}</div>
          <div className="px-2">{me?.isOwner ? "Responsabile" : "Insegnante"}</div>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent">
            <LogOut className="h-3.5 w-3.5" /> Esci
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Materi<span className="text-primary">_</span>ali
        </span>
        <button onClick={signOut} className="flex items-center gap-1 text-sm text-muted-foreground">
          <LogOut className="h-4 w-4" /> Esci
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
        {noRole ? (
          <div className="mx-auto max-w-md rounded-xl bg-alert-soft p-6 text-sm">
            Il tuo account non è ancora collegato a un'insegnante. Chiedi ad Arianna di inserire la tua email nella scheda Insegnanti.
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0,1fr))` }}>
        {mobileItems.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "text-foreground" }}>
            <n.icon className={cn("h-5 w-5", n.tone)} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
