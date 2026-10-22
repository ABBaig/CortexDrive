export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * Minimal Database shape: table names mirror the live Supabase schema.
 * Columns are placeholder-typed; refine per table as queries are typed.
 */
export interface Database {
  public: {
    Tables: {
      users: { Row: { id: string; full_name: string | null; city: string | null; role: string | null; verification_status: string | null; hourly_rate: number | null; created_at: string } };
      admins: { Row: { user_id: string; added_at: string | null } };
      verifications: { Row: { id: string; user_id: string; type: string | null; doc_url: string | null; selfie_url: string | null; status: string | null; ocr_payload: Json | null; face_match_score: number | null; created_at: string } };
      bookings: { Row: { id: string; learner_id: string; instructor_id: string | null; slot_start: string | null; status: string | null; created_at: string } };
      availability_slots: { Row: { id: string; instructor_id: string; day: string | null; start_time: string | null; end_time: string | null; created_at: string } };
      ratings: { Row: { id: string; booking_id: string; reviewer_id: string; stars: number; comment: string | null; created_at: string } };
      messages: { Row: { id: string; booking_id: string; sender_id: string; body: string | null; created_at: string } };
      gps_locations: { Row: { id: string; booking_id: string; lat: number | null; lng: number | null; updated_at: string } };
      sos_logs: { Row: { id: string; user_id: string; lat: number | null; lng: number | null; note: string | null; booking_id: string | null; created_at: string } };
      vehicle_logs: { Row: { id: string; user_id: string; event_type: string | null; meta: Json | null; created_at: string } };
      wallets: { Row: { id: string; user_id: string; balance: number | null; created_at: string } };
      transactions: { Row: { id: string; wallet_id: string; kind: string | null; amount: number | null; balance_after: number | null; meta: Json | null; created_at: string } };
      platform_settings: { Row: { id: string; key: string | null; value: Json | null; updated_at: string | null } };
    };
  };
}
