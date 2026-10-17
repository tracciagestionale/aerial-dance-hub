import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Save, Loader2, Mail, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, DemoBadge } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { coursesQuery, teachersQuery, type Teacher } from "@/lib/data";
import { meQuery } from "@/lib/session";
import { teacherEmailSchema } from "@/lib/course-management";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/insegnanti")({
  head: () => pageMeta("Insegnanti", "Email e abbinamenti delle insegnanti della scuola Materi_ali."),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(coursesQuery), context.queryClient.ensureQueryData(teachersQuery), context.queryClient.ensureQueryData(meQuery)]); },
  component: Insegnanti,
});

function Insegnanti() {
  const { data: teachers } = useSuspenseQuery(teachersQuery);
  const { data: courses } = useSuspenseQuery(coursesQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [email, setEmail] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!editing || !me?.isOwner) return;
    const parsed = teacherEmailSchema.safeParse(email);
    if (!parsed.success) { setError("Indica un indirizzo email valido"); return; }
    if (parsed.data && teachers.some((t) => t.id !== editing.id && t.email?.trim().toLowerCase() === parsed.data)) { setError("Questa email è già presente per un'altra insegnante."); return; }
    setBusy(true); setError("");
    try {
      const { error: saveError } = await supabase.from("teachers").update({ email: parsed.data }).eq("id", editing.id).select("id").single();
      if (saveError) throw new Error(saveError.message);
      await Promise.all([qc.invalidateQueries({ queryKey: ["teachers"] }), qc.invalidateQueries({ queryKey: ["me"] })]);
      setEditing(null); toast.success("Email salvata");
    } catch (e) { setError(e instanceof Error ? e.message : "Email non salvata. Riprova."); }
    finally { setBusy(false); }
  }
  if (!me?.isOwner) return <p className="text-muted-foreground">La gestione delle insegnanti è riservata alla responsabile.</p>;
  const list = teachers.filter((t) => `${t.full_name} ${t.email ?? ""}`.toLowerCase().includes(filter.toLowerCase()));
  return <div className="space-y-5"><PageHeader tone="settings" title="Insegnanti" subtitle={`${teachers.filter((t) => t.active).length} insegnanti attive`} />
    <Input aria-label="Cerca insegnante" placeholder="Cerca nome o email" className="h-11 max-w-sm" value={filter} onChange={(e) => setFilter(e.target.value)} />
    <div className="grid gap-4 lg:grid-cols-2">{list.map((teacher) => {
      const assigned = courses.filter((c) => c.course_teachers.some((t) => t.teacher_id === teacher.id) || c.course_schedules.some((s) => s.active && s.teacher_id === teacher.id) || c.assistant_teacher_id === teacher.id);
      return <article key={teacher.id} aria-label={teacher.full_name} className="min-w-0 rounded-lg border bg-card p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><GraduationCap className="h-5 w-5 text-settings" /><span className="text-xs font-medium text-settings">{teacher.is_owner ? "Responsabile" : teacher.is_assistant ? "Assistente" : "Insegnante"}</span>{teacher.is_demo && <DemoBadge />}{!teacher.active && <span className="text-xs text-muted-foreground">Inattiva</span>}</div><h2 className="text-lg font-semibold">{teacher.full_name}</h2></div><Button size="icon" variant="ghost" aria-label={`Modifica email di ${teacher.full_name}`} title="Modifica email" onClick={() => { setEditing(teacher); setEmail(teacher.email ?? ""); setError(""); }}><Pencil /></Button></div>
        <div className="mt-4 flex items-start gap-2 text-sm"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="break-all">{teacher.email ?? "Email non inserita"}</span></div><div className="mt-1 pl-6 text-xs text-muted-foreground">{teacher.user_id ? "Account collegato" : "Account non collegato"}</div>
        <div className="mt-4 border-t pt-3"><h3 className="text-xs font-medium text-muted-foreground">Corsi abbinati</h3><p className="mt-1 text-sm">{assigned.map((c) => c.name).join(" · ") || "Nessun corso abbinato"}</p></div>
      </article>;
    })}</div>{!list.length && <p className="text-sm text-muted-foreground">Nessuna insegnante trovata</p>}
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !busy) setEditing(null); }}><DialogContent className="w-[calc(100%-2rem)]"><DialogHeader><DialogTitle>Modifica email</DialogTitle><DialogDescription>{editing?.full_name}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}><label className="block space-y-2 text-sm">Email<Input type="email" className="h-11" disabled={busy} value={email} onChange={(e) => setEmail(e.target.value)} /></label>{editing?.user_id && <p className="text-sm text-muted-foreground">L'email della scheda è distinta dall'email di accesso: l'account collegato resta invariato.</p>}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Annulla</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Salva email</Button></div></form></DialogContent></Dialog>
  </div>;
}
