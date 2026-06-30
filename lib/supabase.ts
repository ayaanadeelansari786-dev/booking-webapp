import { createClient } from "@supabase/supabase-js";
import crossFetch from "cross-fetch";
import type { Booking, Business, BusinessAuth, Technician } from "@/lib/types";

type Database = {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: Business;
        Update: Partial<Business>;
        Relationships: [];
      };
      business_auth: {
        Row: BusinessAuth;
        Insert: Omit<BusinessAuth, "created_at"> & { created_at?: string };
        Update: Partial<BusinessAuth>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, "id" | "created_at" | "assigned_technician_id" | "scheduled_at"> & {
          id?: string;
          created_at?: string;
          assigned_technician_id?: string | null;
          scheduled_at?: string | null;
        };
        Update: Partial<Booking>;
        Relationships: [];
      };
      technicians: {
        Row: Technician;
        Insert: Omit<Technician, "id"> & { id?: string };
        Update: Partial<Technician>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase(accessToken?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    },
    global: {
      fetch: (...args) => crossFetch(...args),
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    }
  });
}
