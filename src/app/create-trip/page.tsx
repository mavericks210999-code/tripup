'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Sparkles, Check, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { createTrip, updateTripItinerary } from '@/services/trips';
import { generateItinerary } from '@/services/ai';
import { detectCurrency } from '@/lib/currency';
import AuthGuard from '@/components/AuthGuard';
import { showToast } from '@/components/Toast';
import { getAuthHeaders } from '@/lib/clientAuth';
import type { Activity } from '@/types';

// ─── Destination cover image lookup ──────────────────────────────────────────
async function fetchCoverImage(destination: string): Promise<string> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/destination-image?destination=${encodeURIComponent(destination)}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.url || getFallbackImage(destination);
    }
  } catch { /* fall through */ }
  return getFallbackImage(destination);
}

function getFallbackImage(destination: string): string {
  return `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=500&fit=crop&q=80`;
}

function getCoverImage(destination: string): string {
  return getFallbackImage(destination);
}

// ─── Travel style options ─────────────────────────────────────────────────────
const PACE_OPTIONS = [
  { key: 'relaxed', label: 'Relaxed', desc: '1–2 activities/day, lots of downtime', emoji: '🌿' },
  { key: 'moderate', label: 'Moderate', desc: '3–4 activities/day, balanced', emoji: '⚖️' },
  { key: 'packed', label: 'Packed', desc: '5+ activities/day, see everything', emoji: '🚀' },
];

const BUDGET_OPTIONS = [
  { key: 'budget', label: 'Budget', desc: 'Hostels, street food, free sights', emoji: '🎒' },
  { key: 'mid-range', label: 'Mid-range', desc: '3★ hotels, local restaurants', emoji: '✈️' },
  { key: 'luxury', label: 'Luxury', desc: '5★ hotels, fine dining, VIP', emoji: '💎' },
];

const STYLE_OPTIONS = [
  { key: 'culture', label: 'Culture & History', emoji: '🏛️' },
  { key: 'food', label: 'Food & Drink', emoji: '🍜' },
  { key: 'nature', label: 'Nature & Adventure', emoji: '🏔️' },
  { key: 'nightlife', label: 'Nightlife', emoji: '🎵' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { key: 'relaxation', label: 'Beach & Relaxation', emoji: '🏖️' },
];

function CreateTripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setCurrentTrip } = useAppStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'creating' | 'planning'>('creating');
  const [error, setError] = useState('');

  // Step 1
  const [destination, setDestination] = useState('');

  // Step 2
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupSize, setGroupSize] = useState(2);

  // Pre-fill from explore page query params
  useEffect(() => {
    const dest = searchParams.get('destination');
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    const size = searchParams.get('groupSize');
    if (dest) setDestination(dest);
    if (start) setStartDate(start);
    if (end) setEndDate(end);
    if (size) setGroupSize(parseInt(size, 10) || 2);
    if (dest && start && end) setStep(3);
    else if (dest) setStep(2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 3
  const [pace, setPace] = useState('moderate');
  const [budget, setBudget] = useState('mid-range');
  const [styles, setStyles] = useState<string[]>(['culture']);

  const toggleStyle = (key: string) =>
    setStyles((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );

  const tripDays = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
    : 0;

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr =
        start.getDate() === end.getDate() && start.getMonth() === end.getMonth()
          ? `${start.getDate()} ${monthNames[start.getMonth()]}`
          : `${start.getDate()}–${end.getDate()} ${monthNames[start.getMonth()]}`;

      const currency = detectCurrency(destination);

      const tripData = {
        destination,
        dates: dateStr,
        startDate,
        endDate,
        coverImage: await fetchCoverImage(destination),
        ownerId: user.uid,
        participants: [{
          id: user.uid,
          name: user.name,
          initial: user.name[0].toUpperCase(),
          photoURL: user.photoURL,
        }],
        itinerary: {},
        preferences: { pace: pace as 'relaxed' | 'moderate' | 'packed', budget, style: styles, currency: currency.code },
      };

      const tripId = await createTrip(tripData);

      // Auto-generate itinerary with Minerva using trip preferences
      setLoadingPhase('planning');
      let itinerary: Record<number, Activity[]> = {};
      try {
        const prompt = `Plan a ${tripDays}-day ${pace} trip to ${destination} for ${groupSize} ${groupSize === 1 ? 'person' : 'people'} on a ${budget} budget. Interests: ${styles.join(', ')}.`;
        const result = await generateItinerary(prompt, {
          destination,
          days: tripDays,
          style: `${pace}, ${budget}, ${styles.join(', ')}`,
        });

        const start = new Date(startDate);
        result.days.forEach((day, idx) => {
          const d = new Date(start);
          d.setDate(d.getDate() + idx);
          const dayNum = d.getDate();
          itinerary[dayNum] = day.activities.map((act) => ({
            ...act,
            id: act.id || `act-${dayNum}-${Math.random().toString(36).slice(2)}`,
            completed: false,
          }));
        });

        await updateTripItinerary(tripId, itinerary);
      } catch {
        // Non-fatal — user can generate manually from the trip page
      }

      setCurrentTrip({ id: tripId, ...tripData, itinerary });
      showToast(`${destination} trip created with itinerary! ✈️`);
      router.push(`/trip/${tripId}`);
    } catch (err) {
      setError('Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
      setLoadingPhase('creating');
    }
  };

  // ─── Progress bar ───────────────────────────────────────────────────────────
  const StepDot = ({ n }: { n: number }) => (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
      step === n ? 'bg-[#607BFF] text-white scale-110' :
      step > n  ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
    }`}>
      {step > n ? <Check className="w-4 h-4" /> : n}
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2]">
        {/* Header */}
        <div className="px-5 pt-10 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()} className="text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-3">
              <StepDot n={1} />
              <div className={`h-0.5 w-8 transition-colors ${step > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
              <StepDot n={2} />
              <div className={`h-0.5 w-8 transition-colors ${step > 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
              <StepDot n={3} />
            </div>
            <div className="w-6" />
          </div>
        </div>

        <div className="px-5 pb-10 animate-fade-in-up">

          {/* ─── Step 1: Destination ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#607BFF]" />
                  <span className="text-xs font-semibold text-[#607BFF] uppercase tracking-wider">Step 1 of 3</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1D1D1D] leading-tight">Where are you<br />heading? ✈️</h1>
                <p className="text-gray-500 text-sm mt-2">Minerva will plan your perfect trip there</p>
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#607BFF]" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="City, country or region..."
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-[#1D1D1D] text-lg font-medium outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors shadow-soft"
                />
              </div>

              {/* Quick picks */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-3">Popular destinations</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Tokyo 🗾','Bali 🌴','Paris 🗼','Barcelona 🌞','New York 🗽','Lisbon 🛤️'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDestination(d.split(' ')[0])}
                      className={`py-3 px-2 rounded-2xl text-sm font-medium border-2 transition-all ${
                        destination === d.split(' ')[0]
                          ? 'border-[#607BFF] bg-[#607BFF]/10 text-[#607BFF]'
                          : 'border-gray-100 bg-white text-gray-700 hover:border-[#607BFF]/40'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover preview */}
              {destination.length > 2 && (
                <div className="relative h-44 rounded-3xl overflow-hidden shadow-card animate-fade-in-up">
                  <img
                    src={getCoverImage(destination)}
                    alt={destination}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <p className="text-white font-bold text-2xl">{destination}</p>
                    <p className="text-white/70 text-sm">{detectCurrency(destination).code} · {detectCurrency(destination).symbol}</p>
                  </div>
                </div>
              )}

              <button
                disabled={destination.trim().length < 2}
                onClick={() => setStep(2)}
                className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── Step 2: Dates + Group ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#607BFF]" />
                  <span className="text-xs font-semibold text-[#607BFF] uppercase tracking-wider">Step 2 of 3</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1D1D1D] leading-tight">When & with<br />whom? 📅</h1>
                <p className="text-gray-500 text-sm mt-2">Your trip to <span className="font-semibold text-[#607BFF]">{destination}</span></p>
              </div>

              {/* Dates */}
              <div className="bg-white rounded-2xl p-5 shadow-soft space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D1D1D]">
                  <Calendar className="w-4 h-4 text-[#607BFF]" />
                  Travel Dates
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Departure</label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm text-[#1D1D1D] outline-none border border-transparent focus:border-[#607BFF] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1.5">Return</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm text-[#1D1D1D] outline-none border border-transparent focus:border-[#607BFF] transition-colors"
                    />
                  </div>
                </div>
                {tripDays > 0 && (
                  <div className="bg-[#607BFF]/10 rounded-xl px-4 py-2 text-center">
                    <span className="text-[#607BFF] font-semibold text-sm">{tripDays} day{tripDays !== 1 ? 's' : ''} · Minerva will plan each one</span>
                  </div>
                )}
              </div>

              {/* Group size */}
              <div className="bg-white rounded-2xl p-5 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1D1D1D]">
                    <Users className="w-4 h-4 text-[#607BFF]" />
                    Group Size
                  </div>
                  <span className="text-2xl font-bold text-[#607BFF]">{groupSize}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 text-[#1D1D1D] font-bold text-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                  >−</button>
                  <div className="flex-1 flex gap-1">
                    {Array.from({ length: Math.min(groupSize, 8) }).map((_, i) => (
                      <div key={i} className="flex-1 h-2 bg-[#607BFF] rounded-full" />
                    ))}
                    {Array.from({ length: Math.max(0, 8 - groupSize) }).map((_, i) => (
                      <div key={i} className="flex-1 h-2 bg-gray-100 rounded-full" />
                    ))}
                  </div>
                  <button
                    onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 text-[#1D1D1D] font-bold text-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                  >+</button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">
                  {groupSize === 1 ? 'Solo traveler' : groupSize === 2 ? 'Couple or friends' : `Group of ${groupSize}`}
                </p>
              </div>

              <button
                disabled={!startDate || !endDate || new Date(endDate) < new Date(startDate)}
                onClick={() => setStep(3)}
                className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── Step 3: Travel Style ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#607BFF]" />
                  <span className="text-xs font-semibold text-[#607BFF] uppercase tracking-wider">Step 3 of 3</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1D1D1D] leading-tight">Your travel<br />style 🎒</h1>
                <p className="text-gray-500 text-sm mt-2">Minerva uses this to tailor your itinerary</p>
              </div>

              {/* Pace */}
              <div className="bg-white rounded-2xl p-4 shadow-soft">
                <p className="text-sm font-semibold text-[#1D1D1D] mb-3">Trip Pace</p>
                <div className="space-y-2">
                  {PACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setPace(opt.key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        pace === opt.key ? 'border-[#607BFF] bg-[#607BFF]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <div className="text-left flex-1">
                        <p className={`font-semibold text-sm ${pace === opt.key ? 'text-[#607BFF]' : 'text-[#1D1D1D]'}`}>{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                      {pace === opt.key && <Check className="w-4 h-4 text-[#607BFF]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="bg-white rounded-2xl p-4 shadow-soft">
                <p className="text-sm font-semibold text-[#1D1D1D] mb-3">Budget Level</p>
                <div className="grid grid-cols-3 gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setBudget(opt.key)}
                      className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        budget === opt.key ? 'border-[#607BFF] bg-[#607BFF]/5' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <p className={`text-xs font-semibold ${budget === opt.key ? 'text-[#607BFF]' : 'text-[#1D1D1D]'}`}>{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div className="bg-white rounded-2xl p-4 shadow-soft">
                <p className="text-sm font-semibold text-[#1D1D1D] mb-1">Interests <span className="text-gray-400 font-normal">(pick all that apply)</span></p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => toggleStyle(opt.key)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        styles.includes(opt.key) ? 'border-[#607BFF] bg-[#607BFF]/5' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      <span className={`text-xs font-medium ${styles.includes(opt.key) ? 'text-[#607BFF]' : 'text-gray-600'}`}>{opt.label}</span>
                      {styles.includes(opt.key) && <Check className="w-3 h-3 text-[#607BFF] ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading || styles.length === 0}
                className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {loading ? (
                  loadingPhase === 'creating'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating your trip...</>
                    : <><Sparkles className="w-4 h-4 animate-pulse" /> Minerva is planning your trip...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Create Trip & Plan with Minerva</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400">
                Minerva will generate your {tripDays}-day itinerary automatically ✨
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

export default function CreateTripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F3F2]" />}>
      <CreateTripContent />
    </Suspense>
  );
}
