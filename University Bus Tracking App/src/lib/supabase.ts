import { createClient } from "@supabase/supabase-js";

export type LocationReport = {
  id: string;
  route_id: string;
  anonymous_token: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  progress_meters: number | null;
  reported_at: string;
};

export type UsageFeature = "start_trip" | "search" | "arrival" | "route";

export type AppUsage = {
  id: string;
  visitor_id: string;
  feature: UsageFeature;
  used_at: string;
};

export type TripFeedback = {
  id: string;
  route_id: string | null;
  rating: number;
  experience: string | null;
  suggestion: string | null;
  submitted_at: string;
};

type Database = {
  public: {
    Tables: {
      location_reports: {
        Row: LocationReport;
        Insert: Omit<LocationReport, "id" | "reported_at"> & {
          id?: string;
          reported_at?: string;
        };
        Update: Partial<LocationReport>;
        Relationships: [];
      };
      app_usage: {
        Row: AppUsage;
        Insert: Omit<AppUsage, "id" | "used_at"> & {
          id?: string;
          used_at?: string;
        };
        Update: Partial<AppUsage>;
        Relationships: [];
      };
      trip_feedback: {
        Row: TripFeedback;
        Insert: Omit<TripFeedback, "id" | "submitted_at"> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<TripFeedback>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;
