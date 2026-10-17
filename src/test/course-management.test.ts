import { describe, expect, it } from "vitest";
import { scheduleFormSchema, teacherEmailSchema } from "@/lib/course-management";

describe("gestione corsi", () => {
  it("salva giorno, orario, durata e insegnante selezionati", () => {
    expect(scheduleFormSchema.parse({ weekday: "2", start_time: "16:30", duration_hours: "1.5", teacher_id: "teacher-id" })).toEqual({ weekday: 2, start_time: "16:30", duration_hours: 1.5, teacher_id: "teacher-id" });
  });
  it("rifiuta giorni, orari e durate non validi", () => {
    const valid = { weekday: 1, start_time: "16:00", duration_hours: 2, teacher_id: "" };
    for (const override of [{ weekday: 8 }, { start_time: "24:00" }, { duration_hours: 0 }]) {
      expect(scheduleFormSchema.safeParse({ ...valid, ...override }).success).toBe(false);
    }
  });
});
describe("email insegnante", () => {
  it("normalizza l'email senza modificare l'identità dell'account", () => {
    expect(teacherEmailSchema.parse("  Paola@Example.it  ")).toBe("paola@example.it");
    expect(teacherEmailSchema.parse(" ")).toBeNull();
    expect(teacherEmailSchema.safeParse("paola@").success).toBe(false);
  });
});