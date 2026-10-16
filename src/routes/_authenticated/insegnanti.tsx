import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/insegnanti")({
  head: () => pageMeta("Insegnanti", "Insegnanti e tariffe della scuola Materi_ali."),
  component: () => (
    <div>
      <PageHeader title="Insegnanti" />
      <SectionCard><p className="text-sm text-muted-foreground">Gestione insegnanti e tariffe in arrivo.</p></SectionCard>
    </div>
  ),
});
