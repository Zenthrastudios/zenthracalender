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
      availability: {
        Row: {
          created_at: string
          end_time: number
          id: string
          schedule_id: string | null
          start_time: number
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: number
          id?: string
          schedule_id?: string | null
          start_time: number
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: number
          id?: string
          schedule_id?: string | null
          start_time?: number
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          }
        ]
      }
      availability_schedules: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      availability_overrides: {
        Row: {
          created_at: string
          date: string
          end_time: number | null
          id: string
          is_unavailable: boolean
          start_time: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: number | null
          id?: string
          is_unavailable?: boolean
          start_time?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: number | null
          id?: string
          is_unavailable?: boolean
          start_time?: number | null
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          attendee_timezone: string
          cancel_token: string | null
          created_at: string
          custom_responses: Json | null
          end_time: string
          event_type_id: string
          google_event_id: string | null
          host_id: string
          id: string
          meet_link: string | null
          notes: string | null
          reminder_sent: boolean | null
          reschedule_token: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          attendee_timezone?: string
          cancel_token?: string | null
          created_at?: string
          custom_responses?: Json | null
          end_time: string
          event_type_id: string
          google_event_id?: string | null
          host_id: string
          id?: string
          meet_link?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          reschedule_token?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          attendee_timezone?: string
          cancel_token?: string | null
          created_at?: string
          custom_responses?: Json | null
          end_time?: string
          event_type_id?: string
          google_event_id?: string | null
          host_id?: string
          id?: string
          meet_link?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          reschedule_token?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          buffer_after: number
          buffer_before: number
          banner_image_url: string | null
          color: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          duration: number
          id: string
          instructor_id: string | null
          is_active: boolean
          is_paid: boolean | null
          location_type: string
          location_value: string | null
          minimum_notice: number
          payment_provider: string | null
          price: number | null
          schedule_id: string | null
          social_links: Json | null
          show_testimonials: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buffer_after?: number
          buffer_before?: number
          banner_image_url?: string | null
          color?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          duration?: number
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          is_paid?: boolean | null
          location_type?: string
          location_value?: string | null
          minimum_notice?: number
          payment_provider?: string | null
          price?: number | null
          schedule_id?: string | null
          social_links?: Json | null
          show_testimonials?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buffer_after?: number
          buffer_before?: number
          banner_image_url?: string | null
          color?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          duration?: number
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          is_paid?: boolean | null
          location_type?: string
          location_value?: string | null
          minimum_notice?: number
          payment_provider?: string | null
          price?: number | null
          schedule_id?: string | null
          social_links?: Json | null
          show_testimonials?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_types_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_types_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          specialization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          specialization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_title: string | null
          avatar_url: string | null
          content: string
          created_at: string
          created_by: string
          event_type_id: string
          id: string
          is_visible: boolean
          rating: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          author_name: string
          author_title?: string | null
          avatar_url?: string | null
          content: string
          created_at?: string
          created_by?: string
          event_type_id: string
          id?: string
          is_visible?: boolean
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_title?: string | null
          avatar_url?: string | null
          content?: string
          created_at?: string
          created_by?: string
          event_type_id?: string
          id?: string
          is_visible?: boolean
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string
          payment_id: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id: string
          payment_id?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          timezone: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string
          created_at: string
          id: string
          provider: string
          provider_email: string | null
          provider_user_id: string | null
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          provider: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          provider?: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_settings: {
        Row: {
          api_key: string
          business_account_id: string | null
          created_at: string
          customer_template_name: string | null
          id: string
          instructor_template_name: string | null
          is_enabled: boolean
          phone_number_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          business_account_id?: string | null
          created_at?: string
          customer_template_name?: string | null
          id?: string
          instructor_template_name?: string | null
          is_enabled?: boolean
          phone_number_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          business_account_id?: string | null
          created_at?: string
          customer_template_name?: string | null
          id?: string
          instructor_template_name?: string | null
          is_enabled?: boolean
          phone_number_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "guest"
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
      app_role: ["admin", "guest"],
    },
  },
} as const
