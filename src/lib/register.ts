import { isoWeekday, monthDays, shortTime } from "@/lib/dates";

type Schedule = { id: string; weekday: number; start_time: string; active: boolean };
type Enrollment = { course_id: string; start_date: string; end_date: string | null; active: boolean };
export type RegisterStudent = { id: string; first_name: string; last_name: string; enrollments: Enrollment[] };
export type RegisterLesson = {
  id: string; lesson_date: string; start_time: string; status: string;
  attendance: { student_id: string; status: string }[];
};
export type RegisterColumn = { key: string; date: string; time: string; lesson?: RegisterLesson | undefined };
export type CellState = "presente" | "assente" | "non_registrata" | "programmata" | "annullata" | "non_iscritta";

export function enrolledOn(student: RegisterStudent, courseId: string, date: string) {
  return student.enrollments.some((e) => e.course_id === courseId && e.start_date <= date &&
    (e.end_date === null || e.end_date >= date) && (e.active || e.end_date !== null));
}

export function registerColumns(month: string, schedules: Schedule[], lessons: RegisterLesson[]): RegisterColumn[] {
  const columns = new Map<string, RegisterColumn>();
  for (const date of monthDays(month)) {
    for (const schedule of schedules.filter((s) => s.active && s.weekday === isoWeekday(date))) {
      const time = shortTime(schedule.start_time);
      const key = `${date}/${time}`;
      columns.set(key, { key, date, time });
    }
  }
  for (const lesson of lessons) {
    if (!lesson.lesson_date.startsWith(month + "-")) continue;
    const time = shortTime(lesson.start_time);
    const key = `${lesson.lesson_date}/${time}`;
    columns.set(key, { key, date: lesson.lesson_date, time, lesson });
  }
  return [...columns.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function registerCell(student: RegisterStudent, courseId: string, column: RegisterColumn, today: string): CellState {
  const attendance = column.lesson?.attendance.find((a) => a.student_id === student.id);
  if (!enrolledOn(student, courseId, column.date) && !attendance) return "non_iscritta";
  if (column.lesson?.status === "annullata") return "annullata";
  if (attendance?.status === "presente" || attendance?.status === "assente") return attendance.status;
  if (column.date > today && !column.lesson) return "programmata";
  return "non_registrata";
}

export function registerRows(students: RegisterStudent[], courseId: string, columns: RegisterColumn[], today: string) {
  return students.filter((student) => columns.some((column) => enrolledOn(student, courseId, column.date) ||
    column.lesson?.attendance.some((a) => a.student_id === student.id)))
    .sort((a, b) => a.last_name.localeCompare(b.last_name, "it") || a.first_name.localeCompare(b.first_name, "it"))
    .map((student) => {
      const cells = columns.map((column) => registerCell(student, courseId, column, today));
      const present = cells.filter((s) => s === "presente").length;
      const absent = cells.filter((s) => s === "assente").length;
      const pending = cells.filter((s) => s === "non_registrata").length;
      return { student, cells, present, absent, pending,
        percentage: present + absent > 0 ? Math.round(present / (present + absent) * 100) : null };
    });
}