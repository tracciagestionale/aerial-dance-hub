import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Upload, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { studentsQuery, coursesQuery } from '@/lib/data';
import { useMe } from '@/lib/session';
import { normalize, parseCsv, parseAmount, parseImportDate, paymentKey } from '@/lib/imports';
import { readSheet } from '@/lib/imports.functions';
import { todayRome } from '@/lib/dates';
import { PageHeader } from '@/components/app/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Route = createFileRoute('/_authenticated/importazioni')({
  head: () => ({ meta: [{ title: 'Importazioni — Materi_ali' }, { name: 'description', content: 'Importazione controllata di allieve e bonifici da CSV e Google Sheets.' }, { property: 'og:title', content: 'Importazioni — Materi_ali' }, { property: 'og:description', content: 'Anteprima e controllo dei doppioni per allieve e bonifici.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ImportPage,
});
const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm';
type Preview = { row: number; label: string; error: string; duplicate: boolean; selected: boolean; studentId: string; candidates: string[]; payload: Record<string, string | number> };
const studentFields = [['first_name', 'Nome *'], ['last_name', 'Cognome *'], ['course', 'Corso *'], ['code', 'Codice allieva'], ['birth_date', 'Data di nascita'], ['email', 'Email'], ['phone', 'Telefono']];
const paymentFields = [['paid_on', 'Data *'], ['amount', 'Importo *'], ['reference', 'Causale / riferimento'], ['code', 'Codice allieva'], ['name', 'Nome completo allieva']];
function ImportPage() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.isOwner) return <p role="alert">Importazioni riservate alla responsabile.</p>;
  return <ImportWizard />;
}
function ImportWizard() {
  const { data: students = [], isPending: pendingStudents, isError: studentsError } = useQuery(studentsQuery);
  const { data: courses = [], isPending: pendingCourses, isError: coursesError } = useQuery(coursesQuery);
  const qc = useQueryClient();
  const fetchSheet = useServerFn(readSheet);
  const [kind, setKind] = useState('students');
  const [source, setSource] = useState('csv');
  const [grid, setGrid] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview[]>([]);
  const [url, setUrl] = useState('');
  const [range, setRange] = useState('Foglio1!A1:Z1001');
  const [start, setStart] = useState(todayRome());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fields = kind === 'students' ? studentFields : paymentFields;
  const reset = () => { setGrid([]); setPreview([]); setMapping({}); setResult(null); setError(''); };
  function load(rows: string[][]) {
    setGrid(rows); setPreview([]); setResult(null); setError('');
    const next: Record<string, string> = {};
    for (const [key, label] of fields) {
      const aliases: Record<string, string[]> = { first_name: ['nome', 'first name'], last_name: ['cognome', 'last name'], course: ['corso'], code: ['codice', 'codice allieva'], paid_on: ['data', 'data pagamento'], amount: ['importo', 'importo €'], reference: ['causale', 'riferimento'], name: ['allieva', 'nome completo'], birth_date: ['data di nascita'], email: ['email'], phone: ['telefono'] };
      const idx = rows[0]?.findIndex(h => [key, label?.replace(' *', ''), ...(aliases[key ?? ''] ?? [])].some(a => a && normalize(a) === normalize(h))) ?? -1;
      if (key && idx >= 0) next[key] = String(idx);
    }
    setMapping(next);
  }
  async function buildPreview() {
    setBusy(true); setError('');
    try {
      const enrollmentStart = kind === 'students' ? parseImportDate(start) : start;
      const seen = new Set<string>();
      const rows: Preview[] = [];
      for (const [index, cells] of grid.slice(1).entries()) {
        const get = (key: string) => mapping[key] === undefined || mapping[key] === '' ? '' : (cells[Number(mapping[key])] ?? '').trim();
        const row: Preview = { row: index + 2, label: '', error: '', duplicate: false, selected: true, studentId: '', candidates: [], payload: {} };
        try {
          if (kind === 'students') {
            const first = get('first_name'), last = get('last_name');
            if (!first || !last || first.length > 100 || last.length > 100) throw new Error('Nome e cognome obbligatori (massimo 100 caratteri)');
            const courseMatches = courses.filter(c => c.active && (normalize(c.name) === normalize(get('course')) || c.id === get('course')));
            if (courseMatches.length !== 1) throw new Error('Corso non riconosciuto: ' + get('course'));
            const course = courseMatches[0];
            if (!course) throw new Error('Corso non trovato');
            const matches = students.filter(s => (get('code') && s.code === get('code')) || (normalize(s.first_name) === normalize(first) && normalize(s.last_name) === normalize(last)));
            row.candidates = matches.map(s => s.id);
            row.duplicate = matches.length > 0 || seen.has(normalize(first + ' ' + last));
            seen.add(normalize(first + ' ' + last));
            row.label = `${last} ${first} · ${course.name}`;
            if (get('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('email'))) throw new Error('Email non valida');
            row.payload = { first_name: first, last_name: last, course_id: course.id, code: get('code'), birth_date: get('birth_date') ? parseImportDate(get('birth_date')) : '', email: get('email'), phone: get('phone'), start_date: enrollmentStart };
          } else {
            const date = parseImportDate(get('paid_on')), amount = parseAmount(get('amount')), reference = get('reference');
            if (reference.length > 500) throw new Error('Riferimento troppo lungo');
            const key = await paymentKey(date, amount, reference);
            row.duplicate = seen.has(key); seen.add(key);
            const name = normalize(get('name'));
            const matches = students.filter(s => (get('code') && s.code === get('code')) || (name && [normalize(`${s.first_name} ${s.last_name}`), normalize(`${s.last_name} ${s.first_name}`)].includes(name)) || (normalize(reference).includes(normalize(`${s.first_name} ${s.last_name}`)) || normalize(reference).includes(normalize(`${s.last_name} ${s.first_name}`))));
            row.candidates = matches.map(s => s.id);
            row.studentId = matches.length === 1 ? matches[0]?.id ?? '' : '';
            row.label = `${date} · ${amount.toFixed(2)} € · ${reference}`;
            row.payload = { paid_on: date, amount, reference, import_key: key };
          }
        } catch (e) { row.error = e instanceof Error ? e.message : 'Riga non valida'; }
        row.selected = !row.error && !row.duplicate;
        rows.push(row);
      }
      if (kind === 'payments') {
        const dates = rows.filter(r => !r.error).map(r => String(r.payload['paid_on'])).sort();
        if (dates[0]) {
          const { data, error: err } = await supabase.from('payments').select('paid_on, amount, reference, import_key').gte('paid_on', dates[0]).lte('paid_on', dates[dates.length - 1] ?? dates[0]);
          if (err) throw err;
          for (const r of rows) if (data.some(p => p.import_key === r.payload['import_key'] || (p.paid_on === r.payload['paid_on'] && Number(p.amount) === r.payload['amount'] && normalize(p.reference ?? '') === normalize(String(r.payload['reference']))))) { r.duplicate = true; r.selected = false; }
        }
      }
      setPreview(rows);
    } catch (e) { setError(e instanceof Error ? e.message : 'Anteprima non disponibile'); }
    finally { setBusy(false); }
  }
  async function commit() {
    setBusy(true); setError('');
    try {
      const rows = preview.filter(r => r.selected && !r.error && (!r.duplicate || r.studentId)).map(r => ({ ...r.payload, student_id: r.studentId || null }));
      const { data, error: err } = await supabase.rpc('import_data', { _kind: kind, _rows: rows });
      if (err) throw err;
      setResult(data as { imported: number; skipped: number });
      await Promise.all([qc.invalidateQueries({ queryKey: ['students'] }), qc.invalidateQueries({ queryKey: ['fin'] })]);
      toast.success('Importazione completata');
    } catch (e) { setError('Nessuna riga salvata: ' + (e instanceof Error ? e.message : 'Importazione non riuscita')); }
    finally { setBusy(false); }
  }
  const selected = preview.filter(r => r.selected && !r.error).length;
  return <div className="space-y-6">
    <PageHeader title="Importazioni" tone="people" actions={<Button asChild variant="ghost"><Link to="/oggi"><ArrowLeft className="h-4 w-4" /> Panoramica</Link></Button>} />
    <div className="flex flex-wrap gap-4"><Tabs value={kind} onValueChange={v => { setKind(v); reset(); }}><TabsList><TabsTrigger value="students">Allieve</TabsTrigger><TabsTrigger value="payments">Bonifici</TabsTrigger></TabsList></Tabs><Tabs value={source} onValueChange={v => { setSource(v); reset(); }}><TabsList><TabsTrigger value="csv">CSV</TabsTrigger><TabsTrigger value="sheets">Google Sheets</TabsTrigger></TabsList></Tabs></div>
    {source === 'csv' ? <label className="block rounded-lg border border-dashed p-6"><span className="mb-3 flex items-center gap-2 font-medium"><Upload className="h-5 w-5 text-people" /> File CSV</span><Input aria-label="File CSV" type="file" accept=".csv,text/csv" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 5000000) throw new Error('File troppo grande (massimo 5 MB)'); load(parseCsv(await file.text())); } catch (e) { setError(e instanceof Error ? e.message : 'File non leggibile'); } }} /></label> : <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]"><label className="text-sm">Indirizzo del foglio<Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></label><label className="text-sm">Intervallo<Input value={range} onChange={e => setRange(e.target.value)} /></label><Button className="self-end" disabled={busy || !url || !range} onClick={async () => { setBusy(true); setError(''); try { load(await fetchSheet({ data: { url, range } })); } catch (e) { setError(e instanceof Error ? e.message : 'Foglio non disponibile'); } finally { setBusy(false); } }}>Leggi foglio</Button></div>}
    {error && <p role="alert" className="break-words rounded-md bg-alert-soft p-3 text-sm text-alert">{error}</p>}
    {(studentsError || coursesError) && <p role="alert" className="text-alert">Anagrafiche non disponibili: ricarica la pagina prima di importare.</p>}
    {grid.length > 0 && !result && <section className="border-t pt-5"><h2 className="mb-3 text-lg font-semibold">Colonne · {grid.length - 1} righe</h2><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{fields.map(([key, label]) => key && <label key={key} className="text-sm">{label}<select aria-label={label} className={selectClass} value={mapping[key] ?? ''} onChange={e => { setMapping({ ...mapping, [key]: e.target.value }); setPreview([]); }}><option value="">Non importare</option>{grid[0]?.map((h, i) => <option key={i} value={i}>{h || `Colonna ${i + 1}`}</option>)}</select></label>)}{kind === 'students' && <label className="text-sm">Inizio iscrizione<Input aria-label="Inizio iscrizione" type="date" value={start} onChange={e => { setStart(e.target.value); setPreview([]); }} /></label>}</div><Button className="mt-4" disabled={busy || pendingStudents || pendingCourses || studentsError || coursesError || (kind === 'students' ? ['first_name', 'last_name', 'course'] : ['paid_on', 'amount']).some(k => mapping[k] === undefined || mapping[k] === '')} onClick={buildPreview}>Controlla anteprima</Button></section>}
    {preview.length > 0 && !result && <section className="border-t pt-5"><h2 className="mb-3 text-lg font-semibold">Anteprima · {selected} selezionate · {preview.filter(r => r.error).length} errori · {preview.filter(r => r.duplicate).length} doppioni</h2><div className="space-y-2">{preview.map((r, i) => <article key={r.row} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"><input type="checkbox" aria-label={`Importa riga ${r.row}`} checked={r.selected} disabled={busy || !!r.error || (r.duplicate && !r.studentId)} onChange={e => setPreview(preview.map((p, j) => j === i ? { ...p, selected: e.target.checked } : p))} /><div className="min-w-0 flex-1 text-sm"><div className="break-words">{r.row}. {r.label}</div><div className={r.error || r.duplicate ? 'text-alert' : 'text-muted-foreground'}>{r.error || (r.duplicate ? 'Possibile doppione · escluso' : kind === 'payments' && !r.studentId ? 'Non attribuito' : 'Pronta')}</div></div>{!r.error && (kind === 'payments' || r.candidates.length > 0) && <select aria-label={`Allieva riga ${r.row}`} className="h-10 max-w-full rounded-md border bg-background px-2 text-sm sm:w-64" value={r.studentId} disabled={busy} onChange={e => setPreview(preview.map((p, j) => j === i ? { ...p, studentId: e.target.value, selected: !!e.target.value || !p.duplicate } : p))}><option value="">{kind === 'payments' ? 'Non attribuito' : 'Salta doppione'}</option>{students.filter(s => kind === 'payments' || r.candidates.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.last_name} {s.first_name} · {s.code}</option>)}</select>}</article>)}</div><Button className="mt-4" disabled={busy || selected === 0} onClick={commit}>{busy ? 'Importazione…' : `Conferma importazione (${selected})`}</Button></section>}
    {result && <section role="status" className="rounded-lg border bg-attend-soft p-5"><h2 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-attend" /> Importazione completata</h2><p className="mt-2 text-sm">{result.imported} righe importate · {result.skipped} doppioni saltati · {preview.filter(r => !r.selected).length} righe escluse.</p><div className="mt-4 flex gap-2"><Button variant="outline" onClick={reset}>Nuova importazione</Button><Button asChild><Link to={kind === 'students' ? '/allieve' : '/economico'}>Apri {kind === 'students' ? 'allieve' : 'pagamenti'}</Link></Button></div></section>}
  </div>;
}