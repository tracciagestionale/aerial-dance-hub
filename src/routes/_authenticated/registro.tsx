import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/registro")({
  head: () => pageMeta("Presenze", "Registri delle presenze della scuola Materi_ali."),
  component: () => (
    <div>
      <PageHeader title="Presenze" />
      <SectionCard><p className="text-sm text-muted-foreground">Il registro a griglia mensile arriva nel prossimo passaggio. Apri le lezioni dalla Panoramica.</p></SectionCard>
    </div>
  ),
});
