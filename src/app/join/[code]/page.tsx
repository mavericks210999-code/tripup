'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapPin, Users, Calendar, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { joinTripByCode, getTrip } from '@/services/trips';
import { Trip } from '@/types';

export default function JoinTripPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { user, setCurrentTrip } = useAppStore();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'joining' | 'joined' | 'error' | 'already'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!code) return;
    // Fetch trip details by invite code via a service call
    fetchTripByCode(code);
  }, [code]);

  const fetchTripByCode = async (inviteCode: string) => {
    try {
      // We'll look up the trip via the invite code using Supabase directly
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (error || !data) {
        setStatus('error');
        setErrorMsg('This invite link is invalid or has expired.');
        return;
      }

      // Map Supabase row to Trip type
      const tripData: Trip = {
        id: data.id,
        destination: data.destination,
        dates: data.dates,
        startDate: data.start_date,
        endDate: data.end_date,
        coverImage: data.cover_image,
        participants: data.participants || [],
        itinerary: data.itinerary || {},
        inviteCode: data.invite_code,
        ownerId: data.owner_id,
        preferences: data.preferences,
      };

      setTrip(tripData);

      // Check if user is already a participant
      if (user) {
        const alreadyIn = tripData.participants.some(
          (p) => p.id === user.uid || p.email === user.email
        );
        if (alreadyIn) {
          setStatus('already');
          return;
        }
      }

      setStatus('found');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Redirect to auth with return URL
      router.push(`/auth?redirect=/join/${code}`);
      return;
    }
    if (!trip) return;

    setStatus('joining');
    try {
      await joinTripByCode(code, {
        id: user.uid,
        name: user.name || 'Traveler',
        email: user.email || '',
        initial: (user.name || 'T')[0].toUpperCase(),
        photoURL: user.photoURL,
      });

      // Fetch updated trip and navigate
      const updatedTrip = await getTrip(trip.id);
      if (updatedTrip) {
        setCurrentTrip(updatedTrip);
      }
      setStatus('joined');
      setTimeout(() => router.push(`/trip/${trip.id}`), 1500);
    } catch {
      setStatus('error');
      setErrorMsg('Failed to join the trip. Please try again.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F3F2] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#607BFF] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#F5F3F2] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1D] mb-2">Invite Not Found</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">{errorMsg}</p>
          <button
            onClick={() => router.push('/home')}
            className="bg-[#1D1D1D] text-white px-8 py-4 rounded-2xl font-semibold cursor-pointer"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (status === 'joined') {
    return (
      <div className="min-h-screen bg-[#F5F3F2] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1D] mb-2">You're in! 🎉</h2>
          <p className="text-gray-500 text-sm">Redirecting to your trip...</p>
        </div>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="min-h-screen bg-[#F5F3F2] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#607BFF]/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-[#607BFF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1D] mb-2">Already joined!</h2>
          <p className="text-gray-500 text-sm mb-8">You're already part of this trip.</p>
          <button
            onClick={() => { if (trip) { setCurrentTrip(trip); router.push(`/trip/${trip.id}`); } }}
            className="bg-[#607BFF] text-white px-8 py-4 rounded-2xl font-semibold cursor-pointer"
          >
            View Trip
          </button>
        </div>
      </div>
    );
  }

  // status === 'found' or 'joining'
  return (
    <div className="min-h-screen bg-[#F5F3F2] flex flex-col">
      {/* Cover image */}
      {trip && (
        <div className="relative h-64 w-full">
          <img
            src={trip.coverImage || `https://source.unsplash.com/featured/800x400?${encodeURIComponent(trip.destination + ' travel')}`}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-3xl font-bold text-white">{trip.destination}</h1>
            <p className="text-white/80 text-sm mt-1">{trip.dates}</p>
          </div>
        </div>
      )}

      {/* Card */}
      <div className="flex-1 px-5 py-6 space-y-5">
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <p className="text-sm text-gray-500 mb-1">You've been invited to join</p>
          <h2 className="text-xl font-bold text-[#1D1D1D] mb-4">{trip?.destination} Trip</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Calendar className="w-5 h-5 text-[#607BFF]" />
              <span>{trip?.dates}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Users className="w-5 h-5 text-[#607BFF]" />
              <span>{trip?.participants.length ?? 0} traveler{(trip?.participants.length ?? 0) !== 1 ? 's' : ''} going</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <MapPin className="w-5 h-5 text-[#607BFF]" />
              <span>{trip?.destination}</span>
            </div>
          </div>

          {/* Participant avatars */}
          {trip && trip.participants.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Travelers</p>
              <div className="flex -space-x-2">
                {trip.participants.slice(0, 6).map((p, i) =>
                  p.photoURL ? (
                    <img key={i} src={p.photoURL} alt={p.name} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                  ) : (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#607BFF] text-white text-xs flex items-center justify-center font-bold">
                      {p.initial}
                    </div>
                  )
                )}
                {trip.participants.length > 6 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-bold">
                    +{trip.participants.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700">You need to sign in to join this trip.</p>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={status === 'joining'}
          className="w-full py-4 bg-[#607BFF] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 hover:bg-[#4F6AE8] transition-colors"
        >
          {status === 'joining' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              {user ? 'Join this trip' : 'Sign in to join'}
            </>
          )}
        </button>

        <button
          onClick={() => router.push('/home')}
          className="w-full py-3 text-gray-500 text-sm font-medium cursor-pointer"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
