import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi — Materi_ali" },
      { name: "description", content: "Accesso per la responsabile e le insegnanti di Materi_ali." },
      { property: "og:title", content: "Accedi — Materi_ali" },
      { property: "og:description", content: "Accesso riservato allo staff della scuola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/oggi", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/oggi", replace: true });
        else setSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg.includes("Invalid login") ? "Email o password non corretti" : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold">Materi<span className="text-primary">_</span>ali</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in" ? "Accedi con il tuo account" : "Crea il tuo account con l'email comunicata alla scuola"}
        </p>
        {sent ? (
          <p className="mt-6 rounded-lg bg-attend-soft p-4 text-sm">
            Controlla la tua email e conferma l'indirizzo, poi torna qui per accedere.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? "Attendi…" : mode === "in" ? "Accedi" : "Registrati"}
            </Button>
          </form>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setSent(false);
          }}
          className="mt-4 w-full text-center text-sm text-primary underline-offset-4 hover:underline"
        >
          {mode === "in" ? "Prima volta? Crea l'account" : "Hai già un account? Accedi"}
        </button>
      </Card>
    </main>
  );
}
