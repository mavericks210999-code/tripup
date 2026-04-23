'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Sun, Users, Calendar, MapPin, Star, Clock, ExternalLink,
  Plane, Hotel, Car, Camera, ShoppingBag, Ticket,
  AlertCircle, Plus, Copy, Check, Loader2, Sparkles, MoreVertical, Edit3, Share2
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getTrip, generateDays } from '@/services/trips';
import { getTripExpenses, getYouOwe, getTotalSpent, calculateBalances } from '@/services/expenses';
import { detectCurrency } from '@/lib/currency';
import AuthGuard from '@/components/AuthGuard';
import TripHeader from '@/components/TripHeader';
import FloatingNav from '@/components/FloatingNav';
import SlideMenu from '@/components/SlideMenu';
import MinervaPanel from '@/components/MinervaPanel';
import ItineraryCard from '@/components/ItineraryCard';
import DayModal from '@/components/DayModal';
import ExpenseCard from '@/components/ExpenseCard';
import ShareModal from '@/components/ShareModal';
import SaveTripModal from '@/components/SaveTripModal';
import { Trip, Activity, Expense } from '@/types';
import { getAuthHeaders } from '@/lib/clientAuth';

// ─── Category buttons config ─────────────────────────────────────────────────

function getCategoryButtons(trip: Trip) {
  const dest = encodeURIComponent(trip.destination);
  const start = trip.startDate || '';
  const end = trip.endDate || '';
  const startFmt = start.replace(/-/g, '');
  const endFmt = end.replace(/-/g, '');

  return [
    {
      icon: <Plane className="w-5 h-5" />,
      label: 'Flights',
      color: 'bg-blue-100 text-blue-600',
      href: `https://www.google.com/travel/flights?q=flights+to+${dest}&hl=en`,
    },
    {
      icon: <Hotel className="w-5 h-5" />,
      label: 'Stays',
      color: 'bg-yellow-100 text-yellow-600',
      href: `https://www.booking.com/searchresults.html?ss=${dest}&checkin=${start}&checkout=${end}&group_adults=${trip.participants.length}`,
    },
    {
      icon: <Camera className="w-5 h-5" />,
      label: 'Activities',
      color: 'bg-pink-100 text-pink-600',
      href: `https://www.viator.com/searchResults/all?text=${dest}`,
    },
    {
      icon: <Car className="w-5 h-5" />,
      label: 'Car Rental',
      color: 'bg-green-100 text-green-600',
      href: `https://www.kayak.com/cars/${dest}/${start}/${end}`,
    },
    {
      icon: <Ticket className="w-5 h-5" />,
      label: 'Reservations',
      color: 'bg-purple-100 text-purple-600',
      href: `https://www.opentable.com/s/?covers=${trip.participants.length}&dateTime=${start}&metroId=&regionIds=&term=${dest}`,
    },
    {
      icon: <ShoppingBag className="w-5 h-5" />,
      label: 'Shopping',
      color: 'bg-orange-100 text-orange-600',
      href: `https://www.google.com/maps/search/shopping+${dest}`,
    },
  ];
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ trip, tripId, totalActivities, expenses }: { trip: Trip; tripId: string; totalActivities: number; expenses: Expense[] }) {
  const { setTripTab, user } = useAppStore();
  const router = useRouter();
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveTripOpen, setSaveTripOpen] = useState(false);
  const currency = detectCurrency(trip.destination);
  const totalSpent = getTotalSpent(expenses);
  const cats = getCategoryButtons(trip);

  const daysLeft = trip.endDate
    ? Math.max(0, Math.ceil((new Date(trip.endDate).getTime() - Date.now()) / 86400000))
    : '—';

  const nextActivity = (Object.values(trip.itinerary || {}).flat() as Activity[])
    .filter((a) => !a.completed)[0];

  return (
    <div className="p-5 space-y-5 pb-10">
      {/* Cover */}
      <div className="relative">
      <div className="relative h-52 rounded-3xl overflow-hidden shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.06)_0px_4px_12px,rgba(0,0,0,0.1)_0px_8px_20px]">
        <img
          src={trip.coverImage || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=500&fit=crop&q=80`}
          alt={trip.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Weather */}
        <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-2xl px-3 py-2 text-white">
          <div className="flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-yellow-300" />
            <p className="text-sm font-semibold">Sunny · 24°</p>
          </div>
        </div>

        {/* 3-dot menu */}
        <button
          onClick={() => setHeroMenuOpen(true)}
          className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-2xl font-bold text-white">{trip.destination}</h2>
          <div className="flex gap-4 text-white/80 text-xs mt-1">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{trip.dates}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{trip.participants.length} people</span>
          </div>
        </div>
      </div>

      {/* Hero context menu */}
      {heroMenuOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setHeroMenuOpen(false)} />
          <div className="absolute z-50 bg-white rounded-2xl shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.1)_0px_8px_24px] overflow-hidden w-44"
            style={{ top: '48px', right: '8px' }}
          >
            <button
              onClick={() => { setHeroMenuOpen(false); router.push(`/trip/${tripId}/edit`); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#222222] hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-gray-500" />
              Edit trip
            </button>
            <button
              onClick={() => {
                setHeroMenuOpen(false);
                if (user?.isAnonymous !== false) {
                  setSaveTripOpen(true);
                } else {
                  setShareOpen(true);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#222222] hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              <Share2 className="w-4 h-4 text-gray-500" />
              Share invite
            </button>
          </div>
        </>
      )}
      </div>{/* end relative cover wrapper */}
      {shareOpen && trip && <ShareModal trip={trip} onClose={() => setShareOpen(false)} />}
      <SaveTripModal
        open={saveTripOpen}
        onClose={() => setSaveTripOpen(false)}
        context="share"
        returnUrl={`/trip/${tripId}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: daysLeft.toString(), label: 'Days left', color: 'text-[#607BFF]' },
          { value: totalActivities.toString(), label: 'Activities', color: 'text-[#1D1D1D]' },
          { value: `${currency.symbol}${totalSpent.toFixed(0)}`, label: 'Spent', color: 'text-green-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 shadow-soft text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next up */}
      {nextActivity ? (
        <div className="bg-white rounded-2xl p-4 shadow-soft cursor-pointer hover:shadow-card transition-shadow" onClick={() => setTripTab('itinerary')}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-[#1D1D1D] text-sm">Next up</h3>
            <span className="text-[#607BFF] text-xs font-medium">View all →</span>
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-14 h-14 bg-[#607BFF]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-[#607BFF]" />
            </div>
            <div>
              <p className="text-xs text-[#607BFF] font-semibold">{nextActivity.time}</p>
              <h4 className="font-bold text-[#1D1D1D] text-base">{nextActivity.title}</h4>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{nextActivity.location}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-soft text-center">
          <p className="text-gray-400 text-sm mb-2">No activities planned yet</p>
          <button onClick={() => setTripTab('itinerary')} className="text-[#607BFF] text-sm font-semibold cursor-pointer">
            + Plan with Aurora AI
          </button>
        </div>
      )}

      {/* Category buttons */}
      <div>
        <h3 className="font-bold text-[#1D1D1D] text-sm mb-3">Quick Links</h3>
        <div className="grid grid-cols-3 gap-3">
          {cats.map((cat, i) => (
            <a
              key={i}
              href={cat.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl p-3 shadow-soft flex flex-col justify-between h-20 cursor-pointer hover:shadow-card transition-shadow relative overflow-hidden"
            >
              <div className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center ${cat.color}`}>
                {cat.icon}
              </div>
              <span className="text-xs font-semibold text-[#1D1D1D] mt-auto">{cat.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[#1D1D1D] text-sm">Group</h3>
          <InviteButton trip={trip} />
        </div>
        <div className="space-y-3">
          {trip.participants.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              {p.photoURL ? (
                <img src={p.photoURL} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#607BFF] text-white flex items-center justify-center font-bold">
                  {p.initial}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-[#1D1D1D]">{p.name}</p>
                <p className="text-xs text-gray-400">{i === 0 ? 'Organizer' : 'Member'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Invite button ─────────────────────────────────────────────────────────────

function InviteButton({ trip }: { trip: Trip }) {
  const [copied, setCopied] = useState(false);
  // Use NEXT_PUBLIC_APP_URL in production so links point to the live domain
  const origin = (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || '');
  const link = trip.inviteCode ? `${origin}/join/${trip.inviteCode}` : null;

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!link) return null;

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs font-semibold text-[#607BFF] bg-[#607BFF]/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#607BFF]/20 transition-colors"
    >
      {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Invite link</>}
    </button>
  );
}

// ─── Itinerary Tab ────────────────────────────────────────────────────────────

function ItineraryTab({ trip, tripId }: { trip: Trip; tripId: string }) {
  const { selectedDay, setSelectedDay, setDayModalOpen, setTempActivity, setMinervaOpen } = useAppStore();
  const days = trip.startDate && trip.endDate
    ? generateDays(trip.startDate, trip.endDate)
    : Array.from({ length: 5 }, (_, i) => ({
        number: i + 1, label: ['Mon','Tue','Wed','Thu','Fri'][i], month: 'Day', fullDate: '',
      }));

  const itinerary = trip.itinerary || {};
  const activeDay = selectedDay || days[0]?.number;
  const today = new Date().getDate();
  const totalActivities = (Object.values(itinerary).flat() as Activity[]).length;

  return (
    <div className="p-5 pb-10">
      {/* Minerva CTA — shown only when trip has zero activities */}
      {totalActivities === 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-soft mb-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 minerva-gradient rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#1D1D1D] text-sm">Start planning with Aurora</p>
              <p className="text-xs text-gray-500">Let AI build your full {days.length}-day itinerary</p>
            </div>
          </div>
          <button
            onClick={() => setMinervaOpen(true)}
            className="w-full py-3 minerva-gradient text-white rounded-2xl text-sm font-semibold"
          >
            Generate itinerary with AI ✨
          </button>
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
        {days.map((day) => {
          const hasActivities = (itinerary[day.number] || []).length > 0;
          return (
            <button
              key={day.number}
              onClick={() => setSelectedDay(day.number)}
              className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer bg-white ${
                activeDay === day.number
                  ? 'border-2 border-[#1D1D1D] shadow-none'
                  : 'border border-gray-100 shadow-soft hover:shadow-card'
              }`}
            >
              <span className={`text-base font-semibold ${activeDay === day.number ? 'text-[#1D1D1D]' : 'text-gray-500'}`}>
                {day.number}
              </span>
            </button>
          );
        })}
      </div>

      <ItineraryCard
        dayNumber={activeDay}
        dayLabel={days.find((d) => d.number === activeDay)?.label || ''}
        month={days.find((d) => d.number === activeDay)?.month || ''}
        activities={itinerary[activeDay] || []}
        tripId={tripId}
        isToday={activeDay === today}
        onAddPlace={() => {
          setTempActivity({ title: '', category: 'Sightseeing', icon: 'map-pin' });
          setDayModalOpen(true);
          setSelectedDay(activeDay);
        }}
      />

      <DayModal tripId={tripId} days={days} />
    </div>
  );
}

// ─── Explore Tab ──────────────────────────────────────────────────────────────

function ExploreTab({ trip, tripId }: { trip: Trip; tripId: string }) {
  const [places, setPlaces] = useState<ReturnType<typeof Object.values>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const { setDayModalOpen, setTempActivity } = useAppStore();
  const FILTERS = ['All', 'Attractions', 'Food', 'Shopping', 'Nature', 'Nightlife'];

  // Collect locations from the itinerary to guide nearby recommendations
  const itineraryLocations = Object.values(trip.itinerary || {})
    .flat()
    .map((a) => (a as Activity).location || (a as Activity).title)
    .filter(Boolean)
    .slice(0, 10);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadPlaces = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          destination: trip.destination,
          category: category === 'All' ? '' : category,
          nearbyLocations: itineraryLocations,
        }),
      });
      const data = await res.json();
      setPlaces(data.places || []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [trip.destination]);

  useEffect(() => { loadPlaces(filter); }, [filter, loadPlaces]);

  const addToItinerary = (place: Record<string, unknown>) => {
    setTempActivity({
      title: place.name as string,
      category: place.category as string,
      icon: 'map-pin',
      location: place.location as string,
      notes: place.description as string,
    });
    setDayModalOpen(true);
  };

  return (
    <div className="p-5 pb-10 space-y-4">
      {/* Context header */}
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <p className="text-sm font-bold text-[#1D1D1D]">
          {itineraryLocations.length > 0 ? 'Nearby your itinerary' : `Discover ${trip.destination}`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {itineraryLocations.length > 0
            ? `Places near ${itineraryLocations.slice(0, 3).join(', ')}${itineraryLocations.length > 3 ? ' & more' : ''}`
            : 'AI-curated recommendations for your trip'}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === f ? 'bg-[#1D1D1D] text-white' : 'bg-white text-gray-600 shadow-soft hover:shadow-card'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-soft">
              <div className="h-40 skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-4 skeleton w-3/4" />
                <div className="h-3 skeleton w-full" />
                <div className="h-3 skeleton w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400">No places found. Try a different filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(places as Record<string, unknown>[]).map((place) => (
            <PlaceCard key={place.id as string} place={place} onAdd={() => addToItinerary(place)} />
          ))}
        </div>
      )}

      <DayModal tripId={tripId} days={[]} />
    </div>
  );
}

function PlaceCard({ place, onAdd }: { place: Record<string, unknown>; onAdd: () => void }) {
  const [imgError, setImgError] = useState(false);
  const fallback = `https://source.unsplash.com/featured/800x400?${encodeURIComponent((place.name as string) + ' travel')}`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-shadow">
      <div className="h-44 relative overflow-hidden">
        <img
          src={imgError ? fallback : (place.image as string)}
          alt={place.name as string}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-xl px-2.5 py-1.5 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-bold text-[#1D1D1D]">{place.rating as number}</span>
          <span className="text-[10px] text-gray-400">({(place.reviews as number).toLocaleString()})</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <h3 className="text-white font-bold text-lg leading-tight">{place.name as string}</h3>
          <p className="text-white/80 text-xs mt-0.5">{place.category as string} · {(place.priceLevel as string) || 'Free'}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{place.description as string}</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{place.duration as string}</span>
          <span className="flex items-center gap-1"><Sun className="w-3 h-3" />{place.bestTime as string}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{place.location as string}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            className="flex-1 py-2.5 bg-[#607BFF]/10 text-[#607BFF] rounded-xl text-sm font-semibold cursor-pointer hover:bg-[#607BFF]/20 transition-colors"
          >
            + Add to itinerary
          </button>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((place.name as string) + ' ' + (place.location as string))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ trip, tripId }: { trip: Trip; tripId: string }) {
  const router = useRouter();
  const { user } = useAppStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = detectCurrency(trip.destination);

  useEffect(() => {
    getTripExpenses(tripId)
      .then(setExpenses)
      .catch((err) => console.error('Failed to load expenses:', err))
      .finally(() => setLoading(false));
  }, [tripId]);

  const total = getTotalSpent(expenses);
  const youOwe = user ? getYouOwe(expenses, user.uid) : 0;

  const handleDelete = async (id: string) => {
    const { deleteExpense } = await import('@/services/expenses');
    await deleteExpense(id).catch(() => {});
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="p-5 pb-10 space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <p className="text-sm text-gray-500 mb-1">Total Trip Expenses</p>
        <h2 className="text-4xl font-bold text-[#1D1D1D]">{currency.symbol}{total.toFixed(2)}</h2>
        {youOwe > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">You owe</span>
            </div>
            <span className="text-lg font-bold text-red-600">{currency.symbol}{youOwe.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/trip/${tripId}/add-expense`)}
          className="flex-1 bg-[#1D1D1D] text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
        <button className="flex-1 bg-white text-[#1D1D1D] py-3 rounded-xl text-sm font-semibold shadow-soft flex items-center justify-center gap-2 cursor-pointer hover:shadow-card transition-shadow">
          Split Equally
        </button>
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl shadow-soft">
          <p className="text-3xl mb-3">💸</p>
          <p className="text-gray-500 font-medium">No expenses yet</p>
          <button
            onClick={() => router.push(`/trip/${tripId}/add-expense`)}
            className="mt-3 text-[#607BFF] text-sm font-semibold cursor-pointer"
          >Add your first expense</button>
        </div>
      ) : (
        <div>
          <h3 className="font-bold text-[#1D1D1D] mb-3">Recent Expenses</h3>
          <div className="space-y-3">
            {expenses.map((e) => (
              <ExpenseCard key={e.id} expense={e} participants={trip.participants} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Balances */}
      {expenses.length > 0 && user && (
        <div>
          <h3 className="font-bold text-[#1D1D1D] mb-3">Balances</h3>
          <div className="bg-white rounded-2xl p-4 shadow-soft space-y-3">
            {calculateBalances(expenses, trip.participants, user.uid).map((balance) => {
              const participant = trip.participants.find(p => p.id === balance.participantId);
              if (!participant) return null;
              return (
                <div key={balance.participantId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {participant.photoURL ? (
                      <img src={participant.photoURL} alt={participant.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#607BFF] text-white flex items-center justify-center font-bold">{participant.initial}</div>
                    )}
                    <span className="font-medium text-sm text-[#1D1D1D]">{participant.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    balance.status === 'owe'        ? 'text-red-500'   :
                    balance.status === 'owedToYou'  ? 'text-green-500' :
                                                      'text-gray-400'
                  }`}>
                    {balance.status === 'owe'       ? `You owe ${currency.symbol}${balance.amount.toFixed(2)}`    :
                     balance.status === 'owedToYou' ? `Owes you ${currency.symbol}${balance.amount.toFixed(2)}`   :
                                                      'Settled ✓'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;
  const { currentTrip, allTrips, setCurrentTrip, tripTab, minervaOpen, setMinervaOpen } = useAppStore();
  const [pageTrip, setPageTrip] = useState<Trip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load trip — prefer store cache, then Supabase, then allTrips fallback
  useEffect(() => {
    const cached = currentTrip?.id === tripId ? currentTrip : null;
    if (cached) { setPageTrip(cached); setLoadingTrip(false); return; }
    getTrip(tripId)
      .then((t) => {
        if (t) { setPageTrip(t); setCurrentTrip(t); return; }
        // Supabase didn't find it — check locally-stored trips
        const local = allTrips.find(lt => lt.id === tripId);
        if (local) { setPageTrip(local); setCurrentTrip(local); }
      })
      .catch(() => {
        const local = allTrips.find(lt => lt.id === tripId);
        if (local) { setPageTrip(local); setCurrentTrip(local); }
      })
      .finally(() => setLoadingTrip(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Keep pageTrip in sync with store (after Minerva updates itinerary)
  useEffect(() => {
    if (currentTrip?.id === tripId) setPageTrip(currentTrip);
  }, [currentTrip, tripId]);

  useEffect(() => {
    getTripExpenses(tripId).then(setExpenses).catch(() => {});
  }, [tripId]);

  const totalActivities = pageTrip ? (Object.values(pageTrip.itinerary || {}).flat() as Activity[]).length : 0;

  if (loadingTrip) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F5F3F2] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#607BFF] animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!pageTrip) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F5F3F2] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-gray-500">Trip not found.</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2] pb-28">
        <TripHeader destination={pageTrip.destination} dates={pageTrip.dates} />

        {tripTab === 'overview'   && <OverviewTab  trip={pageTrip} tripId={tripId} totalActivities={totalActivities} expenses={expenses} />}
        {tripTab === 'itinerary'  && <ItineraryTab trip={pageTrip} tripId={tripId} />}
        {tripTab === 'explore'    && <ExploreTab   trip={pageTrip} tripId={tripId} />}
        {tripTab === 'expenses'   && <ExpensesTab  trip={pageTrip} tripId={tripId} />}
      </div>

      <FloatingNav />
      <SlideMenu tripId={tripId} />
      {minervaOpen && <MinervaPanel tripId={tripId} destination={pageTrip.destination} startDate={pageTrip.startDate} tripDays={
        pageTrip.startDate && pageTrip.endDate
          ? Math.ceil((new Date(pageTrip.endDate).getTime() - new Date(pageTrip.startDate).getTime()) / 86400000) + 1
          : 3
      } travelStyle={pageTrip.preferences?.pace} />}
    </AuthGuard>
  );
}
