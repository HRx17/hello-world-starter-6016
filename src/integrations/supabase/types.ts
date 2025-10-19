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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_results: {
        Row: {
          analyzed_at: string | null
          id: string
          project_id: string
          score: number
          screenshot: string | null
          user_id: string
          violations: Json
        }
        Insert: {
          analyzed_at?: string | null
          id?: string
          project_id: string
          score: number
          screenshot?: string | null
          user_id: string
          violations: Json
        }
        Update: {
          analyzed_at?: string | null
          id?: string
          project_id?: string
          score?: number
          screenshot?: string | null
          user_id?: string
          violations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          created_at: string | null
          id: string
          name: string
          project_ids: string[]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          project_ids: string[]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          project_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_clusters: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          study_plan_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          study_plan_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          study_plan_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_clusters_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          conducted_at: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          interview_guide: Json | null
          notes: string | null
          participant_details: Json | null
          participant_name: string
          scheduled_at: string | null
          status: string | null
          study_plan_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conducted_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          interview_guide?: Json | null
          notes?: string | null
          participant_details?: Json | null
          participant_name: string
          scheduled_at?: string | null
          status?: string | null
          study_plan_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conducted_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          interview_guide?: Json | null
          notes?: string | null
          participant_details?: Json | null
          participant_name?: string
          scheduled_at?: string | null
          status?: string | null
          study_plan_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analyses: {
        Row: {
          analyzed_at: string | null
          crawl_id: string
          created_at: string | null
          html_snapshot: string | null
          id: string
          page_title: string | null
          page_type: string | null
          page_url: string
          score: number | null
          screenshot: string | null
          strengths: Json | null
          violations: Json
        }
        Insert: {
          analyzed_at?: string | null
          crawl_id: string
          created_at?: string | null
          html_snapshot?: string | null
          id?: string
          page_title?: string | null
          page_type?: string | null
          page_url: string
          score?: number | null
          screenshot?: string | null
          strengths?: Json | null
          violations?: Json
        }
        Update: {
          analyzed_at?: string | null
          crawl_id?: string
          created_at?: string | null
          html_snapshot?: string | null
          id?: string
          page_title?: string | null
          page_type?: string | null
          page_url?: string
          score?: number | null
          screenshot?: string | null
          strengths?: Json | null
          violations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "page_analyses_crawl_id_fkey"
            columns: ["crawl_id"]
            isOneToOne: false
            referencedRelation: "website_crawls"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          avatar_url: string | null
          behaviors: Json | null
          created_at: string | null
          demographics: Json | null
          description: string | null
          goals: string[] | null
          id: string
          name: string
          pain_points: string[] | null
          study_plan_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          behaviors?: Json | null
          created_at?: string | null
          demographics?: Json | null
          description?: string | null
          goals?: string[] | null
          id?: string
          name: string
          pain_points?: string[] | null
          study_plan_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          behaviors?: Json | null
          created_at?: string | null
          demographics?: Json | null
          description?: string | null
          goals?: string[] | null
          id?: string
          name?: string
          pain_points?: string[] | null
          study_plan_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_shares: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["app_role"]
          shared_with_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          framework: string | null
          id: string
          name: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          framework?: string | null
          id?: string
          name: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          framework?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_observations: {
        Row: {
          cluster_id: string | null
          content: string
          created_at: string | null
          id: string
          interview_session_id: string | null
          observation_type: string
          study_plan_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cluster_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          interview_session_id?: string | null
          observation_type: string
          study_plan_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cluster_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          interview_session_id?: string | null
          observation_type?: string
          study_plan_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_observations_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_observations_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          ai_suggestions: Json | null
          created_at: string | null
          id: string
          participant_criteria: string | null
          plan_steps: Json | null
          problem_statement: string
          project_id: string | null
          research_methods: string[] | null
          solution_goal: string
          status: string | null
          timeline: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_suggestions?: Json | null
          created_at?: string | null
          id?: string
          participant_criteria?: string | null
          plan_steps?: Json | null
          problem_statement: string
          project_id?: string | null
          research_methods?: string[] | null
          solution_goal: string
          status?: string | null
          timeline?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_suggestions?: Json | null
          created_at?: string | null
          id?: string
          participant_criteria?: string | null
          plan_steps?: Json | null
          problem_statement?: string
          project_id?: string | null
          research_methods?: string[] | null
          solution_goal?: string
          status?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          default_framework: string | null
          default_heuristics: Json | null
          email_notifications: boolean | null
          id: string
          theme: string | null
          updated_at: string | null
          user_id: string
          weekly_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          default_framework?: string | null
          default_heuristics?: Json | null
          email_notifications?: boolean | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id: string
          weekly_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          default_framework?: string | null
          default_heuristics?: Json | null
          email_notifications?: boolean | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      violation_comments: {
        Row: {
          analysis_id: string
          comment: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          violation_index: number
        }
        Insert: {
          analysis_id: string
          comment: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          violation_index: number
        }
        Update: {
          analysis_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          violation_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "violation_comments_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analysis_results"
            referencedColumns: ["id"]
          },
        ]
      }
      website_crawls: {
        Row: {
          aggregate_strengths: Json | null
          aggregate_violations: Json | null
          analyzed_pages: number | null
          completed_at: string | null
          crawled_pages: number | null
          created_at: string | null
          error_message: string | null
          firecrawl_job_id: string | null
          id: string
          metadata: Json | null
          overall_score: number | null
          project_id: string | null
          status: string
          total_pages: number | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          aggregate_strengths?: Json | null
          aggregate_violations?: Json | null
          analyzed_pages?: number | null
          completed_at?: string | null
          crawled_pages?: number | null
          created_at?: string | null
          error_message?: string | null
          firecrawl_job_id?: string | null
          id?: string
          metadata?: Json | null
          overall_score?: number | null
          project_id?: string | null
          status?: string
          total_pages?: number | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          aggregate_strengths?: Json | null
          aggregate_violations?: Json | null
          analyzed_pages?: number | null
          completed_at?: string | null
          crawled_pages?: number | null
          created_at?: string | null
          error_message?: string | null
          firecrawl_job_id?: string | null
          id?: string
          metadata?: Json | null
          overall_score?: number | null
          project_id?: string | null
          status?: string
          total_pages?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_crawls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      parse_ai_suggestions_to_steps: {
        Args: { ai_text: string }
        Returns: Json
      }
      project_shared_with_user: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
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
    Enums: {
      app_role: ["admin", "member", "viewer"],
    },
  },
} as const
