import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/corsi")({
  head: () => ({ meta: [{ title: "Corsi — Materi_ali" }] }),
  component: () => (
    <div>
      <PageHeader title="Corsi" />
      <SectionCard><p className="text-sm text-muted-foreground">Gestione corsi e orari in arrivo nel prossimo passaggio.</p></SectionCard>
    </div>
  ),
});
