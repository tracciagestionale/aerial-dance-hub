import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  userId: string;
  email: string | null;
  isOwner: boolean;
  isTeacher: boolean;
  teacherId: string | null;
  teacherName: string | null;
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: roles }, { data: teacher }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("teachers").select("id, full_name").eq("user_id", u.user.id).maybeSingle(),
    ]);
    const r = (roles ?? []).map((x) => x.role);
    return {
      userId: u.user.id,
      email: u.user.email ?? null,
      isOwner: r.includes("owner"),
      isTeacher: r.includes("teacher"),
      teacherId: teacher?.id ?? null,
      teacherName: teacher?.full_name ?? null,
    };
  },
  staleTime: 60_000,
});

export function useMe() {
  return useQuery(meQuery);
}
