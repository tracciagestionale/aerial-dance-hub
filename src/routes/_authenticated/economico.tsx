import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/economico")({
  head: () => ({ meta: [{ title: "Economico — Materi_ali" }] }),
  component: () => (
    <div>
      <PageHeader title="Economico" />
      <SectionCard><p className="text-sm text-muted-foreground">Quote, pagamenti, compensi e ripartizione 30/70 arrivano nella fase 2.</p></SectionCard>
    </div>
  ),
});
