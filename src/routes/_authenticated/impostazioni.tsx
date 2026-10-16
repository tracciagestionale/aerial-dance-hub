import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => pageMeta("Impostazioni", "Strumenti di importazione e impostazioni della scuola Materi_ali."),
  component: () => (
    <div>
      <PageHeader title="Impostazioni" />
      <Button asChild><Link to="/importazioni">Importazioni CSV e Google Sheets</Link></Button>
    </div>
  ),
});
