import { describe, expect, it } from "vitest";
import { registerCell, registerColumns, registerRows, type RegisterStudent, type RegisterColumn } from "@/lib/register";

const student: RegisterStudent = { id: "s1", first_name: "Anna", last_name: "Rossi", enrollments: [
  { course_id: "kids", start_date: "2026-10-05", end_date: "2026-10-20", active: false },
] };
const column = (date: string, status?: string, attendance = ""): RegisterColumn => ({
  key: date + "/18:00", date, time: "18:00",
  lesson: status ? { id: date, lesson_date: date, start_time: "18:00", status,
    attendance: [{ student_id: "s1", status: attendance }] } : undefined,
});

describe("registro mensile", () => {
  it("non trasforma una presenza non registrata in assenza", () => {
    expect(registerCell(student, "kids", column("2026-10-12", "svolta"), "2026-10-17")).toBe("non_registrata");
  });
  it("mantiene lo storico e rispetta inizio e fine iscrizione", () => {
    expect(registerCell(student, "kids", column("2026-10-01"), "2026-10-17")).toBe("non_iscritta");
    expect(registerCell(student, "kids", column("2026-10-05"), "2026-10-17")).toBe("non_registrata");
    expect(registerCell(student, "kids", column("2026-10-21"), "2026-10-25")).toBe("non_iscritta");
  });
  it("riepiloga per allieva senza contare annullate e lezioni future", () => {
    const rows = registerRows([student], "kids", [column("2026-10-05", "svolta", "presente"),
      column("2026-10-07", "svolta", "assente"), column("2026-10-12", "svolta"),
      column("2026-10-14", "annullata", "presente"), column("2026-10-19")], "2026-10-17");
    expect(rows[0]).toMatchObject({ present: 1, absent: 1, pending: 1, percentage: 50 });
    expect(rows[0]?.cells).toEqual(["presente", "assente", "non_registrata", "annullata", "programmata"]);
  });
  it("non duplica date salvate e conserva lezioni fuori calendario", () => {
    const columns = registerColumns("2026-10", [{ id: "slot", weekday: 1, start_time: "18:00:00", active: true }],
      [{ id: "lesson", lesson_date: "2026-10-05", start_time: "18:00:00", status: "svolta", attendance: [] },
       { id: "extra", lesson_date: "2026-10-06", start_time: "19:00:00", status: "svolta", attendance: [] }]);
    expect(columns).toHaveLength(5);
    expect(columns[0]?.lesson?.id).toBe("lesson");
    expect(columns[1]?.time).toBe("19:00");
  });
  it("conserva presenze storiche anche se l'iscrizione non è più disponibile", () => {
    const rows = registerRows([{ ...student, enrollments: [] }], "kids", [column("2026-10-05", "svolta", "presente")], "2026-10-17");
    expect(rows[0]?.present).toBe(1);
  });
});