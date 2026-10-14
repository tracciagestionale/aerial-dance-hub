function parts(date: string): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return [y, m, d];
}

export const TZ = "Europe/Rome";

export function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** ISO weekday 1 = lunedì ... 7 = domenica, for a YYYY-MM-DD string */
export function isoWeekday(date: string): number {
  const [y, m, d] = parts(date);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export const WEEKDAYS = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function formatDateIt(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  const [y, m, d] = parts(date);
  return new Intl.DateTimeFormat("it-IT", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = parts(date);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function monthDays(month: string): string[] {
  const [y, m] = parts(month + "-01");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export function shortTime(t: string) {
  return t?.slice(0, 5) ?? "";
}

export const euro = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
