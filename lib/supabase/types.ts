/**
 * Supabase database types — auto-generated.
 *
 * Generated from the live "Quotal" project schema (project ref:
 * frkngwpsctullsedhtbm) at the end of Phase 10. Regenerate after every
 * migration via `mcp__claude_ai_Supabase__generate_typescript_types`.
 */
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_devices: {
        Row: {
          created_at: string
          created_by: string | null
          device_type: string
          gym_id: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          name: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_type: string
          gym_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          name: string
          token_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_type?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          name?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_devices_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      access_logs: {
        Row: {
          accessed_at: string
          badge_uid: string | null
          denial_reason: string | null
          device_id: string | null
          granted: boolean
          gym_id: string
          id: string
          member_id: string | null
          metadata: Json | null
        }
        Insert: {
          accessed_at?: string
          badge_uid?: string | null
          denial_reason?: string | null
          device_id?: string | null
          granted: boolean
          gym_id: string
          id?: string
          member_id?: string | null
          metadata?: Json | null
        }
        Update: {
          accessed_at?: string
          badge_uid?: string | null
          denial_reason?: string | null
          device_id?: string | null
          granted?: boolean
          gym_id?: string
          id?: string
          member_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_requests: {
        Row: {
          gym_id: string
          id: string
          member_id: string
          notes: string | null
          processed_at: string | null
          reason: string | null
          requested_at: string
          status: string
        }
        Insert: {
          gym_id: string
          id?: string
          member_id: string
          notes?: string | null
          processed_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          gym_id?: string
          id?: string
          member_id?: string
          notes?: string | null
          processed_at?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_close_reports: {
        Row: {
          bank_transfer_cents: number
          card_cents: number
          cash_cents: number
          close_date: string
          closed_at: string
          closed_by: string | null
          gym_id: string
          id: string
          notes: string | null
          pdf_path: string | null
          sepa_cents: number
          total_cents: number
          transactions_count: number
        }
        Insert: {
          bank_transfer_cents?: number
          card_cents?: number
          cash_cents?: number
          close_date: string
          closed_at?: string
          closed_by?: string | null
          gym_id: string
          id?: string
          notes?: string | null
          pdf_path?: string | null
          sepa_cents?: number
          total_cents?: number
          transactions_count?: number
        }
        Update: {
          bank_transfer_cents?: number
          card_cents?: number
          cash_cents?: number
          close_date?: string
          closed_at?: string
          closed_by?: string | null
          gym_id?: string
          id?: string
          notes?: string | null
          pdf_path?: string | null
          sepa_cents?: number
          total_cents?: number
          transactions_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_close_reports_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_close_reports_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          download_path: string | null
          error: string | null
          expires_at: string | null
          fulfilled_at: string | null
          gym_id: string
          id: string
          member_id: string
          requested_at: string
          status: string
        }
        Insert: {
          download_path?: string | null
          error?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          gym_id: string
          id?: string
          member_id: string
          requested_at?: string
          status?: string
        }
        Update: {
          download_path?: string | null
          error?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          brand_color: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          fiscal_code: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          settings: Json
          slug: string
          stripe_account_id: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          fiscal_code?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          settings?: Json
          slug: string
          stripe_account_id?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          fiscal_code?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          settings?: Json
          slug?: string
          stripe_account_id?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_daily_digest: boolean
          email_enabled: boolean
          email_expiry_reminders: boolean
          email_lifecycle_changes: boolean
          email_monthly_report: boolean
          email_new_member_alert: boolean
          email_payment_failed_alert: boolean
          email_payment_failures: boolean
          email_payment_receipts: boolean
          gym_id: string
          member_id: string
          push_enabled: boolean
          push_expiry_reminders: boolean
          push_payment_events: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_daily_digest?: boolean
          email_enabled?: boolean
          email_expiry_reminders?: boolean
          email_lifecycle_changes?: boolean
          email_monthly_report?: boolean
          email_new_member_alert?: boolean
          email_payment_failed_alert?: boolean
          email_payment_failures?: boolean
          email_payment_receipts?: boolean
          gym_id: string
          member_id: string
          push_enabled?: boolean
          push_expiry_reminders?: boolean
          push_payment_events?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_daily_digest?: boolean
          email_enabled?: boolean
          email_expiry_reminders?: boolean
          email_lifecycle_changes?: boolean
          email_monthly_report?: boolean
          email_new_member_alert?: boolean
          email_payment_failed_alert?: boolean
          email_payment_failures?: boolean
          email_payment_receipts?: boolean
          gym_id?: string
          member_id?: string
          push_enabled?: boolean
          push_expiry_reminders?: boolean
          push_payment_events?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_sent: {
        Row: {
          channel: string
          delivery_status: string | null
          delivery_updated_at: string | null
          gym_id: string
          id: string
          member_id: string
          metadata: Json | null
          resend_message_id: string | null
          sent_at: string
          sent_on_date: string | null
          subscription_id: string | null
          type: string
        }
        Insert: {
          channel?: string
          delivery_status?: string | null
          delivery_updated_at?: string | null
          gym_id: string
          id?: string
          member_id: string
          metadata?: Json | null
          resend_message_id?: string | null
          sent_at?: string
          sent_on_date?: string | null
          subscription_id?: string | null
          type: string
        }
        Update: {
          channel?: string
          delivery_status?: string | null
          delivery_updated_at?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          metadata?: Json | null
          resend_message_id?: string | null
          sent_at?: string
          sent_on_date?: string | null
          subscription_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sent_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sent_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sent_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_notifications: {
        Row: {
          body: string
          created_at: string
          gym_id: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          gym_id: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          gym_id?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_notifications_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sessions: {
        Row: {
          amount_cents: number
          auto_renew: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          failure_reason: string | null
          gym_id: string
          id: string
          member_id: string
          payment_method: string | null
          plan_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_setup_intent_id: string | null
          token: string
        }
        Insert: {
          amount_cents: number
          auto_renew?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          failure_reason?: string | null
          gym_id: string
          id?: string
          member_id: string
          payment_method?: string | null
          plan_id: string
          status: string
          stripe_payment_intent_id?: string | null
          stripe_setup_intent_id?: string | null
          token: string
        }
        Update: {
          amount_cents?: number
          auto_renew?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          failure_reason?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          payment_method?: string | null
          plan_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_setup_intent_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          currency: string
          failed_at: string | null
          failure_reason: string | null
          gym_id: string
          id: string
          invoice_number: string | null
          invoice_pdf_path: string | null
          invoice_pdf_url: string | null
          member_id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          receipt_number: string | null
          receipt_pdf_path: string | null
          receipt_pdf_url: string | null
          refund_of_payment_id: string | null
          retry_count: number
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          gym_id: string
          id?: string
          invoice_number?: string | null
          invoice_pdf_path?: string | null
          invoice_pdf_url?: string | null
          member_id: string
          notes?: string | null
          paid_at?: string | null
          payment_method: string
          receipt_number?: string | null
          receipt_pdf_path?: string | null
          receipt_pdf_url?: string | null
          refund_of_payment_id?: string | null
          retry_count?: number
          status: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          gym_id?: string
          id?: string
          invoice_number?: string | null
          invoice_pdf_path?: string | null
          invoice_pdf_url?: string | null
          member_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          receipt_number?: string | null
          receipt_pdf_path?: string | null
          receipt_pdf_url?: string | null
          refund_of_payment_id?: string | null
          retry_count?: number
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_refund_of_payment_id_fkey"
            columns: ["refund_of_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          badge_uid: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string
          fiscal_code: string | null
          full_name: string
          gym_id: string
          id: string
          is_problematic: boolean
          notes: string | null
          phone: string | null
          postal_code: string | null
          problematic_reason: string | null
          province: string | null
          role: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          badge_uid?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          fiscal_code?: string | null
          full_name: string
          gym_id: string
          id: string
          is_problematic?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          problematic_reason?: string | null
          province?: string | null
          role: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          badge_uid?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          fiscal_code?: string | null
          full_name?: string
          gym_id?: string
          id?: string
          is_problematic?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          problematic_reason?: string | null
          province?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          gym_id: string
          id: string
          last_seen_at: string
          member_id: string
          p256dh_key: string
          user_agent: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          gym_id: string
          id?: string
          last_seen_at?: string
          member_id: string
          p256dh_key: string
          user_agent?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          gym_id?: string
          id?: string
          last_seen_at?: string
          member_id?: string
          p256dh_key?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sepa_mandates: {
        Row: {
          bank_code: string | null
          created_at: string
          gym_id: string
          iban_last4: string
          id: string
          member_id: string
          revoked_at: string | null
          signed_at: string | null
          status: string
          stripe_mandate_id: string
          stripe_payment_method_id: string
          stripe_setup_intent_id: string | null
          updated_at: string
        }
        Insert: {
          bank_code?: string | null
          created_at?: string
          gym_id: string
          iban_last4: string
          id?: string
          member_id: string
          revoked_at?: string | null
          signed_at?: string | null
          status: string
          stripe_mandate_id: string
          stripe_payment_method_id: string
          stripe_setup_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_code?: string | null
          created_at?: string
          gym_id?: string
          iban_last4?: string
          id?: string
          member_id?: string
          revoked_at?: string | null
          signed_at?: string | null
          status?: string
          stripe_mandate_id?: string
          stripe_payment_method_id?: string
          stripe_setup_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sepa_mandates_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_mandates_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events_processed: {
        Row: {
          api_version: string | null
          id: string
          livemode: boolean
          payload: Json | null
          processed_at: string
          type: string
        }
        Insert: {
          api_version?: string | null
          id: string
          livemode?: boolean
          payload?: Json | null
          processed_at?: string
          type: string
        }
        Update: {
          api_version?: string | null
          id?: string
          livemode?: boolean
          payload?: Json | null
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          created_by: string | null
          days: Json
          gym_id: string
          id: string
          is_active: boolean
          member_id: string
          notes: string | null
          split: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days?: Json
          gym_id: string
          id?: string
          is_active?: boolean
          member_id: string
          notes?: string | null
          split?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days?: Json
          gym_id?: string
          id?: string
          is_active?: boolean
          member_id?: string
          notes?: string | null
          split?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_suspensions: {
        Row: {
          created_at: string
          created_by: string | null
          days_added_to_end_date: number | null
          gym_id: string
          id: string
          member_id: string
          reason: string | null
          resumed_at: string | null
          subscription_id: string
          suspended_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_added_to_end_date?: number | null
          gym_id: string
          id?: string
          member_id: string
          reason?: string | null
          resumed_at?: string | null
          subscription_id: string
          suspended_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_added_to_end_date?: number | null
          gym_id?: string
          id?: string
          member_id?: string
          reason?: string | null
          resumed_at?: string | null
          subscription_id?: string
          suspended_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_suspensions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_suspensions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_suspensions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_suspensions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          end_date: string
          gym_id: string
          id: string
          member_id: string
          original_end_date: string
          payment_method: string | null
          plan_id: string
          start_date: string
          status: string
          stripe_subscription_id: string | null
          suspension_days_used: number
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          end_date: string
          gym_id: string
          id?: string
          member_id: string
          original_end_date: string
          payment_method?: string | null
          plan_id: string
          start_date: string
          status: string
          stripe_subscription_id?: string | null
          suspension_days_used?: number
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          end_date?: string
          gym_id?: string
          id?: string
          member_id?: string
          original_end_date?: string
          payment_method?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          stripe_subscription_id?: string | null
          suspension_days_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_gym_id: { Args: never; Returns: string }
      generate_invoice_number: { Args: { p_gym_id: string }; Returns: string }
      generate_receipt_number: { Args: { p_gym_id: string }; Returns: string }
      is_owner_or_staff: { Args: never; Returns: boolean }
      process_successful_payment: {
        Args: {
          p_amount_cents: number
          p_auto_renew: boolean
          p_payment_method: string
          p_payment_session_id: string
          p_stripe_charge_id: string
          p_stripe_payment_intent_id: string
        }
        Returns: string
      }
      record_failed_payment: {
        Args: {
          p_amount_cents: number
          p_failure_reason: string
          p_payment_method: string
          p_payment_session_id: string
          p_stripe_payment_intent_id: string
        }
        Returns: string
      }
      record_refund: {
        Args: {
          p_amount_refunded_cents: number
          p_stripe_payment_intent_id: string
        }
        Returns: string
      }
      register_cash_payment: {
        Args: {
          p_amount_cents: number
          p_created_by: string
          p_emit_invoice?: boolean
          p_gym_id: string
          p_invoice_fiscal_code?: string
          p_member_id: string
          p_notes?: string
          p_payment_method: string
          p_plan_id: string
          p_start_date: string
        }
        Returns: Json
      }
      update_expired_subscriptions: { Args: never; Returns: undefined }
      process_expired_deletion_requests: {
        Args: { retention_days?: number }
        Returns: number
      }
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
