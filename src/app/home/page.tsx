'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, ChevronRight, MapPin } from 'lucide-react';
import { AuroraOrb } from '@/components/AuroraOrb';
import { useAppStore } from '@/store/useAppStore';
import AuthGuard from '@/components/AuthGuard';
import FloatingNav from '@/components/FloatingNav';
import SlideMenu from '@/components/SlideMenu';
import MinervaPanel from '@/components/MinervaPanel';
import { getUserTrips, deleteTrip } from '@/services/trips';
import { Trip } from '@/types';
import TripCard from '@/components/TripCard';
import ShareModal from '@/components/ShareModal';

export default function HomePage() {
  const router = useRouter();
  const { user, allTrips, setCurrentTrip, setAllTrips, setMinervaOpen, minervaOpen, minervaLoading } = useAppStore();
  const [trips, setTrips] = useState<Trip[]>(allTrips); // seed from persisted store
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    setLoadError(false);
    getUserTrips(user.uid)
      .then((remote) => {
        // Merge: keep locally-created trips that aren't in Supabase yet
        const merged = [
          ...remote,
          ...allTrips.filter(lt => !remote.find(rt => rt.id === lt.id)),
        ];
        setTrips(merged);
        setAllTrips(merged);
      })
      .catch(() => {
        // Supabase unavailable — show locally-stored trips so the app still works
        setTrips(allTrips);
        setLoadError(false); // don't show error if we have local data
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const ongoingTrips = trips.filter((t) =>
    t.startDate && t.endDate &&
    new Date(t.startDate) <= todayStart && new Date(t.endDate) >= todayStart
  );
  const upcomingTrips = trips.filter((t) => t.startDate && new Date(t.startDate) > todayStart);
  const pastTrips = trips.filter((t) => t.endDate && new Date(t.endDate) < todayStart);

  const handleDelete = async (tripId: string) => {
    await deleteTrip(tripId);
    const updated = trips.filter((t) => t.id !== tripId);
    setTrips(updated);
    setAllTrips(updated);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2] pb-28">
        <div className="px-5 pt-5 space-y-6 animate-fade-in-up">

          {/* Header */}
          <header className="flex justify-between items-start pt-2">
            <div>
              <p className="text-gray-500 text-sm">{user ? 'Welcome back!' : 'Plan your next adventure'}</p>
              <h1 className="text-3xl font-bold text-[#1D1D1D] mt-0.5">
                {user ? `${user.name?.split(' ')[0] || 'Traveler'} 👋` : 'TripUp'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-soft cursor-pointer hover:shadow-card transition-shadow">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              {user && (
                <button
                  onClick={() => setMinervaOpen(true)}
                  className="w-10 h-10 rounded-full overflow-hidden shadow-soft cursor-pointer"
                >
                  <AuroraOrb isThinking={minervaLoading} />
                </button>
              )}
            </div>
          </header>

          {/* Sign-in CTA — shown only when not logged in */}
          {!user && !loading && (
            <div className="animate-fade-in-up">
              <div className="bg-white rounded-3xl p-6 shadow-soft text-center">
                <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
                  <AuroraOrb isThinking={false} />
                </div>
                <h2 className="text-xl font-bold text-[#1D1D1D] mb-2">AI-powered trip planning</h2>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                  Sign in to create trips, get personalized AI itineraries, and plan with friends
                </p>
                <button
                  onClick={() => router.push('/auth?redirect=/create-trip')}
                  className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors cursor-pointer mb-3"
                >
                  <Plus className="w-5 h-5" />
                  Get started — it&apos;s free
                </button>
                <button
                  onClick={() => router.push('/auth')}
                  className="w-full text-[#607BFF] text-sm font-semibold py-2"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              <div className="h-48 rounded-3xl skeleton" />
              <div className="h-20 rounded-2xl skeleton" />
            </div>
          )}

          {/* Error state */}
          {!loading && loadError && (
            <div className="text-center py-10 bg-white rounded-2xl shadow-soft animate-fade-in-up">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="text-gray-500 font-medium mb-3">Couldn't load your trips</p>
              <button
                onClick={() => { setLoadError(false); setLoading(true); if (user?.uid) getUserTrips(user.uid).then((t) => { setTrips(t); setAllTrips(t); }).catch(() => setLoadError(true)).finally(() => setLoading(false)); }}
                className="text-[#607BFF] text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          )}

          {/* No trips — first-time empty state + recommendations (logged in but no trips) */}
          {!loading && !loadError && user && trips.length === 0 && (
            <div className="animate-fade-in-up space-y-6">
              <div className="text-center py-10">
                <div className="w-20 h-20 minerva-gradient rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#1D1D1D] mb-2">No trips yet</h2>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                  Create your first trip and let Aurora AI plan the perfect itinerary for you
                </p>
                <button
                  onClick={() => router.push('/create-trip')}
                  className="bg-[#1D1D1D] text-white px-8 py-4 rounded-2xl font-semibold flex items-center gap-2 mx-auto cursor-pointer hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Plan my first trip
                </button>
              </div>

              {/* Top Recommendations */}
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1D] mb-3">Top Recommendations</h2>
                <div className="flex gap-3 h-52">
                  {/* Large left card */}
                  <div
                    className="relative flex-1 rounded-2xl overflow-hidden cursor-pointer"
                    onClick={() => router.push('/explore')}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=500&fit=crop&q=80"
                      alt="Get inspired"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-sm font-semibold leading-tight mb-2">
                        Get inspired for your next adventure
                      </p>
                      <span className="bg-white text-[#1D1D1D] text-xs font-semibold px-3 py-1.5 rounded-full inline-block">
                        Explore Guides
                      </span>
                    </div>
                  </div>

                  {/* Right column — two stacked cards */}
                  <div className="flex flex-col gap-3 w-36">
                    <div className="relative flex-1 rounded-2xl overflow-hidden cursor-pointer"
                      onClick={() => router.push('/explore')}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop&q=80"
                        alt="Top rated"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2">
                        <p className="text-white text-xs font-bold">Top-rated</p>
                        <p className="text-white/80 text-[10px]">4.6/5</p>
                      </div>
                    </div>
                    <div className="relative flex-1 rounded-2xl overflow-hidden cursor-pointer"
                      onClick={() => router.push('/explore')}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=200&fit=crop&q=80"
                        alt="Hotels"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2">
                        <p className="text-white text-xs font-bold">Hotels</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ongoing trips */}
          {!loading && !loadError && ongoingTrips.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#1D1D1D]">Ongoing</h2>
                  <span className="px-2 py-0.5 bg-[#607BFF] text-white text-[10px] font-semibold rounded-full">LIVE</span>
                </div>
              </div>
              <div className="space-y-3">
                {ongoingTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() => { setCurrentTrip(trip); router.push(`/trip/${trip.id}`); }}
                    onDelete={handleDelete}
                    onShare={(t) => setShareTrip(t)}
                    onEdit={(t) => { setCurrentTrip(t); router.push(`/trip/${t.id}/edit`); }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming trips */}
          {!loading && !loadError && upcomingTrips.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-[#1D1D1D]">Upcoming</h2>
                <button
                  onClick={() => router.push('/create-trip')}
                  className="flex items-center gap-1 text-[#607BFF] text-sm font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New trip
                </button>
              </div>
              <div className="space-y-3">
                {upcomingTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() => { setCurrentTrip(trip); router.push(`/trip/${trip.id}`); }}
                    onDelete={handleDelete}
                    onShare={(t) => setShareTrip(t)}
                    onEdit={(t) => { setCurrentTrip(t); router.push(`/trip/${t.id}/edit`); }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Minerva CTA */}
          {!loading && !loadError && user && (
            <button
              onClick={() => setMinervaOpen(true)}
              className="w-full bg-white rounded-2xl p-4 shadow-soft flex items-center justify-between cursor-pointer hover:shadow-card transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <AuroraOrb isThinking={minervaLoading} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">AI-powered travel planning</p>
                  <p className="font-semibold text-[#1D1D1D]">Ask Aurora anything ✨</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Create new trip card (when user already has trips) */}
          {!loading && !loadError && user && trips.length > 0 && (
            <button
              onClick={() => router.push('/create-trip')}
              className="w-full bg-white rounded-2xl p-4 shadow-soft flex items-center justify-between cursor-pointer hover:shadow-card transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#607BFF]/10 rounded-full flex items-center justify-center">
                  <Plus className="w-6 h-6 text-[#607BFF]" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">Plan somewhere new</p>
                  <p className="font-semibold text-[#1D1D1D]">Create a new trip</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          )}

          {/* Past trips */}
          {!loading && !loadError && pastTrips.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-[#1D1D1D] mb-3">Past Trips</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {pastTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => { setCurrentTrip(trip); router.push(`/trip/${trip.id}`); }}
                    className="flex-shrink-0 w-32 relative rounded-2xl overflow-hidden h-40 shadow-card cursor-pointer"
                  >
                    <img src={trip.coverImage || `https://source.unsplash.com/featured/400x300?${encodeURIComponent(trip.destination)}`} alt={trip.destination} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm">{trip.destination}</p>
                      <p className="text-white/70 text-xs">{trip.dates}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <FloatingNav />
      <SlideMenu />
      {minervaOpen && <MinervaPanel />}
      {shareTrip && <ShareModal trip={shareTrip} onClose={() => setShareTrip(null)} />}
    </AuthGuard>
  );
}

