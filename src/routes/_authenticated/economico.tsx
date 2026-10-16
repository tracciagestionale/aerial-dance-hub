import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SectionCard, Stat } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/lib/session";
import { studentsQuery, teachersQuery } from "@/lib/data";
import { euro, formatDateIt, todayRome } from "@/lib/dates";
import { computeSplit, monthEnd, monthStart, round } from "@/lib/finance";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/economico")({
  head: () => pageMeta("Economico", "Quote, pagamenti, compensi e ripartizione con la palestra Materi_ali."),
  component: Economico,
});

const sel = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const KIND: Record<string, string> = { base: "Quota", gare: "Gare" };
const RECV: Record<string, string> = { palestra: "Conto palestra", arianna: "Arianna", insegnante: "Insegnante" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-medium text-muted-foreground">{label}<div className="mt-1">{children}</div></label>;
}

function Economico() {
  const { data: me } = useMe();
  if (!me) return null;
  return me.isOwner ? <OwnerView /> : <TeacherPayments />;
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["fin"] });
}

function OwnerView() {
  const [month, setMonth] = useState(todayRome().slice(0, 7));
  return (
    <div>
      <PageHeader title="Economico" tone="money" subtitle="Quote, pagamenti, compensi e ripartizione 30/70"
        actions={<Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />} />
      <Tabs defaultValue="riepilogo">
        <TabsList className="mb-4 flex h-auto flex-wrap">
          <TabsTrigger value="riepilogo">Riepilogo</TabsTrigger>
          <TabsTrigger value="quote">Quote</TabsTrigger>
          <TabsTrigger value="pagamenti">Pagamenti</TabsTrigger>
          <TabsTrigger value="compensi">Compensi</TabsTrigger>
          <TabsTrigger value="regole">Regole quote</TabsTrigger>
        </TabsList>
        <TabsContent value="riepilogo"><Summary month={month} /></TabsContent>
        <TabsContent value="quote"><Charges month={month} /></TabsContent>
        <TabsContent value="pagamenti"><Payments month={month} /></TabsContent>
        <TabsContent value="compensi"><Compensi month={month} /></TabsContent>
        <TabsContent value="regole"><Rules month={month} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- data ---------- */
function useStaff(month: string) {
  return useQuery({
    queryKey: ["fin", "staff", month],
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_staff")
        .select("id, teacher_id, role, hours, rate_applied, lessons!inner(lesson_date, status, course_id, courses(name))")
        .gte("lessons.lesson_date", monthStart(month)).lte("lessons.lesson_date", monthEnd(month)).eq("lessons.status", "svolta");
      if (error) throw error;
      return data;
    },
  });
}
function useMonthPayments(month: string) {
  return useQuery({
    queryKey: ["fin", "payments", month],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments")
        .select("*, students(first_name, last_name, exclude_from_split), payment_allocations(amount)")
        .gte("paid_on", monthStart(month)).lte("paid_on", monthEnd(month)).order("paid_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
function useMonthMisc(month: string) {
  return useQuery({
    queryKey: ["fin", "misc", month],
    queryFn: async () => {
      const [po, tr, ex, ch] = await Promise.all([
        supabase.from("teacher_payouts").select("*").eq("month", monthStart(month)),
        supabase.from("gym_transfers").select("*").gte("transfer_date", monthStart(month)).lte("transfer_date", monthEnd(month)).order("transfer_date"),
        supabase.from("expenses").select("*").gte("spent_on", monthStart(month)).lte("spent_on", monthEnd(month)).order("spent_on"),
        supabase.from("charges").select("amount, payment_allocations(amount)").eq("month", monthStart(month)),
      ]);
      for (const r of [po, tr, ex, ch]) if (r.error) throw r.error;
      return { payouts: po.data!, transfers: tr.data!, expenses: ex.data!, charges: ch.data! };
    },
  });
}

/* ---------- Riepilogo ---------- */
function Summary({ month }: { month: string }) {
  const staff = useStaff(month).data ?? [];
  const pays = useMonthPayments(month).data ?? [];
  const misc = useMonthMisc(month).data;
  const inv = useInvalidate();
  const [tr, setTr] = useState({ amount: "", direction: "palestra_ad_arianna", transfer_date: todayRome(), reference: "" });
  const [exp, setExp] = useState({ amount: "", description: "", spent_on: todayRome() });

  const teacherPay = staff.reduce((s, x) => s + Number(x.hours) * Number(x.rate_applied ?? 0), 0);
  const toA = misc?.transfers.filter((t) => t.direction === "palestra_ad_arianna").reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const toG = misc?.transfers.filter((t) => t.direction === "arianna_a_palestra").reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const split = computeSplit(pays.map((p) => ({ amount: Number(p.amount), received_by: p.received_by, excluded: !!p.students?.exclude_from_split })), teacherPay, toA, toG);
  const paidOut = misc?.payouts.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const expenses = misc?.expenses.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const due = misc?.charges.reduce((s, c) => s + Number(c.amount), 0) ?? 0;
  const dueGym = round(due * 0.3);

  async function addTransfer() {
    const { error } = await supabase.from("gym_transfers").insert({ ...tr, amount: Number(tr.amount) });
    if (error) { toast.error(error.message); return; }
    toast.success("Trasferimento registrato"); setTr({ ...tr, amount: "", reference: "" }); inv();
  }
  async function addExpense() {
    const { error } = await supabase.from("expenses").insert({ ...exp, amount: Number(exp.amount) });
    if (error) { toast.error(error.message); return; }
    toast.success("Spesa registrata"); setExp({ ...exp, amount: "", description: "" }); inv();
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Incassi effettivi del mese" tone="money">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Incassato" value={euro(split.collected)} tone="money" />
          <Stat label="Quota palestra (30%)" value={euro(split.gym)} tone="settings" />
          <Stat label="Quota Materi_ali (70%)" value={euro(split.materiali)} tone="money" />
          <Stat label="Compensi maturati" value={euro(split.teacherPay)} tone="alert" />
          <Stat label="Risultato prima delle spese" value={euro(split.result)} tone="attend" />
          <Stat label="Altre spese" value={euro(expenses)} tone="alert" />
          <Stat label="Risultato netto" value={euro(split.result - expenses)} tone="attend" />
          <Stat label="Compensi pagati" value={euro(paidOut)} tone="people" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">La ripartizione avviene sugli incassi, prima di detrarre i compensi. Le allieve escluse vanno al 100% a Materi_ali.</p>
      </SectionCard>

      <SectionCard title="Valori attesi (quote del mese)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Quote dovute" value={euro(due)} tone="money" />
          <Stat label="Di cui palestra (stima 30%)" value={euro(dueGym)} tone="settings" />
          <Stat label="Di cui Materi_ali (stima)" value={euro(due - dueGym)} tone="money" />
        </div>
      </SectionCard>

      <SectionCard title="Saldo con la palestra" right={<span className={split.balance >= 0 ? "text-sm font-semibold text-attend" : "text-sm font-semibold text-alert"}>
        {split.balance >= 0 ? `La palestra deve ${euro(split.balance)} ad Arianna` : `Arianna deve ${euro(-split.balance)} alla palestra`}</span>}>
        <p className="mb-3 text-xs text-muted-foreground">Calcolato su chi ha ricevuto i soldi: dal conto palestra spetta il 70% ad Arianna; dai contanti ricevuti da Arianna o insegnanti spetta il 30% alla palestra. Trasferimenti ricevuti: {euro(toA)}{toG ? `, versati alla palestra: ${euro(toG)}` : ""}.</p>
        <ul className="mb-3 divide-y text-sm">
          {misc?.transfers.map((t) => (
            <li key={t.id} className="flex justify-between py-1.5"><span>{formatDateIt(t.transfer_date, { day: "numeric", month: "short" })} · {t.direction === "palestra_ad_arianna" ? "Palestra → Arianna" : "Arianna → Palestra"} {t.reference && `· ${t.reference}`}</span><span>{euro(Number(t.amount))}</span></li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Field label="Data"><Input type="date" value={tr.transfer_date} onChange={(e) => setTr({ ...tr, transfer_date: e.target.value })} /></Field>
          <Field label="Importo €"><Input inputMode="decimal" value={tr.amount} onChange={(e) => setTr({ ...tr, amount: e.target.value })} /></Field>
          <Field label="Direzione"><select className={sel} value={tr.direction} onChange={(e) => setTr({ ...tr, direction: e.target.value })}><option value="palestra_ad_arianna">Palestra → Arianna</option><option value="arianna_a_palestra">Arianna → Palestra</option></select></Field>
          <Field label="Riferimento"><Input value={tr.reference} onChange={(e) => setTr({ ...tr, reference: e.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" disabled={!(Number(tr.amount) > 0)} onClick={addTransfer}>Registra trasferimento</Button></div>
        </div>
      </SectionCard>

      <SectionCard title="Altre spese">
        <ul className="mb-3 divide-y text-sm">
          {misc?.expenses.map((x) => (<li key={x.id} className="flex justify-between py-1.5"><span>{formatDateIt(x.spent_on, { day: "numeric", month: "short" })} · {x.description}</span><span>{euro(Number(x.amount))}</span></li>))}
        </ul>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Data"><Input type="date" value={exp.spent_on} onChange={(e) => setExp({ ...exp, spent_on: e.target.value })} /></Field>
          <Field label="Importo €"><Input inputMode="decimal" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} /></Field>
          <Field label="Descrizione"><Input value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" variant="outline" disabled={!(Number(exp.amount) > 0) || !exp.description} onClick={addExpense}>Aggiungi spesa</Button></div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------- Quote ---------- */
function Charges({ month }: { month: string }) {
  const inv = useInvalidate();
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["fin", "charges", month],
    queryFn: async () => {
      const { data, error } = await supabase.from("charges").select("*, students(first_name, last_name, code), payment_allocations(amount)").eq("month", monthStart(month));
      if (error) throw error;
      return data.sort((a, b) => `${a.students?.last_name}${a.students?.first_name}`.localeCompare(`${b.students?.last_name}${b.students?.first_name}`));
    },
  });
  const gen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_charges", { _month: monthStart(month) });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => { toast.success(n ? `Create ${n} nuove quote` : "Nessuna nuova quota: il mese era già generato"); inv(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = data.map((c) => {
    const paid = c.payment_allocations.reduce((s, a) => s + Number(a.amount), 0);
    return { ...c, paid, open: round(Number(c.amount) - paid) };
  }).filter((c) => `${c.students?.first_name} ${c.students?.last_name}`.toLowerCase().includes(q.toLowerCase()));
  const tot = rows.reduce((a, r) => ({ due: a.due + Number(r.amount), paid: a.paid + r.paid }), { due: 0, paid: 0 });
  const today = todayRome();

  return (
    <SectionCard tone="money" title={`Quote di ${formatDateIt(monthStart(month), { month: "long", year: "numeric" })}`}
      right={<Button onClick={() => gen.mutate()} disabled={gen.isPending}>{gen.isPending ? "Genero…" : "Genera quote del mese"}</Button>}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Dovuto" value={euro(tot.due)} tone="money" />
        <Stat label="Ricevuto" value={euro(tot.paid)} tone="attend" />
        <Stat label="Residuo" value={euro(tot.due - tot.paid)} tone="alert" />
      </div>
      <Input placeholder="Cerca allieva…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna quota per questo mese. Premi “Genera quote del mese”: la generazione si può ripetere senza creare doppioni.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Allieva</th><th>Tipo</th><th className="text-right">Dovuto</th><th className="text-right">Ricevuto</th><th className="text-right">Residuo</th><th className="hidden md:table-cell">Regola</th></tr></thead>
          <tbody className="divide-y">{rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2">{r.students?.last_name} {r.students?.first_name}</td>
              <td>{KIND[r.kind]}</td>
              <td className="text-right">{euro(Number(r.amount))}</td>
              <td className="text-right">{euro(r.paid)}</td>
              <td className={`text-right font-medium ${r.open > 0 ? (r.due_date < today ? "text-alert" : "") : "text-attend"}`}>{r.open > 0 ? euro(r.open) : "Saldata"}</td>
              <td className="hidden text-xs text-muted-foreground md:table-cell">{r.source}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </SectionCard>
  );
}

/* ---------- Pagamenti ---------- */
function PaymentForm({ teacherMode, onDone }: { teacherMode?: boolean; onDone: () => void }) {
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: me } = useMe();
  const empty = { student_id: "", amount: "", paid_on: todayRome(), method: teacherMode ? "contanti" : "bonifico", received_by: teacherMode ? "insegnante" : "palestra", reference: "", notes: "" };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("payments").insert({ ...f, student_id: f.student_id || null, amount: Number(f.amount.replace(",", ".")), recorded_by: me?.userId ?? null });
    setSaving(false);
    if (error) { toast.error("Non salvato: " + error.message); return; }
    toast.success("Pagamento salvato e abbinato alle quote aperte"); setF(empty); onDone();
  }
  const active = students.filter((s) => s.active);
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <div className="col-span-2"><Field label="Allieva"><select className={sel} value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })}>
        <option value="">{teacherMode ? "Scegli allieva" : "Non attribuito"}</option>
        {active.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>)}
      </select></Field></div>
      <Field label="Importo €"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
      <Field label="Data"><Input type="date" value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></Field>
      <Field label="Metodo"><select className={sel} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="bonifico">Bonifico</option><option value="contanti">Contanti</option><option value="pos">POS</option><option value="altro">Altro</option></select></Field>
      {!teacherMode && <Field label="Ricevuto da"><select className={sel} value={f.received_by} onChange={(e) => setF({ ...f, received_by: e.target.value })}>{Object.entries(RECV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>}
      <Field label="Riferimento"><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
      <div className="flex items-end"><Button className="w-full" disabled={saving || !(Number(f.amount.replace(",", ".")) > 0) || (teacherMode && !f.student_id)} onClick={save}>{saving ? "Salvo…" : "Registra pagamento"}</Button></div>
    </div>
  );
}

function Payments({ month }: { month: string }) {
  const inv = useInvalidate();
  const pays = useMonthPayments(month).data ?? [];
  const { data: balances = [] } = useQuery({
    queryKey: ["fin", "balances"],
    queryFn: async () => {
      const [s, c, p] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, active").is("merged_into", null).order("last_name"),
        supabase.from("charges").select("student_id, amount, payment_allocations(amount)"),
        supabase.from("payments").select("student_id, amount"),
      ]);
      for (const r of [s, c, p]) if (r.error) throw r.error;
      const m = new Map(s.data!.map((x) => [x.id, { ...x, due: 0, alloc: 0, paid: 0 }]));
      for (const ch of c.data!) { const r = m.get(ch.student_id); if (r) { r.due += Number(ch.amount); r.alloc += ch.payment_allocations.reduce((a, x) => a + Number(x.amount), 0); } }
      for (const py of p.data!) { const r = py.student_id && m.get(py.student_id); if (r) r.paid += Number(py.amount); }
      return [...m.values()].filter((r) => r.due || r.paid);
    },
  });
  const [q, setQ] = useState("");
  const realloc = async (id: string) => {
    const { error } = await supabase.rpc("reallocate_student", { _student: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamenti riabbinati"); inv();
  };
  const assign = async (paymentId: string, studentId: string) => {
    const { error } = await supabase.from("payments").update({ student_id: studentId }).eq("id", paymentId);
    if (error) { toast.error(error.message); return; }
    await realloc(studentId);
  };
  const { data: students = [] } = useQuery(studentsQuery);
  const unassigned = pays.filter((p) => !p.student_id);

  return (
    <div className="space-y-4">
      <SectionCard title="Nuovo pagamento" tone="money"><PaymentForm onDone={inv} /></SectionCard>
      {unassigned.length > 0 && (
        <SectionCard title="Pagamenti da attribuire" tone="alert">
          <ul className="divide-y text-sm">{unassigned.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{formatDateIt(p.paid_on, { day: "numeric", month: "short" })} · {euro(Number(p.amount))} · {p.reference ?? p.method}</span>
              <select className={sel + " max-w-60"} defaultValue="" onChange={(e) => e.target.value && assign(p.id, e.target.value)}>
                <option value="">Attribuisci a…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>)}
              </select>
            </li>))}</ul>
        </SectionCard>
      )}
      <SectionCard title="Pagamenti del mese">
        {pays.length === 0 ? <p className="text-sm text-muted-foreground">Nessun pagamento registrato in questo mese.</p> : (
          <ul className="divide-y text-sm">{pays.map((p) => {
            const alloc = p.payment_allocations.reduce((s, a) => s + Number(a.amount), 0);
            return (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span><b>{p.students ? `${p.students.last_name} ${p.students.first_name}` : "Non attribuito"}</b> · {formatDateIt(p.paid_on, { day: "numeric", month: "short" })} · {p.method} · {RECV[p.received_by]} {p.reference && `· ${p.reference}`}</span>
                <span>{euro(Number(p.amount))}{Number(p.amount) - alloc > 0.009 && <span className="ml-2 text-xs text-alert">{euro(Number(p.amount) - alloc)} non abbinati</span>}</span>
              </li>);
          })}</ul>
        )}
      </SectionCard>
      <SectionCard title="Situazione per allieva" right={<Input placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} className="w-40" />}>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Allieva</th><th className="text-right">Dovuto</th><th className="text-right">Pagato</th><th className="text-right">Residuo</th><th className="text-right">Credito</th><th /></tr></thead>
          <tbody className="divide-y">{balances.filter((b) => `${b.first_name} ${b.last_name}`.toLowerCase().includes(q.toLowerCase())).map((b) => {
            const open = round(b.due - b.alloc), credit = round(b.paid - b.alloc);
            return (
              <tr key={b.id}>
                <td className="py-2">{b.last_name} {b.first_name}{!b.active && <span className="ml-1 text-xs text-muted-foreground">(inattiva)</span>}</td>
                <td className="text-right">{euro(b.due)}</td><td className="text-right">{euro(b.paid)}</td>
                <td className={`text-right font-medium ${open > 0 ? "text-alert" : "text-attend"}`}>{euro(open)}</td>
                <td className="text-right">{credit > 0 ? euro(credit) : "—"}</td>
                <td className="text-right">{credit > 0 && open > 0 && <Button size="sm" variant="ghost" onClick={() => realloc(b.id)}>Abbina</Button>}</td>
              </tr>);
          })}</tbody>
        </table></div>
      </SectionCard>
    </div>
  );
}

/* ---------- Compensi ---------- */
function Compensi({ month }: { month: string }) {
  const inv = useInvalidate();
  const staff = useStaff(month).data ?? [];
  const misc = useMonthMisc(month).data;
  const { data: teachers = [] } = useQuery(teachersQuery);
  const { data: rates = [] } = useQuery({
    queryKey: ["fin", "rates"],
    queryFn: async () => { const { data, error } = await supabase.from("teacher_rates").select("*").order("valid_from", { ascending: false }); if (error) throw error; return data; },
  });
  const [open, setOpen] = useState<string | null>(null);

  const byTeacher = useMemo(() => teachers.filter((t) => t.active).map((t) => {
    const rows = staff.filter((s) => s.teacher_id === t.id).sort((a, b) => a.lessons.lesson_date.localeCompare(b.lessons.lesson_date));
    const hours = rows.reduce((s, r) => s + Number(r.hours), 0);
    const pay = rows.reduce((s, r) => s + Number(r.hours) * Number(r.rate_applied ?? 0), 0);
    const paid = misc?.payouts.filter((p) => p.teacher_id === t.id).reduce((s, p) => s + Number(p.amount), 0) ?? 0;
    const current = rates.find((r) => r.teacher_id === t.id && !r.valid_to);
    return { t, rows, hours, pay: round(pay), paid, current };
  }), [teachers, staff, misc, rates]);

  async function payout(teacherId: string, amount: number) {
    const { error } = await supabase.from("teacher_payouts").insert({ teacher_id: teacherId, month: monthStart(month), amount });
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento compenso registrato"); inv();
  }
  async function newRate(teacherId: string, rate: number, from: string) {
    const prev = rates.find((r) => r.teacher_id === teacherId && !r.valid_to);
    if (prev) {
      if (from <= prev.valid_from) { toast.error("La nuova tariffa deve iniziare dopo quella attuale"); return; }
      const d = new Date(from + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1);
      const { error } = await supabase.from("teacher_rates").update({ valid_to: d.toISOString().slice(0, 10) }).eq("id", prev.id);
      if (error) { toast.error(error.message); return; }
    }
    const { error } = await supabase.from("teacher_rates").insert({ teacher_id: teacherId, hourly_rate: rate, valid_from: from });
    if (error) { toast.error(error.message); return; }
    toast.success("Tariffa aggiornata: i compensi già registrati non cambiano"); inv();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Compenso = ore effettivamente svolte × tariffa valida alla data della lezione. La tariffa viene fissata su ogni lezione: cambiarla non ricalcola il passato. Arianna non ha compenso orario.</p>
      {byTeacher.map(({ t, rows, hours, pay, paid, current }) => (
        <SectionCard key={t.id} title={<span>{t.full_name}{t.is_owner && <span className="ml-2 text-xs text-muted-foreground">Responsabile</span>}</span>}
          right={<button className="text-xs text-primary" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? "Chiudi" : "Dettaglio"}</button>}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Ore" value={hours.toLocaleString("it-IT")} tone="attend" />
            <Stat label="Maturato" value={euro(pay)} tone="money" />
            <Stat label="Pagato" value={euro(paid)} tone="people" />
            <Stat label="Da pagare" value={euro(round(pay - paid))} tone={pay - paid > 0 ? "alert" : "attend"} />
          </div>
          {open === t.id && (
            <div className="mt-3 space-y-3">
              <ul className="divide-y text-sm">{rows.map((r) => (
                <li key={r.id} className="flex justify-between py-1.5"><span>{formatDateIt(r.lessons.lesson_date, { weekday: "short", day: "numeric", month: "short" })} · {r.lessons.courses?.name} · {r.role}</span><span>{Number(r.hours)} h × {euro(Number(r.rate_applied ?? 0))}</span></li>
              ))}{rows.length === 0 && <li className="py-1.5 text-muted-foreground">Nessuna lezione svolta nel mese.</li>}</ul>
              {!t.is_owner && <PayoutAndRate current={current?.hourly_rate} residual={round(pay - paid)} onPay={(a) => payout(t.id, a)} onRate={(r, f) => newRate(t.id, r, f)} />}
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

function PayoutAndRate({ current, residual, onPay, onRate }: { current?: number | undefined; residual: number; onPay: (a: number) => void; onRate: (r: number, from: string) => void }) {
  const [amt, setAmt] = useState(residual > 0 ? String(residual) : "");
  const [rate, setRate] = useState("");
  const [from, setFrom] = useState(todayRome());
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex items-end gap-2"><Field label="Paga compenso €"><Input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field><Button disabled={!(Number(amt) > 0)} onClick={() => onPay(Number(amt))}>Registra</Button></div>
      <div className="flex items-end gap-2">
        <Field label={`Nuova tariffa (attuale ${current != null ? euro(Number(current)) : "—"}/h)`}><Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Dal"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Button variant="outline" disabled={!(Number(rate) > 0)} onClick={() => onRate(Number(rate), from)}>Salva</Button>
      </div>
    </div>
  );
}

/* ---------- Regole quote ---------- */
function Rules({ month }: { month: string }) {
  const inv = useInvalidate();
  const { data: students = [] } = useQuery(studentsQuery);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["fin", "rules"],
    queryFn: async () => {
      const [r, sf, o] = await Promise.all([
        supabase.from("fee_rules").select("*").order("valid_from", { ascending: false }),
        supabase.from("student_fees").select("*, students(first_name, last_name)").order("valid_from", { ascending: false }),
        supabase.from("fee_overrides").select("*, students(first_name, last_name)").order("month", { ascending: false }),
      ]);
      for (const x of [r, sf, o]) if (x.error) throw x.error;
      return { rules: r.data!, fees: sf.data!, overrides: o.data! };
    },
  });
  const [rule, setRule] = useState({ kind: "base", amount: "", valid_from: monthStart(month) });
  const [ind, setInd] = useState({ student_id: "", kind: "base", amount: "", valid_from: monthStart(month), valid_to: "", note: "" });
  const [ov, setOv] = useState({ student_id: "", kind: "base", amount: "", note: "" });

  async function addRule() {
    const prev = data?.rules.find((r) => r.kind === rule.kind && !r.valid_to);
    if (prev) {
      const d = new Date(rule.valid_from + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1);
      await supabase.from("fee_rules").update({ valid_to: d.toISOString().slice(0, 10) }).eq("id", prev.id);
    }
    const { error } = await supabase.from("fee_rules").insert({ ...rule, amount: Number(rule.amount) });
    if (error) { toast.error(error.message); return; }
    toast.success("Regola salvata. Le quote già generate non cambiano."); inv();
  }
  async function addInd() {
    const { error } = await supabase.from("student_fees").insert({ ...ind, amount: Number(ind.amount), valid_to: ind.valid_to || null, note: ind.note || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Quota individuale salvata"); inv();
  }
  async function addOv() {
    const { error } = await supabase.from("fee_overrides").upsert({ ...ov, month: monthStart(month), amount: Number(ov.amount), note: ov.note || null }, { onConflict: "student_id,month,kind" });
    if (error) { toast.error(error.message); return; }
    toast.success("Modifica del mese salvata (vale per le quote non ancora generate)"); inv();
  }
  async function toggleExclude(id: string, v: boolean) {
    const { error } = await supabase.from("students").update({ exclude_from_split: v }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["students"] }); inv();
  }
  const studentSelect = (v: string, on: (v: string) => void) => (
    <select className={sel} value={v} onChange={(e) => on(e.target.value)}><option value="">Scegli allieva</option>{students.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>)}</select>
  );
  const kindSelect = (v: string, on: (v: string) => void) => (
    <select className={sel} value={v} onChange={(e) => on(e.target.value)}><option value="base">Quota ordinaria</option><option value="gare">Supplemento gare</option></select>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Precedenza: modifica del singolo mese → quota individuale valida → regola generale valida. Il supplemento gare si applica una volta sola, anche se l'allieva è iscritta a Preparazione gare. Scadenza: giorno 10 del mese.</p>
      <SectionCard title="Regole generali" tone="money">
        <ul className="mb-3 divide-y text-sm">{data?.rules.map((r) => (
          <li key={r.id} className="flex justify-between py-1.5"><span>{r.kind === "base" ? "Quota ordinaria" : "Supplemento gare"} · dal {formatDateIt(r.valid_from, { day: "numeric", month: "short", year: "numeric" })}{r.valid_to && ` al ${formatDateIt(r.valid_to, { day: "numeric", month: "short", year: "numeric" })}`}</span><b>{euro(Number(r.amount))}</b></li>))}</ul>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Tipo">{kindSelect(rule.kind, (kind) => setRule({ ...rule, kind }))}</Field>
          <Field label="Importo €"><Input value={rule.amount} onChange={(e) => setRule({ ...rule, amount: e.target.value })} /></Field>
          <Field label="Valida dal"><Input type="date" value={rule.valid_from} onChange={(e) => setRule({ ...rule, valid_from: e.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" disabled={!rule.amount} onClick={addRule}>Nuova regola</Button></div>
        </div>
      </SectionCard>

      <SectionCard title="Quote individuali">
        <ul className="mb-3 divide-y text-sm">{data?.fees.map((r) => (
          <li key={r.id} className="flex justify-between py-1.5"><span>{r.students?.last_name} {r.students?.first_name} · {KIND[r.kind]} · dal {formatDateIt(r.valid_from, { day: "numeric", month: "short", year: "numeric" })}{r.valid_to && ` al ${formatDateIt(r.valid_to, { day: "numeric", month: "short", year: "numeric" })}`} {r.note && `· ${r.note}`}</span><b>{euro(Number(r.amount))}</b></li>))}</ul>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div className="col-span-2">{<Field label="Allieva">{studentSelect(ind.student_id, (student_id) => setInd({ ...ind, student_id }))}</Field>}</div>
          <Field label="Tipo">{kindSelect(ind.kind, (kind) => setInd({ ...ind, kind }))}</Field>
          <Field label="Importo €"><Input value={ind.amount} onChange={(e) => setInd({ ...ind, amount: e.target.value })} /></Field>
          <Field label="Dal"><Input type="date" value={ind.valid_from} onChange={(e) => setInd({ ...ind, valid_from: e.target.value })} /></Field>
          <Field label="Al (facoltativo)"><Input type="date" value={ind.valid_to} onChange={(e) => setInd({ ...ind, valid_to: e.target.value })} /></Field>
          <div className="col-span-2 md:col-span-5"><Input placeholder="Nota (es. sconto sorelle)" value={ind.note} onChange={(e) => setInd({ ...ind, note: e.target.value })} /></div>
          <Button disabled={!ind.student_id || ind.amount === ""} onClick={addInd}>Salva</Button>
        </div>
      </SectionCard>

      <SectionCard title={`Modifiche solo per ${formatDateIt(monthStart(month), { month: "long", year: "numeric" })}`}>
        <ul className="mb-3 divide-y text-sm">{data?.overrides.filter((o) => o.month === monthStart(month)).map((r) => (
          <li key={r.id} className="flex justify-between py-1.5"><span>{r.students?.last_name} {r.students?.first_name} · {KIND[r.kind]} {r.note && `· ${r.note}`}</span><b>{euro(Number(r.amount))}</b></li>))}</ul>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="col-span-2"><Field label="Allieva">{studentSelect(ov.student_id, (student_id) => setOv({ ...ov, student_id }))}</Field></div>
          <Field label="Tipo">{kindSelect(ov.kind, (kind) => setOv({ ...ov, kind }))}</Field>
          <Field label="Importo € (0 = nessuna quota)"><Input value={ov.amount} onChange={(e) => setOv({ ...ov, amount: e.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full" disabled={!ov.student_id || ov.amount === ""} onClick={addOv}>Salva</Button></div>
        </div>
      </SectionCard>

      <SectionCard title="Escluse dalla ripartizione (100% ad Arianna)" tone="settings">
        <ul className="grid gap-1 text-sm md:grid-cols-2">{students.filter((s) => s.active).map((s) => (
          <li key={s.id}><label className="flex items-center gap-2 py-1"><input type="checkbox" className="h-4 w-4" checked={!!s.exclude_from_split} onChange={(e) => toggleExclude(s.id, e.target.checked)} />{s.last_name} {s.first_name}</label></li>))}</ul>
      </SectionCard>
    </div>
  );
}

/* ---------- Insegnante ---------- */
function TeacherPayments() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["fin", "my-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("id, amount, paid_on, method, students(first_name, last_name)").order("paid_on", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <PageHeader title="Incassi" tone="money" subtitle="Registra i pagamenti che ricevi direttamente a mano" />
      <SectionCard tone="money" title="Nuovo incasso"><PaymentForm teacherMode onDone={() => qc.invalidateQueries({ queryKey: ["fin"] })} /></SectionCard>
      <SectionCard className="mt-4" title="I tuoi ultimi incassi">
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Nessun incasso registrato.</p> : (
          <ul className="divide-y text-sm">{data.map((p) => (
            <li key={p.id} className="flex justify-between py-2"><span>{p.students?.last_name} {p.students?.first_name} · {formatDateIt(p.paid_on, { day: "numeric", month: "short" })} · {p.method}</span><b>{euro(Number(p.amount))}</b></li>))}</ul>
        )}
      </SectionCard>
    </div>
  );
}
