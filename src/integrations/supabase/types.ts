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
      activity_catalog: {
        Row: {
          archetype: Database["public"]["Enums"]["activity_archetype"]
          category: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_featured: boolean
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["activity_status"]
          theme: Database["public"]["Enums"]["activity_theme"]
          title: string
          updated_at: string
        }
        Insert: {
          archetype: Database["public"]["Enums"]["activity_archetype"]
          category: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          short_description: string
          slug: string
          status?: Database["public"]["Enums"]["activity_status"]
          theme?: Database["public"]["Enums"]["activity_theme"]
          title: string
          updated_at?: string
        }
        Update: {
          archetype?: Database["public"]["Enums"]["activity_archetype"]
          category?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          short_description?: string
          slug?: string
          status?: Database["public"]["Enums"]["activity_status"]
          theme?: Database["public"]["Enums"]["activity_theme"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_consents: {
        Row: {
          accepted: boolean
          consent_text_hash: string
          consent_version: string
          created_at: string
          decided_at: string
          id: string
          ip: unknown
          patient_activity_id: string
          patient_id: string
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          accepted: boolean
          consent_text_hash: string
          consent_version?: string
          created_at?: string
          decided_at?: string
          id?: string
          ip?: unknown
          patient_activity_id: string
          patient_id: string
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          accepted?: boolean
          consent_text_hash?: string
          consent_version?: string
          created_at?: string
          decided_at?: string
          id?: string
          ip?: unknown
          patient_activity_id?: string
          patient_id?: string
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      activity_drafts: {
        Row: {
          completion_percent: number
          created_at: string
          draft_encrypted: string
          expires_at: string
          id: string
          patient_activity_id: string
          patient_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completion_percent?: number
          created_at?: string
          draft_encrypted: string
          expires_at: string
          id?: string
          patient_activity_id: string
          patient_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completion_percent?: number
          created_at?: string
          draft_encrypted?: string
          expires_at?: string
          id?: string
          patient_activity_id?: string
          patient_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      activity_responses: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          activity_id: string
          created_at: string
          id: string
          patient_activity_id: string
          patient_id: string
          raw_responses_encrypted: string | null
          score: number | null
          scoring_metadata: Json
          severity: Database["public"]["Enums"]["activity_severity"] | null
          submitted_at: string
          submitted_ip: unknown
          submitted_user_agent: string | null
          submitted_via: Database["public"]["Enums"]["delivery_mode"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          activity_id: string
          created_at?: string
          id?: string
          patient_activity_id: string
          patient_id: string
          raw_responses_encrypted?: string | null
          score?: number | null
          scoring_metadata?: Json
          severity?: Database["public"]["Enums"]["activity_severity"] | null
          submitted_at?: string
          submitted_ip?: unknown
          submitted_user_agent?: string | null
          submitted_via: Database["public"]["Enums"]["delivery_mode"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          activity_id?: string
          created_at?: string
          id?: string
          patient_activity_id?: string
          patient_id?: string
          raw_responses_encrypted?: string | null
          score?: number | null
          scoring_metadata?: Json
          severity?: Database["public"]["Enums"]["activity_severity"] | null
          submitted_at?: string
          submitted_ip?: unknown
          submitted_user_agent?: string | null
          submitted_via?: Database["public"]["Enums"]["delivery_mode"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_responses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_responses_patient_activity_id_fkey"
            columns: ["patient_activity_id"]
            isOneToOne: false
            referencedRelation: "patient_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_waitlist: {
        Row: {
          created_at: string
          created_by: string
          email: string
          id: string
          notes: string | null
          notified_at: string | null
          projected_patient_count: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          projected_patient_count?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          projected_patient_count?: number | null
          workspace_id?: string
        }
        Relationships: []
      }
      ephemeral_activities: {
        Row: {
          activity_id: string
          assigned_by: string
          completed_at: string | null
          created_at: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          id: string
          patient_id: string
          pdf_download_count: number
          pdf_downloaded_at: string | null
          purge_after: string | null
          revocation_reason: string | null
          status: Database["public"]["Enums"]["ephemeral_activity_status"]
          therapist_consent_at: string
          therapist_consent_text_hash: string
          token_expires_at: string
          token_first_opened_at: string | null
          token_hash: string
          token_open_count: number
          updated_at: string
          used_at: string | null
          workspace_id: string
        }
        Insert: {
          activity_id: string
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          patient_id: string
          pdf_download_count?: number
          pdf_downloaded_at?: string | null
          purge_after?: string | null
          revocation_reason?: string | null
          status?: Database["public"]["Enums"]["ephemeral_activity_status"]
          therapist_consent_at: string
          therapist_consent_text_hash: string
          token_expires_at: string
          token_first_opened_at?: string | null
          token_hash: string
          token_open_count?: number
          updated_at?: string
          used_at?: string | null
          workspace_id: string
        }
        Update: {
          activity_id?: string
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          patient_id?: string
          pdf_download_count?: number
          pdf_downloaded_at?: string | null
          purge_after?: string | null
          revocation_reason?: string | null
          status?: Database["public"]["Enums"]["ephemeral_activity_status"]
          therapist_consent_at?: string
          therapist_consent_text_hash?: string
          token_expires_at?: string
          token_first_opened_at?: string | null
          token_hash?: string
          token_open_count?: number
          updated_at?: string
          used_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      ephemeral_responses: {
        Row: {
          activity_id: string
          created_at: string
          ephemeral_activity_id: string
          id: string
          patient_id: string
          purged_at: string | null
          response_data_encrypted: string | null
          submitted_at: string
          submitted_ip: unknown
          submitted_user_agent: string | null
          submitted_via: Database["public"]["Enums"]["delivery_mode"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          ephemeral_activity_id: string
          id?: string
          patient_id: string
          purged_at?: string | null
          response_data_encrypted?: string | null
          submitted_at?: string
          submitted_ip?: unknown
          submitted_user_agent?: string | null
          submitted_via: Database["public"]["Enums"]["delivery_mode"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          ephemeral_activity_id?: string
          id?: string
          patient_id?: string
          purged_at?: string | null
          response_data_encrypted?: string | null
          submitted_at?: string
          submitted_ip?: unknown
          submitted_user_agent?: string | null
          submitted_via?: Database["public"]["Enums"]["delivery_mode"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ephemeral_responses_ephemeral_activity_id_fkey"
            columns: ["ephemeral_activity_id"]
            isOneToOne: false
            referencedRelation: "ephemeral_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag: string
          id: string
          metadata: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag: string
          id?: string
          metadata?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag?: string
          id?: string
          metadata?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_activity_history: {
        Row: {
          activity_id: string
          id: string
          set_at: string
          set_by: string | null
        }
        Insert: {
          activity_id: string
          id?: string
          set_at?: string
          set_by?: string | null
        }
        Update: {
          activity_id?: string
          id?: string
          set_at?: string
          set_by?: string | null
        }
        Relationships: []
      }
      habit_entries: {
        Row: {
          activity_id: string
          completed_at: string
          created_at: string
          cycles_completed: number | null
          duration_seconds: number | null
          habit_link_id: string
          id: string
          ip: unknown
          metadata_encrypted: string | null
          patient_id: string
          user_agent: string | null
          workspace_id: string
        }
        Insert: {
          activity_id: string
          completed_at?: string
          created_at?: string
          cycles_completed?: number | null
          duration_seconds?: number | null
          habit_link_id: string
          id?: string
          ip?: unknown
          metadata_encrypted?: string | null
          patient_id: string
          user_agent?: string | null
          workspace_id: string
        }
        Update: {
          activity_id?: string
          completed_at?: string
          created_at?: string
          cycles_completed?: number | null
          duration_seconds?: number | null
          habit_link_id?: string
          id?: string
          ip?: unknown
          metadata_encrypted?: string | null
          patient_id?: string
          user_agent?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      habit_links: {
        Row: {
          activity_id: string
          assigned_by: string
          consent_accepted_at: string | null
          consent_ip: unknown
          consent_user_agent: string | null
          created_at: string
          expires_at: string
          id: string
          last_entry_at: string | null
          patient_id: string
          revocation_reason: string | null
          status: string
          token_hash: string
          total_entries: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_id: string
          assigned_by: string
          consent_accepted_at?: string | null
          consent_ip?: unknown
          consent_user_agent?: string | null
          created_at?: string
          expires_at: string
          id?: string
          last_entry_at?: string | null
          patient_id: string
          revocation_reason?: string | null
          status?: string
          token_hash: string
          total_entries?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activity_id?: string
          assigned_by?: string
          consent_accepted_at?: string | null
          consent_ip?: unknown
          consent_user_agent?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_entry_at?: string | null
          patient_id?: string
          revocation_reason?: string | null
          status?: string
          token_hash?: string
          total_entries?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      patient_activities: {
        Row: {
          activity_id: string
          applied_at: string | null
          assigned_by: string
          created_at: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          id: string
          patient_id: string
          response_id: string | null
          revocation_reason: string | null
          status: Database["public"]["Enums"]["patient_activity_status"]
          token_expires_at: string | null
          token_first_opened_at: string | null
          token_hash: string | null
          token_open_count: number
          token_sent_at: string | null
          updated_at: string
          used_at: string | null
          workspace_id: string
        }
        Insert: {
          activity_id: string
          applied_at?: string | null
          assigned_by: string
          created_at?: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          patient_id: string
          response_id?: string | null
          revocation_reason?: string | null
          status?: Database["public"]["Enums"]["patient_activity_status"]
          token_expires_at?: string | null
          token_first_opened_at?: string | null
          token_hash?: string | null
          token_open_count?: number
          token_sent_at?: string | null
          updated_at?: string
          used_at?: string | null
          workspace_id: string
        }
        Update: {
          activity_id?: string
          applied_at?: string | null
          assigned_by?: string
          created_at?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          id?: string
          patient_id?: string
          response_id?: string | null
          revocation_reason?: string | null
          status?: Database["public"]["Enums"]["patient_activity_status"]
          token_expires_at?: string | null
          token_first_opened_at?: string | null
          token_hash?: string | null
          token_open_count?: number
          token_sent_at?: string | null
          updated_at?: string
          used_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_activities_response_fk"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "activity_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          archived_at: string | null
          assigned_therapist_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          display_name: string
          email_encrypted: string | null
          full_name_encrypted: string | null
          id: string
          initials: string
          phone_encrypted: string | null
          purged_at: string | null
          status: Database["public"]["Enums"]["patient_status"]
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          assigned_therapist_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          display_name: string
          email_encrypted?: string | null
          full_name_encrypted?: string | null
          id?: string
          initials: string
          phone_encrypted?: string | null
          purged_at?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          assigned_therapist_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          display_name?: string
          email_encrypted?: string | null
          full_name_encrypted?: string | null
          id?: string
          initials?: string
          phone_encrypted?: string | null
          purged_at?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_analytics: {
        Row: {
          created_at: string
          date: string
          day_of_week: number | null
          dimension: string
          hour_bucket: number | null
          id: string
          metric: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          day_of_week?: number | null
          dimension?: string
          hour_bucket?: number | null
          id?: string
          metric: string
          value?: number
        }
        Update: {
          created_at?: string
          date?: string
          day_of_week?: number | null
          dimension?: string
          hour_bucket?: number | null
          id?: string
          metric?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          license_number: string | null
          locale: string
          npi: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id: string
          license_number?: string | null
          locale?: string
          npi?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          license_number?: string | null
          locale?: string
          npi?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_applications: {
        Row: {
          activity_id: string
          cancelled_at: string | null
          completed_at: string | null
          completed_response_id: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          scheduled_by: string
          scheduled_for_date: string
          status: Database["public"]["Enums"]["scheduled_application_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          activity_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          completed_response_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          scheduled_by: string
          scheduled_for_date: string
          status?: Database["public"]["Enums"]["scheduled_application_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          activity_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          completed_response_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          scheduled_by?: string
          scheduled_for_date?: string
          status?: Database["public"]["Enums"]["scheduled_application_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          payload: Json
          processed_at: string
          type: string
          workspace_id: string | null
        }
        Insert: {
          id: string
          payload: Json
          processed_at?: string
          type: string
          workspace_id?: string | null
        }
        Update: {
          id?: string
          payload?: Json
          processed_at?: string
          type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_products: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          id: string
          interval: string
          limits: Json
          nickname: string
          stripe_price_id: string
          stripe_product_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          unit_amount: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          limits?: Json
          nickname: string
          stripe_price_id: string
          stripe_product_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          unit_amount: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          limits?: Json
          nickname?: string
          stripe_price_id?: string
          stripe_product_id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          unit_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          limits: Json
          metadata: Json
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_payment_method_brand: string | null
          stripe_payment_method_last4: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          limits?: Json
          metadata?: Json
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_payment_method_brand?: string | null
          stripe_payment_method_last4?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          limits?: Json
          metadata?: Json
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_payment_method_brand?: string | null
          stripe_payment_method_last4?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          slug: string
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          slug: string
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_patient_capacity: {
        Args: { _workspace_id: string }
        Returns: undefined
      }
      has_feature: {
        Args: { _flag: string; _workspace_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      increment_platform_analytics: {
        Args: {
          p_date: string
          p_dimension?: string
          p_hour: number
          p_metric: string
        }
        Returns: undefined
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      purge_expired_ephemeral_data: {
        Args: never
        Returns: {
          purged_count: number
          run_at: string
        }[]
      }
      purge_expired_patients: {
        Args: never
        Returns: {
          purged_count: number
          run_at: string
        }[]
      }
      restore_patient: {
        Args: { _patient_id: string }
        Returns: {
          archived_at: string | null
          assigned_therapist_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          display_name: string
          email_encrypted: string | null
          full_name_encrypted: string | null
          id: string
          initials: string
          phone_encrypted: string | null
          purged_at: string | null
          status: Database["public"]["Enums"]["patient_status"]
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "patients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      workspace_active_patient_count: {
        Args: { _workspace_id: string }
        Returns: number
      }
    }
    Enums: {
      activity_archetype:
        | "quiz_scale"
        | "drag_drop"
        | "structured_form"
        | "guided_timer"
        | "guided_script"
      activity_severity:
        | "minimal"
        | "mild"
        | "moderate"
        | "moderately_severe"
        | "severe"
        | "not_applicable"
      activity_status: "draft" | "published" | "archived"
      activity_theme:
        | "sage"
        | "mauve"
        | "navy"
        | "cream"
        | "terracotta"
        | "sage_dark"
      app_role: "admin" | "therapist" | "patient"
      delivery_mode: "in_session" | "shared_link" | "both"
      ephemeral_activity_status:
        | "pending"
        | "opened"
        | "completed"
        | "expired"
        | "revoked"
        | "purged"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      patient_activity_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "expired"
        | "revoked"
        | "declined"
      patient_status: "active" | "archived"
      scheduled_application_status:
        | "pending"
        | "completed"
        | "skipped"
        | "cancelled"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "paused"
        | "expired"
      subscription_tier:
        | "solo"
        | "practice"
        | "clinic"
        | "basic"
        | "patient"
        | "trial"
      workspace_role: "owner" | "therapist" | "supervisor"
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
      activity_archetype: [
        "quiz_scale",
        "drag_drop",
        "structured_form",
        "guided_timer",
        "guided_script",
      ],
      activity_severity: [
        "minimal",
        "mild",
        "moderate",
        "moderately_severe",
        "severe",
        "not_applicable",
      ],
      activity_status: ["draft", "published", "archived"],
      activity_theme: [
        "sage",
        "mauve",
        "navy",
        "cream",
        "terracotta",
        "sage_dark",
      ],
      app_role: ["admin", "therapist", "patient"],
      delivery_mode: ["in_session", "shared_link", "both"],
      ephemeral_activity_status: [
        "pending",
        "opened",
        "completed",
        "expired",
        "revoked",
        "purged",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      patient_activity_status: [
        "pending",
        "in_progress",
        "completed",
        "expired",
        "revoked",
        "declined",
      ],
      patient_status: ["active", "archived"],
      scheduled_application_status: [
        "pending",
        "completed",
        "skipped",
        "cancelled",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "paused",
        "expired",
      ],
      subscription_tier: [
        "solo",
        "practice",
        "clinic",
        "basic",
        "patient",
        "trial",
      ],
      workspace_role: ["owner", "therapist", "supervisor"],
    },
  },
} as const
