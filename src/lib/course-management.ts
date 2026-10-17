import { z } from "zod";

export const scheduleFormSchema = z.object({
  weekday: z.coerce.number().int().min(1).max(7),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Indica un orario valido"),
  duration_hours: z.coerce.number().positive("La durata deve essere maggiore di zero").max(24),
  teacher_id: z.string().transform((value) => value || null),
});

export const teacherEmailSchema = z.string().trim().toLowerCase().refine(
  (value) => value === "" || z.string().email().safeParse(value).success,
  "Indica un indirizzo email valido",
).transform((value) => value || null);