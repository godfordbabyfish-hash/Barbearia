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
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          changed_fields: string[]
          id: number
          module: string
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          record_id: string | null
          source: string
          table_name: string
          transaction_id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: string[]
          id?: never
          module: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          source?: string
          table_name: string
          transaction_id?: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: string[]
          id?: never
          module?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          source?: string
          table_name?: string
          transaction_id?: number
        }
        Relationships: []
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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          booking_type: string | null
          client_id: string
          client_name: string | null
          commission_basis: string | null
          created_at: string | null
          discount_amount: number
          final_price: number | null
          id: string
          notes: string | null
          original_price: number | null
          payment_method: string | null
          photo_url: string | null
          referral_coupon_id: string | null
          reminder_sent: boolean | null
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
          commission_basis?: string | null
          created_at?: string | null
          discount_amount?: number
          final_price?: number | null
          id?: string
          notes?: string | null
          original_price?: number | null
          payment_method?: string | null
          photo_url?: string | null
          referral_coupon_id?: string | null
          reminder_sent?: boolean | null
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
          commission_basis?: string | null
          created_at?: string | null
          discount_amount?: number
          final_price?: number | null
          id?: string
          notes?: string | null
          original_price?: number | null
          payment_method?: string | null
          photo_url?: string | null
          referral_coupon_id?: string | null
          reminder_sent?: boolean | null
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
            foreignKeyName: "appointments_referral_coupon_id_fkey"
            columns: ["referral_coupon_id"]
            isOneToOne: false
            referencedRelation: "referral_coupons"
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
            isOneToOne: true
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
      barber_schedules: {
        Row: {
          barber_id: string
          close: string
          closed: boolean
          created_at: string
          date: string
          has_lunch: boolean
          has_pause: boolean
          id: string
          lunch_end: string | null
          lunch_start: string | null
          observation: string | null
          open: string
          pause_end: string | null
          pause_start: string | null
          updated_at: string
        }
        Insert: {
          barber_id: string
          close?: string
          closed?: boolean
          created_at?: string
          date: string
          has_lunch?: boolean
          has_pause?: boolean
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          observation?: string | null
          open?: string
          pause_end?: string | null
          pause_start?: string | null
          updated_at?: string
        }
        Update: {
          barber_id?: string
          close?: string
          closed?: boolean
          created_at?: string
          date?: string
          has_lunch?: boolean
          has_pause?: boolean
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          observation?: string | null
          open?: string
          pause_end?: string | null
          pause_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          availability: Json | null
          created_at: string | null
          experience: string | null
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
          experience?: string | null
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
          experience?: string | null
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
      daily_cash_movements: {
        Row: {
          amount: number
          cash_session_id: string
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          movement_type: string
          reason: string
        }
        Insert: {
          amount: number
          cash_session_id: string
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          movement_type: string
          reason: string
        }
        Update: {
          amount?: number
          cash_session_id?: string
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          movement_type?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_movements_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "daily_cash_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cash_sessions: {
        Row: {
          business_date: string
          card_sales: number | null
          cash_difference: number | null
          cash_sales: number | null
          close_idempotency_key: string | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          counted_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          open_idempotency_key: string
          opened_at: string
          opened_by: string
          opening_balance: number
          opening_notes: string | null
          other_sales: number | null
          pix_sales: number | null
          status: string
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          business_date: string
          card_sales?: number | null
          cash_difference?: number | null
          cash_sales?: number | null
          close_idempotency_key?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          counted_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          open_idempotency_key: string
          opened_at?: string
          opened_by: string
          opening_balance?: number
          opening_notes?: string | null
          other_sales?: number | null
          pix_sales?: number | null
          status?: string
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          business_date?: string
          card_sales?: number | null
          cash_difference?: number | null
          cash_sales?: number | null
          close_idempotency_key?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_notes?: string | null
          counted_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          open_idempotency_key?: string
          opened_at?: string
          opened_by?: string
          opening_balance?: number
          opening_notes?: string | null
          other_sales?: number | null
          pix_sales?: number | null
          status?: string
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_recurrence_rules: {
        Row: {
          active: boolean
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          end_date: string | null
          frequency: string
          id: string
          interval_count: number
          next_due_date: string
          notes: string | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          end_date?: string | null
          frequency: string
          id?: string
          interval_count?: number
          next_due_date: string
          notes?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          next_due_date?: string
          notes?: string | null
          supplier?: string | null
          updated_at?: string
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
      management_alert_states: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_key: string
          created_at: string
          fingerprint: string
          note: string | null
          snoozed_until: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key: string
          created_at?: string
          fingerprint: string
          note?: string | null
          snoozed_until?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_key?: string
          created_at?: string
          fingerprint?: string
          note?: string | null
          snoozed_until?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      managerial_financial_closure_audit: {
        Row: {
          actor_id: string
          closure_id: string
          event_at: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
        }
        Insert: {
          actor_id: string
          closure_id: string
          event_at?: string
          event_type: string
          id?: string
          metadata?: Json
          reason?: string | null
        }
        Update: {
          actor_id?: string
          closure_id?: string
          event_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managerial_financial_closure_audit_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "managerial_financial_closures"
            referencedColumns: ["id"]
          },
        ]
      }
      managerial_financial_closures: {
        Row: {
          approved_advances: number
          cash_difference: number
          closed_at: string
          closed_by: string
          created_at: string
          discounts_granted: number
          gross_commissions: number
          gross_revenue: number
          id: string
          idempotency_key: string
          net_profit: number
          notes: string | null
          operational_expenses: number
          period_end: string
          period_start: string
          previous_closure_id: string | null
          product_commissions: number
          product_revenue: number
          reopened_at: string | null
          reopened_by: string | null
          reopening_reason: string | null
          revision: number
          service_commissions: number
          service_revenue: number
          snapshot: Json
          status: string
          supply_consumption_cost: number
          updated_at: string
        }
        Insert: {
          approved_advances?: number
          cash_difference?: number
          closed_at?: string
          closed_by: string
          created_at?: string
          discounts_granted?: number
          gross_commissions?: number
          gross_revenue?: number
          id?: string
          idempotency_key: string
          net_profit?: number
          notes?: string | null
          operational_expenses?: number
          period_end: string
          period_start: string
          previous_closure_id?: string | null
          product_commissions?: number
          product_revenue?: number
          reopened_at?: string | null
          reopened_by?: string | null
          reopening_reason?: string | null
          revision?: number
          service_commissions?: number
          service_revenue?: number
          snapshot: Json
          status?: string
          supply_consumption_cost?: number
          updated_at?: string
        }
        Update: {
          approved_advances?: number
          cash_difference?: number
          closed_at?: string
          closed_by?: string
          created_at?: string
          discounts_granted?: number
          gross_commissions?: number
          gross_revenue?: number
          id?: string
          idempotency_key?: string
          net_profit?: number
          notes?: string | null
          operational_expenses?: number
          period_end?: string
          period_start?: string
          previous_closure_id?: string | null
          product_commissions?: number
          product_revenue?: number
          reopened_at?: string | null
          reopened_by?: string | null
          reopening_reason?: string | null
          revision?: number
          service_commissions?: number
          service_revenue?: number
          snapshot?: Json
          status?: string
          supply_consumption_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managerial_financial_closures_previous_closure_id_fkey"
            columns: ["previous_closure_id"]
            isOneToOne: false
            referencedRelation: "managerial_financial_closures"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_expense_audit: {
        Row: {
          actor_id: string | null
          event_at: string
          event_type: string
          expense_id: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          actor_id?: string | null
          event_at?: string
          event_type: string
          expense_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          actor_id?: string | null
          event_at?: string
          event_type?: string
          expense_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_expense_audit_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "operational_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_expenses: {
        Row: {
          amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          document_reference: string | null
          due_date: string | null
          expense_date: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          recurrence_occurrence: string | null
          recurring_rule_id: string | null
          status: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          document_reference?: string | null
          due_date?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          recurrence_occurrence?: string | null
          recurring_rule_id?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          document_reference?: string | null
          due_date?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          recurrence_occurrence?: string | null
          recurring_rule_id?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_expenses_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "expense_recurrence_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_usage_snapshots: {
        Row: {
          appointments_created: number
          completed_services: number
          created_at: string
          id: string
          new_clients: number
          snapshot_date: string
          updated_at: string
          whatsapp_failed: number
          whatsapp_pending: number
        }
        Insert: {
          appointments_created?: number
          completed_services?: number
          created_at?: string
          id?: string
          new_clients?: number
          snapshot_date: string
          updated_at?: string
          whatsapp_failed?: number
          whatsapp_pending?: number
        }
        Update: {
          appointments_created?: number
          completed_services?: number
          created_at?: string
          id?: string
          new_clients?: number
          snapshot_date?: string
          updated_at?: string
          whatsapp_failed?: number
          whatsapp_pending?: number
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
          contact_email: string | null
          cpf: string | null
          created_at: string | null
          id: string
          is_temp_user: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          referral_code: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          birth_date?: string | null
          blocked?: boolean | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          is_temp_user?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          referral_code?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          birth_date?: string | null
          blocked?: boolean | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          is_temp_user?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          referral_code?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
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
      referral_coupons: {
        Row: {
          created_at: string
          discount_amount_limit: number | null
          discount_percent: number
          expires_at: string
          id: string
          owner_id: string
          referral_id: string | null
          status: string
          used_appointment_id: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          discount_amount_limit?: number | null
          discount_percent: number
          expires_at: string
          id?: string
          owner_id: string
          referral_id?: string | null
          status?: string
          used_appointment_id?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          discount_amount_limit?: number | null
          discount_percent?: number
          expires_at?: string
          id?: string
          owner_id?: string
          referral_id?: string | null
          status?: string
          used_appointment_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_coupons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_coupons_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_coupons_used_appointment_id_fkey"
            columns: ["used_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_notification_logs: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          notification_type: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          notification_type: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          notification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_notification_logs_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "referral_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualified_at: string | null
          qualifying_appointment_id: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualified_at?: string | null
          qualifying_appointment_id?: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualified_at?: string | null
          qualifying_appointment_id?: string | null
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_qualifying_appointment_id_fkey"
            columns: ["qualifying_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      shop_schedules: {
        Row: {
          close: string
          closed: boolean
          created_at: string
          date: string
          has_lunch: boolean
          has_pause: boolean
          id: string
          lunch_end: string | null
          lunch_start: string | null
          observation: string | null
          open: string
          pause_end: string | null
          pause_start: string | null
          updated_at: string
        }
        Insert: {
          close?: string
          closed?: boolean
          created_at?: string
          date: string
          has_lunch?: boolean
          has_pause?: boolean
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          observation?: string | null
          open?: string
          pause_end?: string | null
          pause_start?: string | null
          updated_at?: string
        }
        Update: {
          close?: string
          closed?: boolean
          created_at?: string
          date?: string
          has_lunch?: boolean
          has_pause?: boolean
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          observation?: string | null
          open?: string
          pause_end?: string | null
          pause_start?: string | null
          updated_at?: string
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
      supply_alert_notifications: {
        Row: {
          alert_date: string
          alert_key: string
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          message: string
          sent_at: string | null
          status: string
        }
        Insert: {
          alert_date: string
          alert_key: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          message: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          alert_date?: string
          alert_key?: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          message?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      supply_batches: {
        Row: {
          created_at: string
          created_by: string
          expires_on: string | null
          id: string
          invoice_reference: string | null
          item_id: string
          notes: string | null
          purchased_on: string
          quantity_received: number
          quantity_remaining: number
          supplier: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_on?: string | null
          id?: string
          invoice_reference?: string | null
          item_id: string
          notes?: string | null
          purchased_on?: string
          quantity_received: number
          quantity_remaining: number
          supplier?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_on?: string | null
          id?: string
          invoice_reference?: string | null
          item_id?: string
          notes?: string | null
          purchased_on?: string
          quantity_received?: number
          quantity_remaining?: number
          supplier?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "supply_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "supply_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_consumption_allocations: {
        Row: {
          batch_id: string
          consumption_id: string
          created_at: string
          id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          batch_id: string
          consumption_id: string
          created_at?: string
          id?: string
          quantity: number
          unit_cost: number
        }
        Update: {
          batch_id?: string
          consumption_id?: string
          created_at?: string
          id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "supply_consumption_allocations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "supply_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_consumption_allocations_consumption_id_fkey"
            columns: ["consumption_id"]
            isOneToOne: false
            referencedRelation: "supply_consumptions"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_consumptions: {
        Row: {
          barber_id: string
          consumption_date: string
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          item_id: string
          notes: string | null
          quantity: number
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
        }
        Insert: {
          barber_id: string
          consumption_date: string
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          item_id: string
          notes?: string | null
          quantity: number
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
        }
        Update: {
          barber_id?: string
          consumption_date?: string
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_consumptions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_consumptions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "supply_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_items: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string
          expiry_warning_days: number
          id: string
          minimum_stock: number
          name: string
          notes: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          created_by: string
          expiry_warning_days?: number
          id?: string
          minimum_stock?: number
          name: string
          notes?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string
          expiry_warning_days?: number
          id?: string
          minimum_stock?: number
          name?: string
          notes?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      supply_movements: {
        Row: {
          actor_id: string
          barber_id: string | null
          batch_id: string | null
          consumption_id: string | null
          created_at: string
          id: string
          item_id: string
          movement_date: string
          movement_type: string
          notes: string | null
          quantity: number
          unit_cost: number
        }
        Insert: {
          actor_id: string
          barber_id?: string | null
          batch_id?: string | null
          consumption_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          quantity: number
          unit_cost?: number
        }
        Update: {
          actor_id?: string
          barber_id?: string | null
          batch_id?: string | null
          consumption_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "supply_movements_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "supply_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_movements_consumption_id_fkey"
            columns: ["consumption_id"]
            isOneToOne: false
            referencedRelation: "supply_consumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "supply_items"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_financial_closures: {
        Row: {
          barber_id: string
          closed_at: string
          closed_by: string
          competence_month: number
          competence_year: number
          created_at: string
          id: string
          snapshot: Json
          week_end: string
          week_number: number
          week_start: string
        }
        Insert: {
          barber_id: string
          closed_at?: string
          closed_by: string
          competence_month: number
          competence_year: number
          created_at?: string
          id?: string
          snapshot: Json
          week_end: string
          week_number: number
          week_start: string
        }
        Update: {
          barber_id?: string
          closed_at?: string
          closed_by?: string
          competence_month?: number
          competence_year?: number
          created_at?: string
          id?: string
          snapshot?: Json
          week_end?: string
          week_number?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_financial_closures_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ai_conversations: {
        Row: {
          created_at: string
          customer_name: string | null
          last_message_at: string
          paused_until: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          last_message_at?: string
          paused_until?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          last_message_at?: string
          paused_until?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_ai_messages: {
        Row: {
          content: string
          created_at: string
          delivery_status: string
          direction: string
          external_message_id: string | null
          id: string
          metadata: Json
          phone: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          delivery_status?: string
          direction: string
          external_message_id?: string | null
          id?: string
          metadata?: Json
          phone: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          delivery_status?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          metadata?: Json
          phone?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_messages_phone_fkey"
            columns: ["phone"]
            isOneToOne: false
            referencedRelation: "whatsapp_ai_conversations"
            referencedColumns: ["phone"]
          },
        ]
      }
      whatsapp_inactive_client_logs: {
        Row: {
          activity_date: string
          client_id: string
          cycle_number: number
          id: string
          inactivity_days: number
          queued_at: string
        }
        Insert: {
          activity_date: string
          client_id: string
          cycle_number: number
          id?: string
          inactivity_days: number
          queued_at?: string
        }
        Update: {
          activity_date?: string
          client_id?: string
          cycle_number?: number
          id?: string
          inactivity_days?: number
          queued_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_inactive_client_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications_queue: {
        Row: {
          appointment_id: string | null
          attempts: number | null
          client_name: string
          client_phone: string
          created_at: string | null
          error_message: string | null
          id: string
          message_action: string
          payload: Json
          processed_at: string | null
          status: string | null
          target_name: string | null
          target_phone: string | null
          target_type: string | null
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number | null
          client_name: string
          client_phone: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_action: string
          payload: Json
          processed_at?: string | null
          status?: string | null
          target_name?: string | null
          target_phone?: string | null
          target_type?: string | null
        }
        Update: {
          appointment_id?: string | null
          attempts?: number | null
          client_name?: string
          client_phone?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_action?: string
          payload?: Json
          processed_at?: string | null
          status?: string | null
          target_name?: string | null
          target_phone?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_report_logs: {
        Row: {
          created_at: string
          error_message: string | null
          goals_daily_pct: number
          goals_monthly_pct: number
          goals_weekly_pct: number
          gross_revenue: number
          id: string
          metadata: Json
          net_profit: number
          period_end: string | null
          period_start: string | null
          phone_number: string | null
          report_type: string
          roi: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          goals_daily_pct?: number
          goals_monthly_pct?: number
          goals_weekly_pct?: number
          gross_revenue?: number
          id?: string
          metadata?: Json
          net_profit?: number
          period_end?: string | null
          period_start?: string | null
          phone_number?: string | null
          report_type: string
          roi?: number
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          goals_daily_pct?: number
          goals_monthly_pct?: number
          goals_weekly_pct?: number
          gross_revenue?: number
          id?: string
          metadata?: Json
          net_profit?: number
          period_end?: string | null
          period_start?: string | null
          phone_number?: string | null
          report_type?: string
          roi?: number
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_bulk_commission: {
        Args: { p_barber_id?: string; p_kind: string; p_percentage: number }
        Returns: Json
      }
      calculate_daily_cash_totals: {
        Args: { p_business_date: string }
        Returns: Json
      }
      cancel_operational_expense: {
        Args: { p_expense_id: string; p_reason: string }
        Returns: {
          amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          document_reference: string | null
          due_date: string | null
          expense_date: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          recurrence_occurrence: string | null
          recurring_rule_id: string | null
          status: string
          supplier: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "operational_expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_own_appointment: {
        Args: { p_appointment_id: string; p_reason?: string }
        Returns: boolean
      }
      claim_referral: {
        Args: { p_code: string }
        Returns: {
          created_at: string
          id: string
          qualified_at: string | null
          qualifying_appointment_id: string | null
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_daily_cash: {
        Args: {
          p_cash_session_id: string
          p_closing_notes: string
          p_counted_cash: number
          p_idempotency_key: string
        }
        Returns: {
          business_date: string
          card_sales: number | null
          cash_difference: number | null
          cash_sales: number | null
          close_idempotency_key: string | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          counted_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          open_idempotency_key: string
          opened_at: string
          opened_by: string
          opening_balance: number
          opening_notes: string | null
          other_sales: number | null
          pix_sales: number | null
          status: string
          total_sales: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_cash_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_managerial_financial_period: {
        Args: {
          p_idempotency_key: string
          p_notes: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          approved_advances: number
          cash_difference: number
          closed_at: string
          closed_by: string
          created_at: string
          discounts_granted: number
          gross_commissions: number
          gross_revenue: number
          id: string
          idempotency_key: string
          net_profit: number
          notes: string | null
          operational_expenses: number
          period_end: string
          period_start: string
          previous_closure_id: string | null
          product_commissions: number
          product_revenue: number
          reopened_at: string | null
          reopened_by: string | null
          reopening_reason: string | null
          revision: number
          service_commissions: number
          service_revenue: number
          snapshot: Json
          status: string
          supply_consumption_cost: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "managerial_financial_closures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_appointment_with_referral: {
        Args: {
          p_appointment_id: string
          p_coupon_id?: string
          p_payments: Json
          p_photo_url?: string
        }
        Returns: Json
      }
      create_supply_batch: {
        Args: {
          p_expires_on?: string
          p_invoice_reference?: string
          p_item_id: string
          p_notes?: string
          p_purchased_on: string
          p_quantity: number
          p_supplier?: string
          p_total_cost: number
        }
        Returns: string
      }
      delete_barber_advance_admin: {
        Args: { advance_id: string }
        Returns: Json
      }
      expire_referral_coupons: { Args: never; Returns: number }
      generate_due_recurring_expenses: {
        Args: { p_until?: string }
        Returns: number
      }
      get_barber_busy_slots: {
        Args: { p_barber_id: string; p_date: string }
        Returns: {
          appointment_time: string
          duration: number
        }[]
      }
      get_barber_productivity_metrics: {
        Args: { p_end: string; p_start: string }
        Returns: {
          available_minutes: number
          average_ticket: number
          barber_id: string
          barber_name: string
          booked_minutes: number
          cancellation_rate: number
          cancelled_appointments: number
          completed_appointments: number
          completion_rate: number
          distinct_clients: number
          idle_minutes: number
          image_url: string
          occupancy_rate: number
          pending_finalizations: number
          product_revenue: number
          product_sales: number
          productive_minutes: number
          productive_rate: number
          revenue_per_available_hour: number
          service_revenue: number
          total_appointments: number
        }[]
      }
      get_daily_cash_summary: {
        Args: { p_business_date: string }
        Returns: Json
      }
      get_management_alerts: {
        Args: { p_include_handled?: boolean }
        Returns: {
          acknowledged_at: string
          acknowledged_by: string
          action_label: string
          alert_key: string
          amount: number
          fingerprint: string
          item_count: number
          message: string
          module: string
          severity: string
          snoozed_until: string
          source_updated_at: string
          state_status: string
          target_tab: string
          title: string
        }[]
      }
      get_management_demand_forecast: {
        Args: { p_horizon_days?: number; p_reference_date?: string }
        Returns: Json
      }
      get_public_daily_queue: {
        Args: never
        Returns: {
          appointment_date: string
          appointment_id: string
          appointment_time: string
          barber_id: string
          booking_type: string
          client_display_name: string
          duration: number
          service_title: string
          status: string
        }[]
      }
      get_referrer_display_name: { Args: { p_code: string }; Returns: string }
      get_service_booking_counts: {
        Args: never
        Returns: {
          booking_count: number
          service_id: string
        }[]
      }
      get_supply_stock: {
        Args: never
        Returns: {
          active: boolean
          category: string
          current_stock: number
          expiry_warning_days: number
          item_id: string
          minimum_stock: number
          name: string
          nearest_expiry: string
          notes: string
          unit: string
        }[]
      }
      get_whatsapp_ai_api_key: { Args: never; Returns: string }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      has_whatsapp_ai_api_key: { Args: never; Returns: boolean }
      invoke_referral_coupon_reminder: { Args: never; Returns: undefined }
      invoke_sync_supabase_usage: { Args: never; Returns: undefined }
      invoke_whatsapp_daily_report: { Args: never; Returns: undefined }
      invoke_whatsapp_reminder: { Args: never; Returns: undefined }
      is_referral_staff: { Args: never; Returns: boolean }
      limpar_fila_whatsapp_antiga: { Args: never; Returns: undefined }
      limpar_logs_relatorio_whatsapp_antigos: {
        Args: never
        Returns: undefined
      }
      next_expense_due_date: {
        Args: { p_due_date: string; p_frequency: string; p_interval: number }
        Returns: string
      }
      open_daily_cash: {
        Args: {
          p_business_date: string
          p_idempotency_key: string
          p_opening_balance: number
          p_opening_notes: string
        }
        Returns: {
          business_date: string
          card_sales: number | null
          cash_difference: number | null
          cash_sales: number | null
          close_idempotency_key: string | null
          closed_at: string | null
          closed_by: string | null
          closing_notes: string | null
          counted_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          open_idempotency_key: string
          opened_at: string
          opened_by: string
          opening_balance: number
          opening_notes: string | null
          other_sales: number | null
          pix_sales: number | null
          status: string
          total_sales: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_cash_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_operational_expense: {
        Args: {
          p_document_reference?: string
          p_expense_id: string
          p_paid_at?: string
          p_payment_method?: string
        }
        Returns: {
          amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          document_reference: string | null
          due_date: string | null
          expense_date: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          recurrence_occurrence: string | null
          recurring_rule_id: string | null
          status: string
          supplier: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "operational_expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preview_managerial_financial_closure: {
        Args: { p_period_end: string; p_period_start: string }
        Returns: Json
      }
      record_daily_cash_movement: {
        Args: {
          p_amount: number
          p_cash_session_id: string
          p_idempotency_key: string
          p_movement_type: string
          p_reason: string
        }
        Returns: {
          amount: number
          cash_session_id: string
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          movement_type: string
          reason: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_cash_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_supply_consumption: {
        Args: {
          p_barber_id?: string
          p_consumption_date: string
          p_idempotency_key: string
          p_item_id: string
          p_notes: string
          p_quantity: number
        }
        Returns: string
      }
      reopen_managerial_financial_period: {
        Args: { p_closure_id: string; p_reason: string }
        Returns: {
          approved_advances: number
          cash_difference: number
          closed_at: string
          closed_by: string
          created_at: string
          discounts_granted: number
          gross_commissions: number
          gross_revenue: number
          id: string
          idempotency_key: string
          net_profit: number
          notes: string | null
          operational_expenses: number
          period_end: string
          period_start: string
          previous_closure_id: string | null
          product_commissions: number
          product_revenue: number
          reopened_at: string | null
          reopened_by: string | null
          reopening_reason: string | null
          revision: number
          service_commissions: number
          service_revenue: number
          snapshot: Json
          status: string
          supply_consumption_cost: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "managerial_financial_closures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reverse_supply_consumption: {
        Args: { p_consumption_id: string; p_reason: string }
        Returns: undefined
      }
      set_management_alert_state: {
        Args: {
          p_alert_key: string
          p_fingerprint: string
          p_note?: string
          p_snoozed_until?: string
          p_status: string
        }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_key: string
          created_at: string
          fingerprint: string
          note: string | null
          snoozed_until: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "management_alert_states"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_sync_supabase_usage_schedule: {
        Args: { p_time: string }
        Returns: Json
      }
      set_whatsapp_ai_api_key: {
        Args: { p_api_key: string }
        Returns: undefined
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

