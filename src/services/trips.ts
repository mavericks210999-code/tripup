import { supabase } from '@/lib/supabase';
import { Trip, Activity, Itinerary, Participant } from '@/types';
import type { TripRow } from '@/types/supabase';

// ─── Mapper: DB row → app Trip ────────────────────────────────────────────────

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    destination: row.destination,
    dates: row.dates,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    coverImage: row.cover_image ?? undefined,
    ownerId: row.owner_id,
    participants: row.participants ?? [],
    itinerary: row.itinerary ?? {},
    inviteCode: row.invite_code ?? undefined,
    preferences: row.preferences ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createTrip(data: Omit<Trip, 'id'>): Promise<string> {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: row, error } = await supabase
    .from('trips')
    .insert({
      destination: data.destination,
      dates: data.dates,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null,
      cover_image: data.coverImage ?? null,
      owner_id: data.ownerId,
      participants: data.participants,
      itinerary: data.itinerary ?? {},
      invite_code: inviteCode,
      preferences: data.preferences ?? null,
    })
    .select('id')
    .single<Pick<TripRow, 'id'>>();

  if (error) throw error;
  return row!.id;
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single<TripRow>();

  if (error || !data) return null;
  return rowToTrip(data);
}

export async function getUserTrips(userId: string): Promise<Trip[]> {
  const { data: owned } = await supabase
    .from('trips')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<TripRow[]>();

  const { data: member } = await supabase
    .from('trips')
    .select('*')
    .contains('participants', [{ id: userId }])
    .neq('owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<TripRow[]>();

  const combined = [...(owned ?? []), ...(member ?? [])];
  return combined.map(rowToTrip);
}

export async function updateTripItinerary(
  tripId: string,
  itinerary: Itinerary
): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ itinerary })
    .eq('id', tripId);

  if (error) throw error;
}

export async function addActivityToDay(
  tripId: string,
  dayNumber: number,
  activity: Activity,
  currentItinerary: Itinerary
): Promise<void> {
  const updated: Itinerary = { ...currentItinerary };
  updated[dayNumber] = [...(updated[dayNumber] ?? []), activity];
  await updateTripItinerary(tripId, updated);
}

export async function updateActivity(
  tripId: string,
  dayNumber: number,
  activity: Activity,
  currentItinerary: Itinerary
): Promise<void> {
  const updated: Itinerary = { ...currentItinerary };
  updated[dayNumber] = (updated[dayNumber] ?? []).map((a) =>
    a.id === activity.id ? activity : a
  );
  await updateTripItinerary(tripId, updated);
}

export async function deleteActivity(
  tripId: string,
  dayNumber: number,
  activityId: string,
  currentItinerary: Itinerary
): Promise<void> {
  const updated: Itinerary = { ...currentItinerary };
  updated[dayNumber] = (updated[dayNumber] ?? []).filter(
    (a) => a.id !== activityId
  );
  await updateTripItinerary(tripId, updated);
}

export async function addParticipant(
  tripId: string,
  participant: Participant,
  currentParticipants: Participant[]
): Promise<void> {
  if (currentParticipants.some((p) => p.id === participant.id)) return;

  const { error } = await supabase
    .from('trips')
    .update({ participants: [...currentParticipants, participant] })
    .eq('id', tripId);

  if (error) throw error;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function updateTrip(
  tripId: string,
  updates: Partial<Pick<Trip, 'destination' | 'dates' | 'startDate' | 'endDate' | 'coverImage' | 'preferences'>>
): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({
      ...(updates.destination !== undefined && { destination: updates.destination }),
      ...(updates.dates !== undefined && { dates: updates.dates }),
      ...(updates.startDate !== undefined && { start_date: updates.startDate }),
      ...(updates.endDate !== undefined && { end_date: updates.endDate }),
      ...(updates.coverImage !== undefined && { cover_image: updates.coverImage }),
      ...(updates.preferences !== undefined && { preferences: updates.preferences }),
    })
    .eq('id', tripId);

  if (error) throw error;
}

export async function joinTripByCode(
  inviteCode: string,
  participant: Participant
): Promise<string | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('id, participants')
    .eq('invite_code', inviteCode.toUpperCase())
    .single<Pick<TripRow, 'id' | 'participants'>>();

  if (error || !data) return null;

  await addParticipant(data.id, participant, data.participants ?? []);
  return data.id;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateDays(startDate: string, endDate: string) {
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: { number: number; label: string; month: string; fullDate: string }[] = [];

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      number: d.getDate(),
      label: DAY_LABELS[d.getDay()],
      month: MONTH_LABELS[d.getMonth()],
      fullDate: new Date(d).toISOString().split('T')[0],
    });
  }
  return days;
}
