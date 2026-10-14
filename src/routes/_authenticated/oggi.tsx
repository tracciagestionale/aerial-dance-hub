import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ChevronRight, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { coursesQuery, studentsQuery, teachersQuery } from "@/lib/data";
import { addDays, formatDateIt, isoWeekday, shortTime, todayRome } from "@/lib/dates";
import { PageHeader, SectionCard, Stat } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/oggi")({
  head: () => ({ meta: [{ title: "Panoramica — Materi_ali" }] }),
  component: Oggi,
});

function Oggi() {
  const { data: me } = useMe();
  const today = todayRome();
  const from = addDays(today, -14);
  const { data: courses = [] } = useQuery(coursesQuery);
  const { data: teachers = [] } = useQuery(teachersQuery);
  const { data: students = [] } = useQuery(studentsQuery);
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons-range", from, today],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id, course_id, lesson_date, start_time, status, attendance(count)").gte("lesson_date", from).lte("lesson_date", today);
      if (error) throw error;
      return data;
    },
  });
  const tName = (id: string | null) => teachers.find((t) => t.id === id)?.full_name ?? "—";

  // Slots relevant to this user
  const mySlots = useMemo(() => {
    const all = courses.flatMap((c) => c.course_schedules.filter((s) => s.active && c.active).map((s) => ({ ...s, course: c })));
    if (me?.isOwner) return all;
    return all.filter((s) => s.teacher_id === me?.teacherId || s.course.course_teachers.some((ct) => ct.teacher_id === me?.teacherId));
  }, [courses, me]);

  const todaySlots = mySlots.filter((s) => s.weekday === isoWeekday(today)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const findLesson = (courseId: string, date: string, time: string) => lessons.find((l) => l.course_id === courseId && l.lesson_date === date && l.start_time === time);

  // Missing registers in last 14 days
  const missing: { date: string; slot: (typeof mySlots)[number] }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, -i);
    for (const s of mySlots.filter((x) => x.weekday === isoWeekday(d))) {
      const l = findLesson(s.course_id, d, s.start_time);
      if (!l) missing.push({ date: d, slot: s });
    }
  }

  const navigate = useNavigate();
  // Single-course teacher with a single lesson today: go straight to it
  useEffect(() => {
    if (me && !me.isOwner && todaySlots.length === 1 && mySlots.length > 0 && sessionStorage.getItem("auto-open") !== today) {
      sessionStorage.setItem("auto-open", today);
      const s = todaySlots[0];
      navigate({ to: "/lezione", search: { course: s.course_id, date: today, time: shortTime(s.start_time) } });
    }
  }, [me, todaySlots, mySlots.length, today, navigate]);

  const activeStudents = students.filter((s) => s.active);
  const enrollByCourse = courses.map((c) => ({ c, n: activeStudents.filter((s) => s.enrollments.some((e) => e.active && e.course_id === c.id)).length }));

  return (
    <div className="space-y-6">
      <PageHeader title={me?.isOwner ? "Panoramica" : `Ciao${me?.teacherName ? `, ${me.teacherName.split(" ")[0]}` : ""}`} subtitle={formatDateIt(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />

      {me?.isOwner && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Allieve attive (uniche)" value={activeStudents.length} tone="people" />
          <Stat label="Iscrizioni attive" value={enrollByCourse.reduce((a, b) => a + b.n, 0)} tone="people" />
          <Stat label="Lezioni registrate (14 gg)" value={lessons.filter((l) => l.status === "svolta").length} tone="attend" />
          <Stat label="Registri mancanti" value={missing.length} tone={missing.length ? "alert" : "attend"} />
        </div>
      )}

      <SectionCard title="Lezioni di oggi" tone="attend">
        {todaySlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna lezione in programma oggi.</p>
        ) : (
          <ul className="space-y-2">
            {todaySlots.map((s) => {
              const l = findLesson(s.course_id, today, s.start_time);
              const done = !!l;
              return (
                <li key={s.id}>
                  <Link to="/lezione" search={{ course: s.course_id, date: today, time: shortTime(s.start_time) }} className="flex items-center gap-3 rounded-xl border bg-card p-4 active:scale-[0.99]">
                    {done ? <CheckCircle2 className="h-6 w-6 text-attend" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                    <div className="flex-1">
                      <div className="font-semibold">{s.course.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {shortTime(s.start_time)} · {s.duration_hours} ore · {tName(s.teacher_id)}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-attend">{done ? (l?.status === "annullata" ? "Annullata" : "Registrata") : "Apri registro"}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {missing.length > 0 && (
        <SectionCard title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-alert" /> Presenze da completare</span>} tone="alert">
          <ul className="divide-y">
            {missing.slice(0, 12).map((m) => (
              <li key={m.date + m.slot.id}>
                <Link to="/lezione" search={{ course: m.slot.course_id, date: m.date, time: shortTime(m.slot.start_time) }} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <b>{m.slot.course.name}</b> · {formatDateIt(m.date)} · {shortTime(m.slot.start_time)}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {me?.isOwner && (
        <SectionCard title="Iscrizioni per corso" tone="people">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {enrollByCourse.map(({ c, n }) => (
              <Link key={c.id} to="/allieve" search={{ course: c.id }} className="rounded-xl bg-card p-3">
                <div className="text-xs text-muted-foreground">{c.name}</div>
                <div className="text-xl font-semibold text-people">{n}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
