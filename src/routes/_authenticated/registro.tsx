import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Check, X, CircleDashed, Clock3, Minus, Ban, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coursesQuery, studentsQuery } from "@/lib/data";
import { addDays, formatDateIt, monthDays, todayRome } from "@/lib/dates";
import { registerColumns, registerRows, type CellState } from "@/lib/register";
import { PageHeader } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pageMeta } from "@/lib/metadata";
import { cn } from "@/lib/utils";

type Search = { course: string; month: string };
const validMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1900;

const registerQuery = (course: string, month: string) => queryOptions({
  queryKey: ["register", course, month],
  queryFn: async () => {
    if (!course) return [];
    const days = monthDays(month);
    const { data, error } = await supabase.from("lessons").select("id, lesson_date, start_time, status, attendance(student_id, status)")
      .eq("course_id", course).gte("lesson_date", `${month}-01`).lte("lesson_date", days[days.length - 1] ?? `${month}-01`)
      .order("lesson_date").order("start_time");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/registro")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    course: typeof search["course"] === "string" ? search["course"] : "",
    month: validMonth(search["month"]) ? search["month"] : todayRome().slice(0, 7),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const [courses] = await Promise.all([
      context.queryClient.ensureQueryData(coursesQuery),
      context.queryClient.ensureQueryData(studentsQuery),
    ]);
    const courseId = deps.course || courses.find((c) => c.active)?.id || courses[0]?.id || "";
    await context.queryClient.ensureQueryData(registerQuery(courseId, deps.month));
  },
  head: () => pageMeta("Registro mensile presenze", "Registro mensile Materi_ali: presenze, assenze e riepiloghi per allieva e corso."),
  pendingComponent: () => <p role="status" className="py-8 text-muted-foreground">Caricamento del registro…</p>,
  errorComponent: ({ reset }) => <div role="alert" className="space-y-3"><p>Impossibile caricare il registro.</p><Button variant="outline" onClick={reset}>Riprova</Button></div>,
  component: Registro,
});

const STATES: Record<CellState, { label: string; icon: typeof Check; tone: string }> = {
  presente: { label: "Presente", icon: Check, tone: "bg-attend-soft text-attend" },
  assente: { label: "Assente", icon: X, tone: "bg-alert-soft text-alert" },
  non_registrata: { label: "Da registrare", icon: CircleDashed, tone: "text-alert" },
  programmata: { label: "Programmata", icon: Clock3, tone: "text-muted-foreground" },
  annullata: { label: "Annullata", icon: Ban, tone: "bg-muted text-muted-foreground" },
  non_iscritta: { label: "Non iscritta", icon: Minus, tone: "text-muted-foreground" },
};

function Registro() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  const courseId = search.course || courses.find((c) => c.active)?.id || courses[0]?.id || "";
  const course = courses.find((c) => c.id === courseId);
  const { data: lessons } = useSuspenseQuery(registerQuery(courseId, search.month));
  const today = todayRome();
  const columns = registerColumns(search.month, course?.course_schedules ?? [], lessons);
  const rows = registerRows(students, courseId, columns, today);
  const monthLabel = formatDateIt(`${search.month}-01`, { month: "long", year: "numeric" });
  const previousMonth = addDays(`${search.month}-01`, -1).slice(0, 7);
  const nextMonth = addDays(monthDays(search.month).at(-1) ?? `${search.month}-01`, 1).slice(0, 7);
  const totals = rows.reduce((acc, row) => ({ present: acc.present + row.present, absent: acc.absent + row.absent, pending: acc.pending + row.pending }), { present: 0, absent: 0, pending: 0 });
  const update = (patch: Partial<Search>) => navigate({ search: { course: courseId, month: search.month, ...patch }, replace: true });

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="Registro mensile" tone="attend" subtitle="Presenze" />
      <div className="flex flex-wrap items-end gap-4 border-b pb-5">
        <div className="w-full sm:w-64">
          <label id="register-course-label" className="mb-2 block text-sm font-medium">Corso</label>
          <Select value={courseId} onValueChange={(course) => update({ course })}>
            <SelectTrigger aria-labelledby="register-course-label" className="h-11 bg-card"><SelectValue placeholder="Seleziona corso" /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{!c.active ? " · inattivo" : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="register-month" className="mb-2 block text-sm font-medium">Mese</label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Mese precedente" title="Mese precedente" onClick={() => update({ month: previousMonth })}><ChevronLeft /></Button>
            <Input id="register-month" type="month" min="1900-01" value={search.month} className="h-11 w-44 bg-card" onChange={(e) => { if (validMonth(e.target.value)) update({ month: e.target.value }); }} />
            <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Mese successivo" title="Mese successivo" onClick={() => update({ month: nextMonth })}><ChevronRight /></Button>
          </div>
        </div>
      </div>

      {!course ? <p className="py-6 text-muted-foreground">{courses.length ? "Corso non trovato o non autorizzato." : "Nessun corso disponibile."}</p> : <>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold">{course.name}</h2><p className="mt-1 text-sm capitalize text-muted-foreground">{monthLabel} · {rows.length} allieve · {columns.length} lezioni</p></div>
          <dl className="flex flex-wrap gap-5 text-sm">
            {([["Presenti", totals.present, "text-attend"], ["Assenti", totals.absent, "text-alert"], ["Da registrare", totals.pending, "text-muted-foreground"]] as const).map(([label, value, tone]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className={cn("mt-1 text-xl font-semibold", tone)}>{value}</dd></div>)}
          </dl>
        </div>
        <div aria-label="Legenda presenze" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {Object.entries(STATES).map(([state, info]) => <span key={state} className="inline-flex items-center gap-1.5"><info.icon className={cn("h-4 w-4 rounded-sm", info.tone)} />{info.label}</span>)}
        </div>
        {columns.length === 0 ? <div className="flex items-center gap-3 border-y py-8 text-muted-foreground"><CalendarDays className="h-5 w-5" /><p>Nessuna lezione in questo mese.</p></div> : <>
          <div className="max-w-full overflow-x-auto rounded-lg border bg-card" tabIndex={0} role="region" aria-label="Griglia mensile presenze">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <caption className="sr-only">{course.name}, {monthLabel}: presenze per allieva. Percentuale calcolata sulle presenze e assenze registrate.</caption>
              <thead><tr>
                <th scope="col" className="sticky left-0 z-10 min-w-44 border-b border-r bg-muted px-4 py-3 text-left">Allieva</th>
                {columns.map((column) => <th key={column.key} scope="col" className={cn("min-w-16 border-b border-r px-1 py-2 text-center", column.date === today ? "bg-attend-soft" : "bg-muted")}>
                  <Button asChild variant="ghost" className="h-auto w-full flex-col gap-0 px-1 py-1" title={`Apri lezione del ${formatDateIt(column.date)} alle ${column.time}`}>
                    <Link to="/lezione" search={{ course: courseId, date: column.date, time: column.time }}>
                      <span className="text-[10px] capitalize text-muted-foreground">{formatDateIt(column.date, { weekday: "short" })}</span>
                      <span className="text-base font-semibold">{Number(column.date.slice(8))}</span>
                      <span className="text-[10px] text-muted-foreground">{column.time}</span>
                    </Link>
                  </Button>
                </th>)}
                <th scope="col" className="min-w-16 border-b bg-attend-soft px-2 text-attend">Presenti</th>
                <th scope="col" className="min-w-16 border-b bg-alert-soft px-2 text-alert">Assenti</th>
                <th scope="col" className="min-w-24 border-b bg-muted px-2">Da registrare</th>
                <th scope="col" title="Percentuale sulle presenze e assenze registrate" className="min-w-20 border-b bg-muted px-2">Presenze %</th>
              </tr></thead>
              <tbody>{rows.map((row) => <tr key={row.student.id} className="group">
                <th scope="row" className="sticky left-0 z-10 border-b border-r bg-card px-4 py-3 text-left font-normal group-hover:bg-muted"><span className="block font-semibold">{row.student.last_name}</span><span className="text-muted-foreground">{row.student.first_name}</span></th>
                {row.cells.map((state, i) => {
                  const column = columns[i];
                  if (!column) return null;
                  const info = STATES[state];
                  return <td key={column.key} className="border-b border-r p-1 text-center">
                    {state === "non_iscritta" ? <span title={info.label} className="inline-flex h-10 w-10 items-center justify-center"><Minus className="h-4 w-4 text-muted-foreground" /><span className="sr-only">Non iscritta</span></span> :
                      <Button asChild variant="ghost" className={cn("h-10 w-10 p-0", info.tone)} title={info.label}>
                        <Link to="/lezione" search={{ course: courseId, date: column.date, time: column.time }} aria-label={`${row.student.last_name} ${row.student.first_name}, ${formatDateIt(column.date)}, ${column.time}: ${info.label}`}><info.icon /></Link>
                      </Button>}
                  </td>;
                })}
                <td className="border-b px-2 text-center font-semibold text-attend">{row.present}</td>
                <td className="border-b px-2 text-center font-semibold text-alert">{row.absent}</td>
                <td className="border-b px-2 text-center">{row.pending}</td>
                <td className="border-b px-2 text-center font-semibold">{row.percentage === null ? "—" : `${row.percentage}%`}</td>
              </tr>)}</tbody>
            </table>
            {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nessuna allieva iscritta nelle date di questo mese.</p>}
          </div>
          <section className="md:hidden" aria-label="Riepiloghi per allieva">
            <h3 className="mb-3 font-semibold">Riepiloghi per allieva</h3>
            <ul className="divide-y border-y">{rows.map((row) => <li key={row.student.id} className="py-3"><div className="flex justify-between gap-3"><span className="font-medium">{row.student.last_name} {row.student.first_name}</span><span className="text-sm text-attend">{row.percentage === null ? "—" : `${row.percentage}%`}</span></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span className="text-attend">{row.present} presenti</span><span className="text-alert">{row.absent} assenti</span><span className="text-muted-foreground">{row.pending} da registrare</span></div></li>)}</ul>
          </section>
        </>}
      </>}
    </div>
  );
}
