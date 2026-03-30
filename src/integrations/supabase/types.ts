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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          booking_type: string | null
          client_id: string
          client_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          photo_url: string | null
          service_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          booking_type?: string | null
          client_id: string
          client_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          photo_url?: string | null
          service_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_id?: string
          booking_type?: string | null
          client_id?: string
          client_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          photo_url?: string | null
          service_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          payment_method: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          id?: string
          payment_method: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_advances: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          barber_id: string
          created_at: string
          description: string | null
          digital_signature: Json | null
          effective_date: string
          id: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          barber_id: string
          created_at?: string
          description?: string | null
          digital_signature?: Json | null
          effective_date?: string
          id?: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          barber_id?: string
          created_at?: string
          description?: string | null
          digital_signature?: Json | null
          effective_date?: string
          id?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_advances_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_breaks: {
        Row: {
          barber_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_breaks_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_commissions: {
        Row: {
          barber_id: string
          commission_percentage: number
          created_at: string | null
          id: string
          service_id: string
          updated_at: string | null
        }
        Insert: {
          barber_id: string
          commission_percentage: number
          created_at?: string | null
          id?: string
          service_id: string
          updated_at?: string | null
        }
        Update: {
          barber_id?: string
          commission_percentage?: number
          created_at?: string | null
          id?: string
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_commissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_fixed_commissions: {
        Row: {
          barber_id: string
          created_at: string | null
          id: string
          product_commission_percentage: number
          service_commission_percentage: number
          updated_at: string | null
        }
        Insert: {
          barber_id: string
          created_at?: string | null
          id?: string
          product_commission_percentage?: number
          service_commission_percentage?: number
          updated_at?: string | null
        }
        Update: {
          barber_id?: string
          created_at?: string | null
          id?: string
          product_commission_percentage?: number
          service_commission_percentage?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_fixed_commissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_product_commissions: {
        Row: {
          barber_id: string
          commission_percentage: number
          created_at: string | null
          id: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          barber_id: string
          commission_percentage: number
          created_at?: string | null
          id?: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          barber_id?: string
          commission_percentage?: number
          created_at?: string | null
          id?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_product_commissions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_product_commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          availability: Json | null
          created_at: string | null
          experience: string
          id: string
          image_url: string | null
          name: string
          order_index: number | null
          rating: number | null
          specialty: string
          updated_at: string | null
          user_id: string | null
          visible: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          availability?: Json | null
          created_at?: string | null
          experience: string
          id?: string
          image_url?: string | null
          name: string
          order_index?: number | null
          rating?: number | null
          specialty: string
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          availability?: Json | null
          created_at?: string | null
          experience?: string
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number | null
          rating?: number | null
          specialty?: string
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          name: string
          order_index: number | null
          price: number
          stock: number | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          name: string
          order_index?: number | null
          price: number
          stock?: number | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number | null
          price?: number
          stock?: number | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          blocked: boolean | null
          created_at: string | null
          cpf: string | null
          id: string
          is_temp_user: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          blocked?: boolean | null
          created_at?: string | null
          cpf?: string | null
          id: string
          is_temp_user?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          blocked?: boolean | null
          created_at?: string | null
          cpf?: string | null
          id?: string
          is_temp_user?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      product_sales: {
        Row: {
          barber_id: string
          client_id: string | null
          commission_percentage: number
          commission_value: number
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          photo_url: string | null
          product_id: string
          quantity: number
          sale_date: string
          sale_time: string
          status: string
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          barber_id: string
          client_id?: string | null
          commission_percentage?: number
          commission_value?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          photo_url?: string | null
          product_id: string
          quantity?: number
          sale_date?: string
          sale_time?: string
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          barber_id?: string
          client_id?: string | null
          commission_percentage?: number
          commission_value?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          photo_url?: string | null
          product_id?: string
          quantity?: number
          sale_date?: string
          sale_time?: string
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          barber_id: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh_key: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth_key: string
          barber_id: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth_key?: string
          barber_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string
          duration: number | null
          icon: string
          id: string
          image_url: string | null
          order_index: number | null
          price: number
          title: string
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          created_at?: string | null
          description: string
          duration?: number | null
          icon: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          price: number
          title: string
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string
          duration?: number | null
          icon?: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          price?: number
          title?: string
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      site_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cliente" | "barbeiro" | "gestor"
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
      app_role: ["admin", "cliente", "barbeiro", "gestor"],
    },
  },
} as const
