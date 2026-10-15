import { describe, expect, it } from "vitest";
import { computeSplit } from "@/lib/finance";

describe("ripartizione 30/70", () => {
  it("1000 € incassati e 200 € di compensi danno 300 / 700 / 500", () => {
    const r = computeSplit([{ amount: 1000, received_by: "palestra", excluded: false }], 200, 0);
    expect(r.gym).toBe(300);
    expect(r.materiali).toBe(700);
    expect(r.result).toBe(500);
  });
  it("allieva esclusa va 100% ad Arianna", () => {
    const r = computeSplit([{ amount: 120, received_by: "palestra", excluded: true }], 0, 0);
    expect(r.gym).toBe(0);
    expect(r.materiali).toBe(120);
  });
  it("saldo: la palestra deve il 70% di quanto incassato meno i trasferimenti", () => {
    const r = computeSplit([{ amount: 100, received_by: "palestra", excluded: false }, { amount: 100, received_by: "arianna", excluded: false }], 0, 20);
    expect(r.balance).toBe(70 - 30 - 20);
  });
});
