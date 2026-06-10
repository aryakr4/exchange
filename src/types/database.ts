/**
 * Database types for the RateWatch schema.
 *
 * Hand-written to match supabase/migrations exactly, in the same shape
 * `supabase gen types typescript` produces. After linking your project you
 * can regenerate with:
 *
 *   supabase gen types typescript --linked > src/types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          from_currency: string;
          to_currency: string;
          target_rate: number;
          condition: Database["public"]["Enums"]["alert_condition"];
          active: boolean;
          trigger_state: Database["public"]["Enums"]["alert_trigger_state"];
          last_triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_currency: string;
          to_currency: string;
          target_rate: number;
          condition: Database["public"]["Enums"]["alert_condition"];
          active?: boolean;
          trigger_state?: Database["public"]["Enums"]["alert_trigger_state"];
          last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_currency?: string;
          to_currency?: string;
          target_rate?: number;
          condition?: Database["public"]["Enums"]["alert_condition"];
          active?: boolean;
          trigger_state?: Database["public"]["Enums"]["alert_trigger_state"];
          last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_rates: {
        Row: {
          id: string;
          base_currency: string;
          quote_currency: string;
          rate: number;
          rate_date: string;
          fetched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          base_currency: string;
          quote_currency: string;
          rate: number;
          rate_date?: string;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          base_currency?: string;
          quote_currency?: string;
          rate?: number;
          rate_date?: string;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          alert_id: string;
          user_id: string;
          rate: number;
          email_sent: boolean;
          sent_at: string | null;
          trigger_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          user_id: string;
          rate: number;
          email_sent?: boolean;
          sent_at?: string | null;
          trigger_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          user_id?: string;
          rate?: number;
          email_sent?: boolean;
          sent_at?: string | null;
          trigger_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey";
            columns: ["alert_id"];
            isOneToOne: false;
            referencedRelation: "alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      alert_condition: "greater_than" | "less_than";
      alert_trigger_state: "armed" | "triggered";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
