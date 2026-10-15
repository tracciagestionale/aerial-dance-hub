export const GYM_SHARE = 0.3;

export type SplitPayment = { amount: number; received_by: string; excluded: boolean };

/** 30/70 split computed on collected amounts, before teacher pay. Excluded students go 100% to Arianna. */
export function computeSplit(payments: SplitPayment[], teacherPay: number, transfersToArianna: number, transfersToGym = 0) {
  let collected = 0, gym = 0, materiali = 0, gymOwesArianna = 0, ariannaOwesGym = 0;
  for (const p of payments) {
    const g = p.excluded ? 0 : round(p.amount * GYM_SHARE);
    const m = round(p.amount - g);
    collected += p.amount; gym += g; materiali += m;
    if (p.received_by === "palestra") gymOwesArianna += m;
    else ariannaOwesGym += g;
  }
  const result = round(materiali - teacherPay);
  // positive = the gym still has to transfer this to Arianna
  const balance = round(gymOwesArianna - ariannaOwesGym - transfersToArianna + transfersToGym);
  return { collected: round(collected), gym: round(gym), materiali: round(materiali), teacherPay: round(teacherPay), result, balance };
}

export function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function monthStart(month: string) {
  return `${month}-01`;
}
export function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
}
