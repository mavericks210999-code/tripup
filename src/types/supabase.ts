import type { Activity, Participant, TripPreferences } from './index';

// ─── Raw Supabase row shapes ──────────────────────────────────────────────────

export interface TripRow {
  id: string;
  destination: string;
  dates: string;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  owner_id: string;
  participants: Participant[];          // JSONB
  itinerary: Record<number, Activity[]>; // JSONB
  invite_code: string | null;
  preferences: TripPreferences | null;  // JSONB
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  paid_by_name: string;
  date: string;
  split: { participantId: string; amount: number }[]; // JSONB
  created_at: string;
}

// ─── Supabase generated Database type (minimal – expand as needed) ────────────

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: TripRow;
        Insert: Omit<TripRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<TripRow, 'id' | 'created_at'>>;
      };
      expenses: {
        Row: ExpenseRow;
        Insert: Omit<ExpenseRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<ExpenseRow, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
