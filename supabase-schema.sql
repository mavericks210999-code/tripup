-- ============================================================
-- TripUp — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── trips ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trips (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination   TEXT NOT NULL,
  dates         TEXT NOT NULL,                        -- e.g. "10–14 Jun"
  start_date    DATE,
  end_date      DATE,
  cover_image   TEXT,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participants  JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Participant[]
  itinerary     JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { [dayNumber]: Activity[] }
  invite_code   TEXT UNIQUE,
  preferences   JSONB,                                -- TripPreferences
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS trips_owner_id_idx ON public.trips (owner_id);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS trips_invite_code_idx ON public.trips (invite_code);

-- GIN index for fast JSONB participant searches
CREATE INDEX IF NOT EXISTS trips_participants_gin ON public.trips USING GIN (participants);

-- ─── expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id      UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT '€',
  paid_by      TEXT NOT NULL,           -- participant id (UUID string)
  paid_by_name TEXT NOT NULL,
  date         TEXT NOT NULL,           -- display string e.g. "14 Jun"
  split        JSONB NOT NULL DEFAULT '[]'::jsonb, -- { participantId, amount }[]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_trip_id_idx ON public.expenses (trip_id);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- trips: owner can do everything
CREATE POLICY "trips: owner full access"
  ON public.trips FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- trips: participants can read (their id appears in the participants JSONB array)
CREATE POLICY "trips: participants can read"
  ON public.trips FOR SELECT
  USING (
    owner_id = auth.uid()
    OR participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
  );

-- expenses: trip owner or trip participant can read/insert
CREATE POLICY "expenses: trip members full access"
  ON public.expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id
        AND (
          t.owner_id = auth.uid()
          OR t.participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id
        AND (
          t.owner_id = auth.uid()
          OR t.participants @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
        )
    )
  );

-- ─── Realtime (optional — enable for live group sync) ────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
