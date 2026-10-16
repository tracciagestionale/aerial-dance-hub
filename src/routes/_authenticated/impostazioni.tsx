import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/page";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => ({ meta: [{ title: "Impostazioni — Materi_ali" }] }),
  component: () => (
    <div>
      <PageHeader title="Impostazioni" />
      <Button asChild><Link to="/importazioni">Importazioni CSV e Google Sheets</Link></Button>
    </div>
  ),
});
