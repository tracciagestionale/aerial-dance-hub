import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/insegnanti")({
  head: () => ({ meta: [{ title: "Insegnanti — Materi_ali" }] }),
  component: () => (
    <div>
      <PageHeader title="Insegnanti" />
      <SectionCard><p className="text-sm text-muted-foreground">Gestione insegnanti e tariffe in arrivo.</p></SectionCard>
    </div>
  ),
});
