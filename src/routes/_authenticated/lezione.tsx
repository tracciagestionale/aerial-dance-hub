import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, ChevronLeft, ChevronRight, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery, studentsQuery, teachersQuery } from "@/lib/data";
import { addDays, formatDateIt, isoWeekday, shortTime, todayRome } from "@/lib/dates";
import { PageHeader, SectionCard } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Search = { course: string; date: string; time?: string };

export const Route = createFileRoute("/_authenticated/lezione")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    course: String(s.course ?? ""),
    date: typeof s.date === "string" ? s.date : todayRome(),
    time: typeof s.time === "string" ? s.time : undefined,
  }),
  head: () => ({ meta: [{ title: "Registro lezione — Materi_ali" }] }),
  component: Lezione,
});

type Att = "presente" | "assente" | "";

function Lezione() {
  const { course: courseId, date, time } = Route.useSearch();
  const qc = useQueryClient();
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: teachers = [] } = useQuery(teachersQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const course = courses.find((c) => c.id === courseId);
  const slot = course?.course_schedules.find((s) => (time ? shortTime(s.start_time) === time : s.weekday === isoWeekday(date)));
  const startTime = time ?? (slot ? shortTime(slot.start_time) : "18:00");

  const { data: existing, isLoading } = useQuery({
    queryKey: ["lesson", courseId, date, startTime],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, attendance(*), lesson_staff(*)")
        .eq("course_id", courseId)
        .eq("lesson_date", date)
        .eq("start_time", startTime + ":00")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enrolled = useMemo(
    () =>
      students.filter((s) =>
        s.enrollments.some((e) => e.course_id === courseId && e.start_date <= date && (e.end_date === null || e.end_date >= date) && (e.active || e.end_date)) ||
        existing?.attendance.some((a) => a.student_id === s.id),
      ),
    [students, courseId, date, existing],
  );

  const plannedTeacher = slot?.teacher_id ?? null;
  const assistant = course?.assistant_teacher_id ? teachers.find((t) => t.id === course.assistant_teacher_id) : null;
  const staffCandidates = teachers.filter((t) => t.active && !t.is_assistant);

  const [status, setStatus] = useState<"svolta" | "annullata">("svolta");
  const [duration, setDuration] = useState(2);
  const [staff, setStaff] = useState<string[]>([]);
  const [paola, setPaola] = useState(false);
  const [paolaHours, setPaolaHours] = useState<"1" | "full">("full");
  const [att, setAtt] = useState<Record<string, Att>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (existing) {
      setStatus(existing.status as "svolta" | "annullata");
      setDuration(Number(existing.duration_hours));
      setStaff(existing.lesson_staff.filter((s) => s.role !== "assistente").map((s) => s.teacher_id));
      const a = existing.lesson_staff.find((s) => s.role === "assistente");
      setPaola(!!a);
      setPaolaHours(a && Number(a.hours) < Number(existing.duration_hours) ? "1" : "full");
      setAtt(Object.fromEntries(existing.attendance.map((x) => [x.student_id, x.status as Att])));
      setNotes(existing.notes ?? "");
    } else {
      setStatus("svolta");
      setDuration(Number(slot?.duration_hours ?? 2));
      setStaff(plannedTeacher ? [plannedTeacher] : []);
      setPaola(false);
      setAtt({});
      setNotes("");
    }
    setDirty(false);
  }, [existing, isLoading, slot?.id, plannedTeacher]);

  const touch = () => setDirty(true);
  const counts = {
    p: enrolled.filter((s) => att[s.id] === "presente").length,
    a: enrolled.filter((s) => att[s.id] === "assente").length,
  };
  const unrecorded = enrolled.length - counts.p - counts.a;
  const paolaEffective = paola ? (paolaHours === "1" ? 1 : duration) : 0;

  async function save() {
    if (!course) return;
    if (status === "svolta" && staff.length === 0) {
      toast.error("Indica chi ha svolto la lezione");
      return;
    }
    setSaving(true);
    const payload = {
      course_id: course.id,
      schedule_id: slot?.id ?? "",
      lesson_date: date,
      start_time: startTime,
      duration_hours: duration,
      status,
      planned_teacher_id: plannedTeacher ?? "",
      notes,
      staff:
        status === "annullata"
          ? []
          : [
              ...staff.map((id) => ({ teacher_id: id, role: id === plannedTeacher || !plannedTeacher ? "insegnante" : "sostituta", hours: duration })),
              ...(paola && assistant ? [{ teacher_id: assistant.id, role: "assistente", hours: paolaEffective }] : []),
            ],
      attendance: enrolled.map((s) => ({ student_id: s.id, status: status === "annullata" ? "" : att[s.id] ?? "" })),
    };
    const { error } = await supabase.rpc("save_lesson", { payload });
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvataggio: " + error.message);
      return;
    }
    toast.success(`Registro salvato · ${counts.p} presenti, ${counts.a} assenti${unrecorded ? `, ${unrecorded} da registrare` : ""}`);
    setDirty(false);
    qc.invalidateQueries({ queryKey: ["lesson"] });
    qc.invalidateQueries({ queryKey: ["lessons-range"] });
    qc.invalidateQueries({ queryKey: ["register"] });
  }

  if (!course) {
    return <p className="text-sm text-muted-foreground">Corso non trovato o non autorizzato. <Link to="/oggi" className="text-primary underline">Torna alla panoramica</Link></p>;
  }

  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="space-y-4">
      <PageHeader
        tone="attend"
        title={course.name}
        subtitle={
          <span className="flex items-center gap-2">
            <Link to="/lezione" search={{ course: courseId, date: prev }} className="rounded-md p-1 hover:bg-muted" aria-label="Giorno precedente"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="capitalize">{formatDateIt(date)} · {startTime}</span>
            <Link to="/lezione" search={{ course: courseId, date: next }} className="rounded-md p-1 hover:bg-muted" aria-label="Giorno successivo"><ChevronRight className="h-4 w-4" /></Link>
            {existing && <span className="rounded-full bg-attend-soft px-2 py-0.5 text-xs font-medium text-attend">Già registrata</span>}
          </span>
        }
      />

      <SectionCard title="Lezione">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-2">
            {(["svolta", "annullata"] as const).map((s) => (
              <button key={s} onClick={() => { setStatus(s); touch(); }} className={cn("h-11 flex-1 rounded-xl border text-sm font-semibold capitalize", status === s ? (s === "svolta" ? "border-attend bg-attend-soft text-attend" : "border-alert bg-alert-soft text-alert") : "bg-card")}>
                {s}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm">
            Durata effettiva
            <Input type="number" step="0.5" min="0.5" max="6" value={duration} onChange={(e) => { setDuration(Number(e.target.value)); touch(); }} className="h-11 w-24" />
            ore
          </label>
        </div>
        {status === "svolta" && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium">Chi ha svolto la lezione</div>
            <div className="flex flex-wrap gap-2">
              {staffCandidates.map((t) => {
                const on = staff.includes(t.id);
                return (
                  <button key={t.id} onClick={() => { setStaff(on ? staff.filter((x) => x !== t.id) : [...staff, t.id]); touch(); }} className={cn("rounded-full border px-3 py-2 text-sm", on ? "border-primary bg-secondary font-semibold text-secondary-foreground" : "bg-card text-muted-foreground")}>
                    {t.full_name}
                    {t.id === plannedTeacher ? " · prevista" : on ? " · sostituta" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {assistant && status === "svolta" && (
        <SectionCard title={`Assistente: ${assistant.full_name}`} tone="settings">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <Switch checked={paola} onCheckedChange={(v) => { setPaola(v); touch(); }} /> {assistant.full_name} presente
            </label>
            {paola && (
              <div className="flex gap-2">
                {([["1", "1 ora"], ["full", "Tutta la lezione"]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => { setPaolaHours(v); touch(); }} className={cn("h-10 rounded-xl border px-4 text-sm", paolaHours === v ? "border-settings bg-card font-semibold" : "bg-card/50")}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            <span className="ml-auto rounded-lg bg-card px-3 py-1.5 text-sm">Ore assistenza: <b>{paolaEffective}</b></span>
          </div>
        </SectionCard>
      )}

      {status === "svolta" && (
        <SectionCard
          title={`Allieve (${enrolled.length})`}
          tone="attend"
          right={
            <Button size="sm" variant="outline" onClick={() => { setAtt(Object.fromEntries(enrolled.map((s) => [s.id, att[s.id] || "presente"]))); touch(); }}>
              Tutte presenti
            </Button>
          }
        >
          <div className="mb-3 flex gap-3 text-xs">
            <span className="rounded-full bg-card px-2 py-1">✓ {counts.p} presenti</span>
            <span className="rounded-full bg-card px-2 py-1">✗ {counts.a} assenti</span>
            <span className={cn("rounded-full px-2 py-1", unrecorded ? "bg-alert-soft text-alert" : "bg-card")}>• {unrecorded} da registrare</span>
          </div>
          {enrolled.length === 0 && <p className="text-sm text-muted-foreground">Nessuna allieva iscritta a questo corso.</p>}
          <ul className="space-y-2">
            {enrolled.map((s) => {
              const v = att[s.id] ?? "";
              const set = (nv: Att) => { setAtt({ ...att, [s.id]: v === nv ? "" : nv }); touch(); };
              return (
                <li key={s.id} className="flex items-center gap-2 rounded-xl bg-card p-2 pl-4">
                  <span className="flex-1 text-base">
                    <b>{s.last_name}</b> {s.first_name}
                  </span>
                  <button aria-label="Presente" onClick={() => set("presente")} className={cn("flex h-12 w-14 items-center justify-center rounded-xl border-2", v === "presente" ? "border-attend bg-attend text-primary-foreground" : "border-border text-muted-foreground")}>
                    <Check className="h-6 w-6" />
                  </button>
                  <button aria-label="Assente" onClick={() => set("assente")} className={cn("flex h-12 w-14 items-center justify-center rounded-xl border-2", v === "assente" ? "border-alert bg-alert text-primary-foreground" : "border-border text-muted-foreground")}>
                    <X className="h-6 w-6" />
                  </button>
                </li>
              );
            })}
          </ul>
          <Link to="/allieve" search={{ course: courseId, nuova: true }} className="mt-3 inline-flex items-center gap-2 text-sm text-people">
            <UserPlus className="h-4 w-4" /> Aggiungi una nuova allieva
          </Link>
        </SectionCard>
      )}

      <SectionCard title="Note">
        <Input value={notes} onChange={(e) => { setNotes(e.target.value); touch(); }} placeholder="Note sulla lezione (facoltative)" className="h-11" />
      </SectionCard>

      <div className="fixed inset-x-0 bottom-[60px] z-20 border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Button variant="outline" className="h-12 flex-1 md:flex-none" asChild>
            <Link to="/oggi">Annulla</Link>
          </Button>
          <Button className="h-12 flex-[2] bg-attend text-base hover:bg-attend/90 md:flex-none md:px-10" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : dirty || !existing ? "Salva registro" : "Salvato ✓"}
          </Button>
        </div>
      </div>
    </div>
  );
}
