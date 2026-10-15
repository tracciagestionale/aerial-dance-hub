export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          lesson_id: string
          status: string
          student_id: string
        }
        Insert: {
          id?: string
          lesson_id: string
          status: string
          student_id: string
        }
        Update: {
          id?: string
          lesson_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          kind: string
          month: string
          source: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          kind: string
          month: string
          source: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          kind?: string
          month?: string
          source?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedules: {
        Row: {
          active: boolean
          course_id: string
          duration_hours: number
          id: string
          start_time: string
          teacher_id: string | null
          weekday: number
        }
        Insert: {
          active?: boolean
          course_id: string
          duration_hours?: number
          id?: string
          start_time: string
          teacher_id?: string | null
          weekday: number
        }
        Update: {
          active?: boolean
          course_id?: string
          duration_hours?: number
          id?: string
          start_time?: string
          teacher_id?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      course_teachers: {
        Row: {
          course_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          course_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          course_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_teachers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          active: boolean
          assistant_teacher_id: string | null
          created_at: string
          description: string | null
          id: string
          is_competition: boolean
          is_demo: boolean
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          assistant_teacher_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_competition?: boolean
          is_demo?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          assistant_teacher_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_competition?: boolean
          is_demo?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_assistant_teacher_id_fkey"
            columns: ["assistant_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          active: boolean
          course_id: string
          created_at: string
          end_date: string | null
          id: string
          start_date: string
          student_id: string
        }
        Insert: {
          active?: boolean
          course_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          student_id: string
        }
        Update: {
          active?: boolean
          course_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          spent_on: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          spent_on?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          spent_on?: string
        }
        Relationships: []
      }
      fee_overrides: {
        Row: {
          amount: number
          id: string
          kind: string
          month: string
          note: string | null
          student_id: string
        }
        Insert: {
          amount: number
          id?: string
          kind: string
          month: string
          note?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          id?: string
          kind?: string
          month?: string
          note?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_overrides_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_rules: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      gym_transfers: {
        Row: {
          amount: number
          created_at: string
          direction: string
          id: string
          reference: string | null
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          direction?: string
          id?: string
          reference?: string | null
          transfer_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          direction?: string
          id?: string
          reference?: string | null
          transfer_date?: string
        }
        Relationships: []
      }
      lesson_staff: {
        Row: {
          hours: number
          id: string
          lesson_id: string
          rate_applied: number | null
          role: string
          teacher_id: string
        }
        Insert: {
          hours: number
          id?: string
          lesson_id: string
          rate_applied?: number | null
          role: string
          teacher_id: string
        }
        Update: {
          hours?: number
          id?: string
          lesson_id?: string
          rate_applied?: number | null
          role?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_staff_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_staff_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          duration_hours: number
          id: string
          lesson_date: string
          notes: string | null
          planned_teacher_id: string | null
          schedule_id: string | null
          start_time: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          duration_hours?: number
          id?: string
          lesson_date: string
          notes?: string | null
          planned_teacher_id?: string | null
          schedule_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          duration_hours?: number
          id?: string
          lesson_date?: string
          notes?: string | null
          planned_teacher_id?: string | null
          schedule_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_planned_teacher_id_fkey"
            columns: ["planned_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "course_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          charge_id: string
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          charge_id: string
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          charge_id?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          paid_on: string
          received_by: string
          recorded_by: string | null
          reference: string | null
          student_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          received_by?: string
          recorded_by?: string | null
          reference?: string | null
          student_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          received_by?: string
          recorded_by?: string | null
          reference?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string | null
          student_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          student_id: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          student_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean
          birth_date: string | null
          code: string
          competes: boolean
          created_at: string
          created_by: string | null
          email: string | null
          exclude_from_split: boolean
          first_name: string
          id: string
          is_demo: boolean
          last_name: string
          merged_into: string | null
          notes: string | null
          parent1_phone: string | null
          parent2_phone: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          code?: string
          competes?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          exclude_from_split?: boolean
          first_name: string
          id?: string
          is_demo?: boolean
          last_name: string
          merged_into?: string | null
          notes?: string | null
          parent1_phone?: string | null
          parent2_phone?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          code?: string
          competes?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          exclude_from_split?: boolean
          first_name?: string
          id?: string
          is_demo?: boolean
          last_name?: string
          merged_into?: string | null
          notes?: string | null
          parent1_phone?: string | null
          parent2_phone?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: string
          notes: string | null
          paid_on: string
          teacher_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          paid_on?: string
          teacher_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          paid_on?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payouts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_rates: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          teacher_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          hourly_rate: number
          id?: string
          teacher_id: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          teacher_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_rates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_assistant: boolean
          is_demo: boolean
          is_owner: boolean
          phone: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_assistant?: boolean
          is_demo?: boolean
          is_owner?: boolean
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_assistant?: boolean
          is_demo?: boolean
          is_owner?: boolean
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_payment: { Args: { _payment: string }; Returns: undefined }
      can_access_course: { Args: { _course_id: string }; Returns: boolean }
      can_access_student: { Args: { _student_id: string }; Returns: boolean }
      fee_amount: {
        Args: { _kind: string; _month: string; _student: string }
        Returns: Record<string, unknown>
      }
      generate_charges: { Args: { _month: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: never; Returns: boolean }
      my_teacher_id: { Args: never; Returns: string }
      possible_duplicates: {
        Args: {
          _birth?: string
          _exclude?: string
          _first: string
          _last: string
        }
        Returns: {
          active: boolean
          birth_date: string | null
          code: string
          competes: boolean
          created_at: string
          created_by: string | null
          email: string | null
          exclude_from_split: boolean
          first_name: string
          id: string
          is_demo: boolean
          last_name: string
          merged_into: string | null
          notes: string | null
          parent1_phone: string | null
          parent2_phone: string | null
          phone: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rate_for: { Args: { _date: string; _teacher: string }; Returns: number }
      reallocate_student: { Args: { _student: string }; Returns: undefined }
      save_lesson: { Args: { payload: Json }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "teacher"],
    },
  },
} as const
