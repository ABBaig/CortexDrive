export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          city: string | null;
          language: string;
          role: 'learner' | 'instructor' | 'vendor' | 'admin';
          hourly_rate: string | null;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          city?: string | null;
          language?: string;
          role?: 'learner' | 'instructor' | 'vendor' | 'admin';
          hourly_rate?: string | number | null;
          onboarded?: boolean;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          city?: string | null;
          language?: string;
          role?: 'learner' | 'instructor' | 'vendor' | 'admin';
          hourly_rate?: string | number | null;
          onboarded?: boolean;
          updated_at?: string;
        };
      };
      admins: {
        Row: {
          user_id: string;
        };
        Insert: {
          user_id: string;
        };
        Update: {
          user_id?: string;
        };
      };
      vehicle_logs: {
        Row: {
          id: string;
          user_id: string | null;
          vehicle_id: string | null;
          type: string | null;
          event_type: string | null;
          odometer_km: string | null;
          liters: string | null;
          amount_pkr: string | null;
          meta: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          vehicle_id?: string | null;
          type?: string | null;
          event_type?: string | null;
          odometer_km?: string | number | null;
          liters?: string | number | null;
          amount_pkr?: string | number | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Update: {
          user_id?: string | null;
          vehicle_id?: string | null;
          type?: string | null;
          event_type?: string | null;
          odometer_km?: string | number | null;
          liters?: string | number | null;
          amount_pkr?: string | number | null;
          meta?: Json | null;
          created_at?: string | null;
        };
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string | null;
          name: string | null;
          registration: string | null;
          make: string | null;
          model: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          registration?: string | null;
          make?: string | null;
          model?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string | null;
          name?: string | null;
          registration?: string | null;
          make?: string | null;
          model?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
};
