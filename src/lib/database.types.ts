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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          form_id: string | null
          id: string
          is_pending: boolean | null
          merged_with_participant_id: string | null
          participant_id: string | null
          permission_description: string | null
          permission_reason: string | null
          status: string
          temp_category: string | null
          temp_gender: string | null
          temp_group: string | null
          temp_name: string | null
          timestamp: string | null
        }
        Insert: {
          form_id?: string | null
          id?: string
          is_pending?: boolean | null
          merged_with_participant_id?: string | null
          participant_id?: string | null
          permission_description?: string | null
          permission_reason?: string | null
          status: string
          temp_category?: string | null
          temp_gender?: string | null
          temp_group?: string | null
          temp_name?: string | null
          timestamp?: string | null
        }
        Update: {
          form_id?: string | null
          id?: string
          is_pending?: boolean | null
          merged_with_participant_id?: string | null
          participant_id?: string | null
          permission_description?: string | null
          permission_reason?: string | null
          status?: string
          temp_category?: string | null
          temp_gender?: string | null
          temp_group?: string | null
          temp_name?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "attendance_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_merged_with_participant_id_fkey"
            columns: ["merged_with_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_forms: {
        Row: {
          allowed_categories: string[] | null
          created_at: string
          date: string
          description: string | null
          form_type: string
          id: string
          is_active: boolean
          kelompok_id: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          allowed_categories?: string[] | null
          created_at?: string
          date?: string
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean
          kelompok_id?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          allowed_categories?: string[] | null
          created_at?: string
          date?: string
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean
          kelompok_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_forms_kelompok_id_fkey"
            columns: ["kelompok_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
        ]
      }
      lookup_values: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          type: string
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          value?: string
        }
        Relationships: []
      }
      lupg_metric_definitions: {
        Row: {
          active: boolean
          category_label: string | null
          code: string
          created_at: string
          denominator_label: string | null
          id: string
          name: string
          scope: string
          sort_order: number
          updated_at: string
          value_format: string
        }
        Insert: {
          active?: boolean
          category_label?: string | null
          code: string
          created_at?: string
          denominator_label?: string | null
          id?: string
          name: string
          scope?: string
          sort_order?: number
          updated_at?: string
          value_format: string
        }
        Update: {
          active?: boolean
          category_label?: string | null
          code?: string
          created_at?: string
          denominator_label?: string | null
          id?: string
          name?: string
          scope?: string
          sort_order?: number
          updated_at?: string
          value_format?: string
        }
        Relationships: []
      }
      lupg_metric_reports: {
        Row: {
          created_at: string
          current_value: number
          denominator: number | null
          id: string
          metric_code: string
          monthly_report_id: string
          notes: string | null
          prev_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          denominator?: number | null
          id?: string
          metric_code: string
          monthly_report_id: string
          notes?: string | null
          prev_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          denominator?: number | null
          id?: string
          metric_code?: string
          monthly_report_id?: string
          notes?: string | null
          prev_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_metric_reports_metric_code_fkey"
            columns: ["metric_code"]
            isOneToOne: false
            referencedRelation: "lupg_metric_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "lupg_metric_reports_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "lupg_monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      lupg_monthly_reports: {
        Row: {
          created_at: string
          id: string
          kelompok_id: string
          locked: boolean
          month: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kelompok_id: string
          locked?: boolean
          month: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kelompok_id?: string
          locked?: boolean
          month?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_monthly_reports_kelompok_id_fkey"
            columns: ["kelompok_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
        ]
      }
      lupg_mustin_notes: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          keputusan_rencana: string
          monthly_report_id: string
          pic: string | null
          pokok_masalah: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          keputusan_rencana: string
          monthly_report_id: string
          pic?: string | null
          pokok_masalah: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          keputusan_rencana?: string
          monthly_report_id?: string
          pic?: string | null
          pokok_masalah?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_mustin_notes_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "lupg_monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      lupg_program_definitions: {
        Row: {
          active: boolean
          code: string
          count_label: string
          created_at: string
          denominator_label: string
          id: string
          is_cumulative: boolean
          name: string
          reporting_style: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          count_label: string
          created_at?: string
          denominator_label: string
          id?: string
          is_cumulative?: boolean
          name: string
          reporting_style?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          count_label?: string
          created_at?: string
          denominator_label?: string
          id?: string
          is_cumulative?: boolean
          name?: string
          reporting_style?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      lupg_program_reports: {
        Row: {
          count_prev_month: number | null
          count_this_month: number
          created_at: string
          denominator: number
          id: string
          monthly_report_id: string
          notes: string | null
          program_code: string
          updated_at: string
        }
        Insert: {
          count_prev_month?: number | null
          count_this_month?: number
          created_at?: string
          denominator?: number
          id?: string
          monthly_report_id: string
          notes?: string | null
          program_code: string
          updated_at?: string
        }
        Update: {
          count_prev_month?: number | null
          count_this_month?: number
          created_at?: string
          denominator?: number
          id?: string
          monthly_report_id?: string
          notes?: string | null
          program_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_program_reports_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "lupg_monthly_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lupg_program_reports_program_code_fkey"
            columns: ["program_code"]
            isOneToOne: false
            referencedRelation: "lupg_program_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      lupg_sarpras_items: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      lupg_sarpras_reports: {
        Row: {
          created_at: string
          id: string
          is_fulfilled: boolean
          item_id: string
          monthly_report_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_fulfilled?: boolean
          item_id: string
          monthly_report_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_fulfilled?: boolean
          item_id?: string
          monthly_report_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_sarpras_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "lupg_sarpras_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lupg_sarpras_reports_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "lupg_monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      lupg_sensus: {
        Row: {
          category_code: string
          count: number
          created_at: string
          gender: string
          id: string
          kelompok_id: string
          last_updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_code: string
          count?: number
          created_at?: string
          gender: string
          id?: string
          kelompok_id: string
          last_updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_code?: string
          count?: number
          created_at?: string
          gender?: string
          id?: string
          kelompok_id?: string
          last_updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lupg_sensus_kelompok_id_fkey"
            columns: ["kelompok_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
        ]
      }
      lupg_sensus_snapshots: {
        Row: {
          category_code: string
          count: number
          created_at: string
          gender: string
          id: string
          kelompok_id: string
          monthly_report_id: string
        }
        Insert: {
          category_code: string
          count: number
          created_at?: string
          gender: string
          id?: string
          kelompok_id: string
          monthly_report_id: string
        }
        Update: {
          category_code?: string
          count?: number
          created_at?: string
          gender?: string
          id?: string
          kelompok_id?: string
          monthly_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_sensus_snapshots_kelompok_id_fkey"
            columns: ["kelompok_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lupg_sensus_snapshots_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: false
            referencedRelation: "lupg_monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      lupg_shodaqoh: {
        Row: {
          created_at: string
          id: string
          jumlah_kk: number
          monthly_report_id: string
          nominal: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jumlah_kk?: number
          monthly_report_id: string
          nominal?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jumlah_kk?: number
          monthly_report_id?: string
          nominal?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lupg_shodaqoh_monthly_report_id_fkey"
            columns: ["monthly_report_id"]
            isOneToOne: true
            referencedRelation: "lupg_monthly_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          category_id: string | null
          created_at: string | null
          gender: string | null
          group_id: string | null
          id: string
          name: string
          status_active: boolean | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          gender?: string | null
          group_id?: string | null
          id?: string
          name: string
          status_active?: boolean | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          gender?: string | null
          group_id?: string | null
          id?: string
          name?: string
          status_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_participants: {
        Row: {
          attendance_ref_ids: string[] | null
          birth_date: string | null
          birth_place: string | null
          created_at: string | null
          id: string
          name: string
          status: string | null
          suggested_category: string | null
          suggested_gender: string | null
          suggested_group: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_ref_ids?: string[] | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          suggested_category?: string | null
          suggested_gender?: string | null
          suggested_group?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_ref_ids?: string[] | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          suggested_category?: string | null
          suggested_gender?: string | null
          suggested_group?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      lupg_sensus_gpn_derived: {
        Row: {
          category_code: string | null
          count: number | null
          gender: string | null
          kelompok_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_group_id_fkey"
            columns: ["kelompok_id"]
            isOneToOne: false
            referencedRelation: "lookup_values"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      lupg_get_submitter_display: {
        Args: { p_user_id: string }
        Returns: string
      }
      lupg_mr_readable: { Args: { p_mr_id: string }; Returns: boolean }
      lupg_mr_writable: { Args: { p_mr_id: string }; Returns: boolean }
      lupg_sync_derived_sensus: {
        Args: { p_kelompok_id: string }
        Returns: undefined
      }
      user_kelompok: { Args: never; Returns: string }
      user_kelompok_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
