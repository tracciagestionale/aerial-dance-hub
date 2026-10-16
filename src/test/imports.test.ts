import { describe, expect, it } from 'vitest';
import { parseCsv, parseAmount, parseImportDate, normalize } from '@/lib/imports';
describe('importazione dati', () => {
  it('legge CSV con punto e virgola e celle tra virgolette', () => {
    expect(parseCsv('Nome;Note\nAnna;"a; b"')[1]).toEqual(['Anna', 'a; b']);
  });
  it('riconosce importi italiani', () => expect(parseAmount('1.234,50 €')).toBe(1234.5));
  it('rifiuta importi negativi', () => expect(() => parseAmount('-10')).toThrow());
  it('converte date italiane e rifiuta giorni impossibili', () => {
    expect(parseImportDate('16/10/2026')).toBe('2026-10-16');
    expect(() => parseImportDate('31/02/2026')).toThrow();
  });
  it('riconosce nomi equivalenti', () => expect(normalize('  Èlena  ROSSI ')).toBe('elena rossi'));
});