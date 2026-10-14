import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Materi_ali — Gestionale della scuola di danza aerea" },
      { name: "description", content: "Allieve, corsi, presenze, compensi e quote della scuola di danza aerea Materi_ali, anche dal telefono." },
      { property: "og:title", content: "Materi_ali — Gestionale danza aerea" },
      { property: "og:description", content: "Allieve, corsi, presenze e quote in un'unica app semplice da usare in sala." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/oggi", replace: true });
    });
  }, [navigate]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-secondary blur-3xl" />
      <div className="relative max-w-lg">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Scuola di danza aerea</p>
        <h1 className="mt-4 text-5xl font-semibold text-foreground sm:text-6xl">
          Materi<span className="text-primary">_</span>ali
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Allieve, corsi, registro presenze e quote mensili. Pensato per essere usato dal telefono, anche durante la lezione.
        </p>
        <Button asChild size="lg" className="mt-8 h-12 px-8 text-base">
          <Link to="/auth">Accedi</Link>
        </Button>
      </div>
    </main>
  );
}
