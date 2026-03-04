export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: '14.1' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          email: string
          employee_id: string
          full_name: string | null
          role: string | null
          department: string | null
          county: string | null
          phone: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          employee_id: string
          full_name?: string | null
          role?: string | null
          department?: string | null
          county?: string | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          employee_id?: string
          full_name?: string | null
          role?: string | null
          department?: string | null
          county?: string | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          id: string
          title: string
          message: string
          severity: "amber" | "severe" | "extreme"
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          message: string
          severity: "amber" | "severe" | "extreme"
          created_at?: string | null
        }
        Update: {
          id?: string
          title: string
          message: string
          severity?: "amber" | "severe" | "extreme"
          created_at?: string | null
        }
        Relationships: []
      }
      alert_rules: {
        Row: {
          channels: string[] | null
          condition: string
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          name: string
          triggered_count: number | null
        }
        Insert: {
          channels?: string[] | null
          condition: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          name: string
          triggered_count?: number | null
        }
        Update: {
          channels?: string[] | null
          condition?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          triggered_count?: number | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          id: string
          message: string
          rule_name: string
          severity: string
          sos_alert_id: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: string
          message: string
          rule_name: string
          severity: string
          sos_alert_id?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: string
          message?: string
          rule_name?: string
          severity?: string
          sos_alert_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_sos_alert_id_fkey"
            columns: ["sos_alert_id"]
            isOneToOne: false
            referencedRelation: "sos_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          incident_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          incident_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          incident_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_timeline: {
        Row: {
          created_at: string
          description: string | null
          id: string
          incident_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          incident_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          incident_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_timeline_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          anonymity: boolean | null
          assigned_team_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          location_name: string | null
          media_urls: string[] | null
          severity: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anonymity?: boolean | null
          assigned_team_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          location_name?: string | null
          media_urls?: string[] | null
          severity?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anonymity?: boolean | null
          assigned_team_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          location_name?: string | null
          media_urls?: string[] | null
          severity?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          payload: Json | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payload?: Json | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payload?: Json | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accuracy_score: number | null
          avatar_url: string | null
          bio: string | null
          blood_group: string | null
          category_affinity: Json | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          interaction_count: number | null
          location_focal_point: unknown | null
          location_name: string | null
          medical_conditions: string | null
          notification_prefs: Json | null
          privacy_settings: Json | null
          push_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          avatar_url?: string | null
          bio?: string | null
          blood_group?: string | null
          category_affinity?: Json | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id: string
          interaction_count?: number | null
          location_focal_point?: unknown | null
          location_name?: string | null
          medical_conditions?: string | null
          notification_prefs?: Json | null
          privacy_settings?: Json | null
          push_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          avatar_url?: string | null
          bio?: string | null
          blood_group?: string | null
          category_affinity?: Json | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          interaction_count?: number | null
          location_focal_point?: unknown | null
          location_name?: string | null
          medical_conditions?: string | null
          notification_prefs?: Json | null
          privacy_settings?: Json | null
          push_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          location_name: string | null
          notes: string | null
          resolved_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          location_name?: string | null
          notes?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          location_name?: string | null
          notes?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_resource: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_resource: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_staff_logs_profile"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          type: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      broadcast_severity: "amber" | "severe" | "extreme"
      incident_severity: "Low" | "Medium" | "High" | "Critical"
      incident_status: "Pending" | "Verified" | "In-Progress" | "Resolved" | "Rejected"
      user_role: "reporter" | "responder" | "admin" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
