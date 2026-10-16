import Papa from 'papaparse';

export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  if (result.errors.length) throw new Error('CSV non valido: ' + result.errors[0]?.message);
  if (result.data.length < 2) throw new Error('Il file deve contenere intestazioni e almeno una riga.');
  if (result.data.length > 1001) throw new Error('Importa al massimo 1000 righe per volta.');
  return result.data;
}
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
export function parseAmount(value: string): number {
  const clean = value.replace(/[€\s]/g, '');
  const n = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Importo non valido');
  return Math.round(n * 100) / 100;
}
export function parseImportDate(value: string): string {
  let date = value.trim();
  const it = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
  if (it) date = `${it[3]}-${it[2]?.padStart(2, '0')}-${it[1]?.padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Data non valida');
  return date;
}
export async function paymentKey(date: string, amount: number, reference: string) {
  const bytes = new TextEncoder().encode(JSON.stringify([date, amount, normalize(reference)]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}