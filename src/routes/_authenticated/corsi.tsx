import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/corsi")({
  head: () => pageMeta("Corsi", "Corsi e calendario della scuola di danza aerea Materi_ali."),
  component: () => (
    <div>
      <PageHeader title="Corsi" />
      <SectionCard><p className="text-sm text-muted-foreground">Gestione corsi e orari in arrivo nel prossimo passaggio.</p></SectionCard>
    </div>
  ),
});
