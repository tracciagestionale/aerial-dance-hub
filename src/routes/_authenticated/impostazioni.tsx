import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => ({ meta: [{ title: "Impostazioni — Materi_ali" }] }),
  component: () => (
    <div>
      <PageHeader title="Impostazioni" />
      <SectionCard><p className="text-sm text-muted-foreground">Importazioni ed esportazioni arrivano nella fase 3.</p></SectionCard>
    </div>
  ),
});
