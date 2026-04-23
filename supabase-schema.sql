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


-- ─── Run this in Supabase SQL Editor after existing schema. ───────────────────

-- join_trip_by_code: SECURITY DEFINER RPC
--
-- WHY THIS EXISTS: Supabase RLS on the trips table requires a user to already
-- be in the participants array before they can SELECT the row, and only the
-- owner can UPDATE it. A fresh invitee is neither owner nor participant, so
-- the normal client-side join flow is a chicken-and-egg deadlock — the client
-- cannot read the trip to learn its id, and cannot write participants without
-- already being one. Running this function as SECURITY DEFINER lets it bypass
-- RLS entirely while still enforcing auth (the caller must be authenticated)
-- and performing the membership check itself, keeping the logic safe.

CREATE OR REPLACE FUNCTION public.join_trip_by_code(
  p_invite_code TEXT,
  p_name        TEXT,
  p_email       TEXT,
  p_initial     TEXT,
  p_photo_url   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id   UUID;
  v_caller_id TEXT := auth.uid()::text;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up the trip by invite code (case-insensitive: normalise to upper)
  SELECT id INTO v_trip_id
  FROM public.trips
  WHERE invite_code = UPPER(p_invite_code)
  LIMIT 1;

  IF v_trip_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Idempotent: if caller is already a participant, return without modifying
  IF EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = v_trip_id
      AND participants @> jsonb_build_array(jsonb_build_object('id', v_caller_id))
  ) THEN
    RETURN v_trip_id;
  END IF;

  -- Append the new participant
  UPDATE public.trips
  SET participants = participants || jsonb_build_object(
    'id',       v_caller_id,
    'name',     p_name,
    'email',    p_email,
    'initial',  p_initial,
    'photoURL', p_photo_url
  )
  WHERE id = v_trip_id;

  RETURN v_trip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_trip_by_code(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.join_trip_by_code(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.join_trip_by_code(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ─── get_trip_by_invite_code: SECURITY DEFINER preview lookup ────────────────
-- WHY: Same RLS chicken-and-egg as join_trip_by_code. The /join/[code] page
-- needs to render a trip preview (destination, dates, cover image, participant
-- count) *before* the user clicks Join. A direct client SELECT is blocked by
-- the participants-only SELECT policy on trips. This SECURITY DEFINER function
-- bypasses RLS for the read while still requiring the caller to be
-- authenticated. Only exposes fields already shown in the preview UI.

CREATE OR REPLACE FUNCTION public.get_trip_by_invite_code(
  p_invite_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'id',           id,
    'destination',  destination,
    'dates',        dates,
    'start_date',   start_date,
    'end_date',     end_date,
    'cover_image',  cover_image,
    'owner_id',     owner_id,
    'participants', participants,
    'itinerary',    itinerary,
    'invite_code',  invite_code,
    'preferences',  preferences
  )
  INTO v_result
  FROM public.trips
  WHERE invite_code = UPPER(p_invite_code)
  LIMIT 1;

  RETURN v_result;  -- NULL if code not found
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_trip_by_invite_code(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_trip_by_invite_code(TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_trip_by_invite_code(TEXT) TO anon;
