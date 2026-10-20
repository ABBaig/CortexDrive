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
    };
  };
};
