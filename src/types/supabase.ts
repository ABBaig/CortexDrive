export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: { user_id: string; full_name: string | null; city: string | null; phone: string | null; verification_status: string | null; hourly_rate?: string | null; created_at: string } };
      bookings: { Row: { id: string; learner_id: string; provider_id: string | null; service_id: string | null; status: string; scheduled_at: string | null; created_at: string; updated_at: string } };
      ratings: { Row: { id: string; booking_id: string; reviewer_id: string; stars: number; comment: string | null; created_at: string } };
      availability_slots: { Row: { id: string; instructor_id: string; day: string; start_time: string; end_time: string; created_at: string } };
      messages: { Row: { id: string; booking_id: string; sender_id: string; body: string; created_at: string } };
      gps_locations: { Row: { id: string; booking_id: string; lat: number; lng: number; updated_at: string } };
    };
  };
}

      admins: { Row: { user_id: string; added_at: string } };
