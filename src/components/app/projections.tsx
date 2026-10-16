import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { TrendingUp, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { computeSplit } from '@/lib/finance';
import { euro, formatDateIt, todayRome } from '@/lib/dates';
import { Button } from '@/components/ui/button';

type Projection = { month: string; fees: number; excluded: number; teacherPay: number };
export function EconomicProjections() {
  const month = todayRome().slice(0, 7);
  const query = useQuery({ queryKey: ['fin', 'projections', month], queryFn: async () => {
    const [year = 2026, m = 1] = month.split('-').map(Number);
    return Promise.all([1, 2].map(async offset => {
      const date = new Date(Date.UTC(year, m - 1 + offset, 1)).toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc('project_finance', { _month: date });
      if (error) throw error;
      return data as unknown as Projection;
    }));
  } });
  return <section className="border-t pt-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-money" /> Proiezioni economiche</h2><Button asChild variant="outline"><Link to="/importazioni"><Upload className="h-4 w-4" /> Importa dati</Link></Button></div>
    {query.isPending ? <p className="text-sm text-muted-foreground">Calcolo delle previsioni…</p> : query.isError ? <div role="alert" className="text-sm text-alert">Previsioni non disponibili. <Button variant="outline" onClick={() => query.refetch()}>Riprova</Button></div> : <div className="grid gap-4 md:grid-cols-2">{query.data.map(p => {
      const split = computeSplit([{ amount: Number(p.fees) - Number(p.excluded), received_by: 'palestra', excluded: false }, { amount: Number(p.excluded), received_by: 'palestra', excluded: true }], Number(p.teacherPay), 0);
      return <article key={p.month} className="rounded-lg border bg-card p-5"><h3 className="mb-3 font-semibold capitalize">{formatDateIt(p.month, { month: 'long', year: 'numeric' })}</h3><dl className="space-y-2 text-sm">{[['Quote previste', split.collected], ['Quota palestra', split.gym], ['Quota Materi_ali', split.materiali], ['Compensi previsti', split.teacherPay], ['Margine prima delle spese', split.result]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{euro(Number(value))}</dd></div>)}</dl></article>;
    })}</div>}
    <p className="mt-3 text-xs text-muted-foreground">Stima a incasso completo, non incassi effettivi. Quote secondo iscrizioni e regole in vigore; compensi secondo calendario e tariffe. Assistenze non ancora registrate e altre spese escluse. Nessuna quota viene creata.</p>
  </section>;
}