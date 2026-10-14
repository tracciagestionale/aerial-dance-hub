import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, course_schedules(*), course_teachers(teacher_id)")
    .order("sort_order");
  if (error) throw error;
  return data;
}
async function fetchTeachers() {
  const { data, error } = await supabase.from("teachers").select("*").order("full_name");
  if (error) throw error;
  return data;
}
async function fetchStudents() {
  const { data, error } = await supabase
    .from("students")
    .select("*, enrollments(id, course_id, active, start_date, end_date)")
    .is("merged_into", null)
    .order("last_name")
    .order("first_name");
  if (error) throw error;
  return data;
}

export const coursesQuery = queryOptions({ queryKey: ["courses"], queryFn: fetchCourses });
export const teachersQuery = queryOptions({ queryKey: ["teachers"], queryFn: fetchTeachers });
export const studentsQuery = queryOptions({ queryKey: ["students"], queryFn: fetchStudents });

export type Course = Awaited<ReturnType<typeof fetchCourses>>[number];
export type Teacher = Awaited<ReturnType<typeof fetchTeachers>>[number];
export type Student = Awaited<ReturnType<typeof fetchStudents>>[number];
