import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery, studentsQuery } from "@/lib/data";
import { useMe } from "@/lib/session";
import { PageHeader, SectionCard, DemoBadge } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Search = { course?: string; nuova?: boolean };

export const Route = createFileRoute("/_authenticated/allieve")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    course: typeof s.course === "string" ? s.course : undefined,
    nuova: s.nuova === true || s.nuova === "true" ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Allieve — Materi_ali" }] }),
  component: Allieve,
});

function Allieve() {
  const search = Route.useSearch();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: courses = [] } = useQuery(coursesQuery);
  const [q, setQ] = useState("");
  const [course, setCourse] = useState(search.course ?? "");
  const [status, setStatus] = useState<"attive" | "inattive" | "tutte">("attive");
  const [open, setOpen] = useState(!!search.nuova);
  const [form, setForm] = useState({ first: "", last: "", course: search.course ?? "", birth: "", phone: "" });
  const [dups, setDups] = useState<string[] | null>(null);

  const list = students.filter(
    (s) =>
      (status === "tutte" || (status === "attive" ? s.active : !s.active)) &&
      (!course || s.enrollments.some((e) => e.active && e.course_id === course)) &&
      `${s.first_name} ${s.last_name} ${s.code}`.toLowerCase().includes(q.toLowerCase()),
  );

  async function add(force = false) {
    if (!form.first.trim() || !form.last.trim() || !form.course) return toast.error("Nome, cognome e corso sono obbligatori");
    if (!force) {
      const { data } = await supabase.rpc("possible_duplicates", { _first: form.first, _last: form.last, _birth: form.birth || undefined });
      if (data && data.length) return setDups(data.map((d) => `${d.first_name} ${d.last_name} (${d.code})`));
    }
    const { data: st, error } = await supabase
      .from("students")
      .insert({ first_name: form.first.trim(), last_name: form.last.trim(), birth_date: form.birth || null, parent1_phone: form.phone || null, created_by: me?.userId })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase.from("enrollments").insert({ student_id: st.id, course_id: form.course });
    if (e2) return toast.error(e2.message);
    toast.success("Allieva inserita");
    setOpen(false);
    setDups(null);
    setForm({ first: "", last: "", course: form.course, birth: "", phone: "" });
    qc.invalidateQueries({ queryKey: ["students"] });
  }

  async function toggleActive(id: string, active: boolean) {
    const { error } = await supabase.from("students").update({ active: !active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["students"] });
  }

  const cName = (id: string) => courses.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="space-y-4">
      <PageHeader tone="people" title="Allieve" subtitle={`${list.length} risultati`} actions={<Button onClick={() => setOpen(!open)}>Nuova allieva</Button>} />
      {open && (
        <SectionCard title="Nuova allieva" tone="people">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Nome *" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} className="h-11" />
            <Input placeholder="Cognome *" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} className="h-11" />
            <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="h-11 rounded-md border bg-card px-3 text-sm">
              <option value="">Corso *</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input type="date" value={form.birth} onChange={(e) => setForm({ ...form, birth: e.target.value })} className="h-11" />
            <Input placeholder="Telefono genitore 1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" />
            <Button className="h-11" onClick={() => add()}>Salva</Button>
          </div>
          {dups && (
            <div className="mt-3 rounded-xl bg-alert-soft p-3 text-sm">
              Possibili doppioni: {dups.join(", ")}.{" "}
              <Button size="sm" variant="outline" onClick={() => add(true)}>È una persona diversa, salva</Button>
            </div>
          )}
        </SectionCard>
      )}
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Cerca per nome o codice" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-xs" />
        <select value={course} onChange={(e) => setCourse(e.target.value)} className="h-11 rounded-md border bg-card px-3 text-sm">
          <option value="">Tutti i corsi</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-11 rounded-md border bg-card px-3 text-sm">
          <option value="attive">Attive</option><option value="inattive">Inattive</option><option value="tutte">Tutte</option>
        </select>
      </div>
      <ul className="divide-y rounded-2xl border bg-card">
        {list.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 p-3">
            <div className="flex-1">
              <div><b>{s.last_name}</b> {s.first_name} {s.is_demo && <DemoBadge />} {s.competes && <span className="ml-1 rounded-full bg-money-soft px-2 py-0.5 text-[10px] font-semibold text-money">GARE</span>}</div>
              <div className="text-xs text-muted-foreground">{s.code} · {s.enrollments.filter((e) => e.active).map((e) => cName(e.course_id)).join(", ")}</div>
            </div>
            {me?.isOwner && <Button size="sm" variant="ghost" onClick={() => toggleActive(s.id, s.active)}>{s.active ? "Disattiva" : "Riattiva"}</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
