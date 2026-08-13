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
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
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
            foreignKeyName: 'attendance_form_id_fkey'
            columns: ['form_id']
            isOneToOne: false
            referencedRelation: 'attendance_forms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_merged_with_participant_id_fkey'
            columns: ['merged_with_participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
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
            foreignKeyName: 'attendance_forms_kelompok_id_fkey'
            columns: ['kelompok_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
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
      lupg_activity_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_size: number | null
          id: string
          report_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          report_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          report_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_activity_photos_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
          },
        ]
      }
      lupg_character_monitoring_activities: {
        Row: {
          active: boolean
          activity_code: string
          activity_label: string
          created_at: string
          id: string
          level_code: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          activity_code: string
          activity_label: string
          created_at?: string
          id?: string
          level_code: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          activity_code?: string
          activity_label?: string
          created_at?: string
          id?: string
          level_code?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      lupg_character_monitoring_reports: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          monthly_report_id: string
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          monthly_report_id: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          monthly_report_id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_character_monitoring_reports_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'lupg_character_monitoring_activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lupg_character_monitoring_reports_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
          },
        ]
      }
      lupg_character_target_items: {
        Row: {
          active: boolean
          category_label: string
          created_at: string
          detail_label: string | null
          id: string
          level_code: string
          material_label: string
          month_index: number
          month_label: string
          reference_from: string | null
          reference_to: string | null
          sort_order: number
          source_row: number | null
          source_sheet: string | null
          template_id: string
          updated_at: string
          uses_reference: boolean
        }
        Insert: {
          active?: boolean
          category_label: string
          created_at?: string
          detail_label?: string | null
          id?: string
          level_code: string
          material_label: string
          month_index: number
          month_label: string
          reference_from?: string | null
          reference_to?: string | null
          sort_order?: number
          source_row?: number | null
          source_sheet?: string | null
          template_id: string
          updated_at?: string
          uses_reference?: boolean
        }
        Update: {
          active?: boolean
          category_label?: string
          created_at?: string
          detail_label?: string | null
          id?: string
          level_code?: string
          material_label?: string
          month_index?: number
          month_label?: string
          reference_from?: string | null
          reference_to?: string | null
          sort_order?: number
          source_row?: number | null
          source_sheet?: string | null
          template_id?: string
          updated_at?: string
          uses_reference?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_character_target_items_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'lupg_character_target_templates'
            referencedColumns: ['id']
          },
        ]
      }
      lupg_character_target_reports: {
        Row: {
          created_at: string
          discussion_flag: boolean
          id: string
          material_gap: string | null
          monthly_report_id: string
          notes: string | null
          realization_percent: number | null
          reference_from_actual: string | null
          reference_to_actual: string | null
          status: string
          target_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discussion_flag?: boolean
          id?: string
          material_gap?: string | null
          monthly_report_id: string
          notes?: string | null
          realization_percent?: number | null
          reference_from_actual?: string | null
          reference_to_actual?: string | null
          status?: string
          target_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discussion_flag?: boolean
          id?: string
          material_gap?: string | null
          monthly_report_id?: string
          notes?: string | null
          realization_percent?: number | null
          reference_from_actual?: string | null
          reference_to_actual?: string | null
          status?: string
          target_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_character_target_reports_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lupg_character_target_reports_target_item_id_fkey'
            columns: ['target_item_id']
            isOneToOne: false
            referencedRelation: 'lupg_character_target_items'
            referencedColumns: ['id']
          },
        ]
      }
      lupg_character_target_templates: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          level_code: string
          mapping_json: Json
          name: string
          parse_confidence: number | null
          parse_result_json: Json
          parser_method: string
          source_file_path: string | null
          source_file_size: number | null
          source_filename: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          level_code?: string
          mapping_json?: Json
          name: string
          parse_confidence?: number | null
          parse_result_json?: Json
          parser_method?: string
          source_file_path?: string | null
          source_file_size?: number | null
          source_filename?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          level_code?: string
          mapping_json?: Json
          name?: string
          parse_confidence?: number | null
          parse_result_json?: Json
          parser_method?: string
          source_file_path?: string | null
          source_file_size?: number | null
          source_filename?: string | null
          status?: string
          updated_at?: string
          year?: number
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
            foreignKeyName: 'lupg_metric_reports_metric_code_fkey'
            columns: ['metric_code']
            isOneToOne: false
            referencedRelation: 'lupg_metric_definitions'
            referencedColumns: ['code']
          },
          {
            foreignKeyName: 'lupg_metric_reports_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
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
            foreignKeyName: 'lupg_monthly_reports_kelompok_id_fkey'
            columns: ['kelompok_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
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
          template_code: string | null
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
          template_code?: string | null
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
          template_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_mustin_notes_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lupg_mustin_notes_template_code_fkey'
            columns: ['template_code']
            isOneToOne: false
            referencedRelation: 'lupg_mustin_templates'
            referencedColumns: ['code']
          },
        ]
      }
      lupg_mustin_templates: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string
          placeholder: string | null
          sort_order: number
          sub_items: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label: string
          placeholder?: string | null
          sort_order?: number
          sub_items?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string
          placeholder?: string | null
          sort_order?: number
          sub_items?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      lupg_presentation_shares: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kelompok_id: string | null
          month: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kelompok_id?: string | null
          month: string
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kelompok_id?: string | null
          month?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_presentation_shares_kelompok_id_fkey'
            columns: ['kelompok_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
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
          extras: Json
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
          extras?: Json
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
          extras?: Json
          id?: string
          monthly_report_id?: string
          notes?: string | null
          program_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lupg_program_reports_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lupg_program_reports_program_code_fkey'
            columns: ['program_code']
            isOneToOne: false
            referencedRelation: 'lupg_program_definitions'
            referencedColumns: ['code']
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
            foreignKeyName: 'lupg_sarpras_reports_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'lupg_sarpras_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lupg_sarpras_reports_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
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
            foreignKeyName: 'lupg_sensus_kelompok_id_fkey'
            columns: ['kelompok_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
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
            foreignKeyName: 'lupg_sensus_snapshots_kelompok_id_fkey'
            columns: ['kelompok_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lupg_sensus_snapshots_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: false
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
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
            foreignKeyName: 'lupg_shodaqoh_monthly_report_id_fkey'
            columns: ['monthly_report_id']
            isOneToOne: true
            referencedRelation: 'lupg_monthly_reports'
            referencedColumns: ['id']
          },
        ]
      }
      participants: {
        Row: {
          birth_date: string | null
          birth_place: string | null
          category_id: string | null
          created_at: string | null
          gender: string | null
          group_id: string | null
          id: string
          name: string
          status_active: boolean | null
        }
        Insert: {
          birth_date?: string | null
          birth_place?: string | null
          category_id?: string | null
          created_at?: string | null
          gender?: string | null
          group_id?: string | null
          id?: string
          name: string
          status_active?: boolean | null
        }
        Update: {
          birth_date?: string | null
          birth_place?: string | null
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
            foreignKeyName: 'participants_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participants_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
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
      public_dashboard_shares: {
        Row: {
          created_at: string
          created_by: string | null
          display_mode: string
          form_ids: string[]
          form_mode: string
          id: string
          is_active: boolean
          name: string
          scope: string
          token: string
          updated_at: string
          visible_sections: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_mode?: string
          form_ids?: string[]
          form_mode?: string
          id?: string
          is_active?: boolean
          name: string
          scope?: string
          token?: string
          updated_at?: string
          visible_sections?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_mode?: string
          form_ids?: string[]
          form_mode?: string
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          token?: string
          updated_at?: string
          visible_sections?: Json
        }
        Relationships: []
      }
    }
    Views: {
      lupg_sensus_participant_derived: {
        Row: {
          category_code: string | null
          count: number | null
          gender: string | null
          kelompok_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'participants_group_id_fkey'
            columns: ['kelompok_id']
            isOneToOne: false
            referencedRelation: 'lookup_values'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      calculate_age: { Args: { birth: string }; Returns: number }
      get_public_dashboard_payload: {
        Args: { p_month?: string; p_token: string }
        Returns: Json
      }
      get_public_lupg_presentation_payload: {
        Args: { p_token: string }
        Returns: Json
      }
      lupg_activity_photo_path_matches_report: {
        Args: { p_path: string; p_report_id: string }
        Returns: boolean
      }
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
      normalize_participant_name: { Args: { input: string }; Returns: string }
      promote_eligible_gpn: { Args: never; Returns: undefined }
      rotate_lupg_presentation_share: {
        Args: { p_share_id: string }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          kelompok_id: string | null
          month: string
          token: string
        }
        SetofOptions: {
          from: '*'
          to: 'lupg_presentation_shares'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_form_participants: {
        Args: { p_form_id: string; p_query?: string }
        Returns: {
          category_name: string
          gender: string
          group_name: string
          id: string
          name: string
        }[]
      }
      submit_attendance_guarded: {
        Args: {
          p_form_id: string
          p_participant_id: string
          p_permission_description?: string
          p_permission_reason?: string
          p_status: string
          p_temp_category?: string
          p_temp_gender?: string
          p_temp_group?: string
          p_temp_name?: string
        }
        Returns: string
      }
      submit_pending_attendance_guarded: {
        Args: {
          p_birth_date: string
          p_birth_place: string
          p_form_id: string
          p_permission_description: string
          p_permission_reason: string
          p_status: string
          p_temp_category: string
          p_temp_gender: string
          p_temp_group: string
          p_temp_name: string
        }
        Returns: {
          attendance_id: string
          outcome: string
          pending_participant_id: string
        }[]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
