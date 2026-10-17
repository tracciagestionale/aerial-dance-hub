import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Pencil, Plus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, DemoBadge } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { coursesQuery, teachersQuery, type Course } from "@/lib/data";
import { meQuery } from "@/lib/session";
import { shortTime, WEEKDAYS } from "@/lib/dates";
import { scheduleFormSchema } from "@/lib/course-management";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/corsi")({
  head: () => pageMeta("Corsi", "Corsi e calendario della scuola di danza aerea Materi_ali."),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(coursesQuery), context.queryClient.ensureQueryData(teachersQuery), context.queryClient.ensureQueryData(meQuery)]); },
  component: Corsi,
});

type Slot = Course["course_schedules"][number];
type Editing = { course: Course; slot?: Slot; form: { weekday: string; start_time: string; duration_hours: string; teacher_id: string } };
const selectClass = "h-11 w-full rounded-md border bg-card px-3 text-sm";

function Corsi() {
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const { data: teachers } = useSuspenseQuery(teachersQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const teacherName = (id: string | null) => teachers.find((t) => t.id === id)?.full_name ?? "Da assegnare";

  async function refresh() {
    await Promise.all(["courses", "register", "lessons-range", "projections"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
  }
  async function change(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    try {
      const result = await action();
      if (result.error) throw result.error;
      await refresh();
      toast.success("Abbinamento salvato");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Abbinamento non salvato. Riprova."); }
    finally { setBusy(false); }
  }
  function edit(course: Course, slot?: Slot) {
    setError("");
    setEditing({ course, ...(slot ? { slot } : {}), form: { weekday: String(slot?.weekday ?? 1), start_time: shortTime(slot?.start_time ?? "16:00"), duration_hours: String(slot?.duration_hours ?? 2), teacher_id: slot?.teacher_id ?? "" } });
  }
  async function save() {
    if (!editing || !me?.isOwner) return;
    const parsed = scheduleFormSchema.safeParse(editing.form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Controlla i campi"); return; }
    if (editing.course.course_schedules.some((s) => s.active && s.id !== editing.slot?.id && s.weekday === parsed.data.weekday && shortTime(s.start_time) === parsed.data.start_time)) {
      setError("Questo corso ha già un orario in quel giorno e a quell'ora."); return;
    }
    setBusy(true); setError("");
    try {
      const values = { ...parsed.data, start_time: parsed.data.start_time + ":00" };
      const request = editing.slot
        ? supabase.from("course_schedules").update(values).eq("id", editing.slot.id).select("id").single()
        : supabase.from("course_schedules").insert({ ...values, course_id: editing.course.id }).select("id").single();
      const result = await request;
      if (result.error) throw new Error(result.error.message);
      await refresh();
      setEditing(null); toast.success("Orario salvato");
    } catch (e) { setError(e instanceof Error ? e.message : "Orario non salvato. Riprova."); }
    finally { setBusy(false); }
  }
  if (!me?.isOwner) return <p className="text-muted-foreground">La gestione dei corsi è riservata alla responsabile.</p>;

  return <div className="space-y-5">
    <PageHeader tone="people" title="Corsi" subtitle={`${courses.filter((c) => c.active).length} corsi attivi`} actions={<Button variant="outline" asChild><Link to="/insegnanti">Insegnanti</Link></Button>} />
    <Input aria-label="Cerca corso" placeholder="Cerca corso" className="h-11 max-w-sm" value={filter} onChange={(e) => setFilter(e.target.value)} />
    <div className="space-y-5">{courses.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase())).map((course) => <article key={course.id} aria-label={course.name} className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-people-soft px-4 py-4">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{course.name}</h2>{course.is_demo && <DemoBadge />}{!course.active && <span className="text-xs text-muted-foreground">Inattivo</span>}</div>
        <Button variant="outline" disabled={busy} onClick={() => edit(course)}><Plus /> Aggiungi orario</Button>
      </div>
      <div className="divide-y">{course.course_schedules.filter((s) => s.active).sort((a,b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)).map((slot) => <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3"><Clock className="h-5 w-5 shrink-0 text-people" /><div><div className="font-medium">{WEEKDAYS[slot.weekday]} · {shortTime(slot.start_time)}</div><div className="text-sm text-muted-foreground">{Number(slot.duration_hours)} h · {teacherName(slot.teacher_id)}</div></div></div>
        <Button variant="ghost" disabled={busy} aria-label={`Modifica ${WEEKDAYS[slot.weekday]} ${shortTime(slot.start_time)} di ${course.name}`} onClick={() => edit(course, slot)}><Pencil /> Modifica</Button>
      </div>)}{!course.course_schedules.some((s) => s.active) && <p className="px-4 py-5 text-sm text-muted-foreground">Nessun orario attivo</p>}</div>
      <div className="grid gap-5 border-t px-4 py-4 md:grid-cols-2">
        <fieldset disabled={busy}><legend className="mb-2 text-sm font-semibold">Insegnanti del corso</legend><div className="flex flex-wrap gap-x-5 gap-y-3">{teachers.filter((t) => t.active && !t.is_assistant).map((teacher) => {
          const assigned = course.course_teachers.some((t) => t.teacher_id === teacher.id);
          return <label key={teacher.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={assigned} onChange={() => change(() => assigned ? supabase.from("course_teachers").delete().eq("course_id", course.id).eq("teacher_id", teacher.id) : supabase.from("course_teachers").insert({ course_id: course.id, teacher_id: teacher.id }))} />{teacher.full_name}</label>;
        })}</div></fieldset>
        <label className="block text-sm font-semibold">Assistente<select className={`${selectClass} mt-2 font-normal`} disabled={busy} value={course.assistant_teacher_id ?? ""} onChange={(e) => change(() => supabase.from("courses").update({ assistant_teacher_id: e.target.value || null }).eq("id", course.id).select("id").single())}><option value="">Nessuna</option>{teachers.filter((t) => t.active && (t.is_assistant || t.id === course.assistant_teacher_id)).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
      </div>
    </article>)}</div>
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !busy) setEditing(null); }}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>{editing?.slot ? "Modifica orario" : "Nuovo orario"}</DialogTitle><DialogDescription>{editing?.course.name}</DialogDescription></DialogHeader>
      {editing && <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4"><fieldset disabled={busy} className="grid gap-4">
        <label className="space-y-2 text-sm">Giorno<select className={selectClass} value={editing.form.weekday} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, weekday: e.target.value } })}>{WEEKDAYS.slice(1).map((day, i) => <option key={day} value={i+1}>{day}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="space-y-2 text-sm">Ora di inizio<Input required type="time" className="h-11" value={editing.form.start_time} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, start_time: e.target.value } })} /></label><label className="space-y-2 text-sm">Durata (ore)<Input required type="number" min="0.25" max="24" step="0.25" className="h-11" value={editing.form.duration_hours} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, duration_hours: e.target.value } })} /></label></div>
        <label className="space-y-2 text-sm">Insegnante prevista<select className={selectClass} value={editing.form.teacher_id} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, teacher_id: e.target.value } })}><option value="">Da assegnare</option>{teachers.filter((t) => (t.active && !t.is_assistant) || t.id === editing.form.teacher_id).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
      </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Annulla</Button><Button disabled={busy} type="submit">{busy ? <Loader2 className="animate-spin" /> : <Save />} Salva orario</Button></div></form>}
    </DialogContent></Dialog>
  </div>;
}
