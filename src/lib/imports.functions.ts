import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const readSheet = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ url: z.string().max(500), range: z.string().min(1).max(100).regex(/^[\p{L}\p{N}_ '\-!:$]+$/u) }))
  .handler(async ({ data, context }) => {
    const { data: owner, error } = await context.supabase.rpc('is_owner');
    if (error || !owner) throw new Error('Solo la responsabile può importare dati.');
    const match = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(data.url);
    if (!match) throw new Error('Indirizzo Google Sheets non valido.');
    const key = process.env['GOOGLE_SHEETS_API_KEY'];
    const auth = process.env['LOVABLE_API_KEY'];
    if (!key || !auth) throw new Error('Collegamento Google Sheets non disponibile.');
    const response = await fetch(`https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${match[1]}/values/${data.range}`, {
      headers: { Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key },
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Google Sheets [${response.status}]: ${body}`);
      throw new Error(`Google Sheets (${response.status}): ${body}`);
    }
    const result = await response.json() as { values?: unknown[][] };
    const rows = (result.values ?? []).map(row => row.map(cell => String(cell ?? '')));
    if (rows.length < 2) throw new Error('Il foglio non contiene intestazioni e dati.');
    if (rows.length > 1001) throw new Error('Seleziona un intervallo con al massimo 1000 righe di dati.');
    return rows;
  });