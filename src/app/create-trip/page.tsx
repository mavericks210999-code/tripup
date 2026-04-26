'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Sparkles, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { createTrip, updateTripItinerary } from '@/services/trips';
import { generateItinerary } from '@/services/ai';
import { detectCurrency } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import { showToast } from '@/components/Toast';
import { getAuthHeaders } from '@/lib/clientAuth';
import { AuroraOrb } from '@/components/AuroraOrb';
import type { Activity } from '@/types';

// ─── Destination cover image lookup ──────────────────────────────────────────
async function fetchCoverImage(destination: string): Promise<string> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/destination-image?destination=${encodeURIComponent(destination)}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.url || getFallbackImage();
    }
  } catch { /* fall through */ }
  return getFallbackImage();
}

function getFallbackImage(): string {
  return `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=500&fit=crop&q=80`;
}

// ─── Travel style options ─────────────────────────────────────────────────────
const PACE_OPTIONS = [
  { key: 'relaxed',  label: 'Relaxed',  desc: '1–2 activities/day, lots of downtime', emoji: '🌿' },
  { key: 'moderate', label: 'Moderate', desc: '3–4 activities/day, balanced',          emoji: '⚖️' },
  { key: 'packed',   label: 'Packed',   desc: '5+ activities/day, see everything',     emoji: '🚀' },
];

const BUDGET_OPTIONS = [
  { key: 'budget',    label: 'Budget',    desc: 'Hostels, street food, free sights', emoji: '🎒' },
  { key: 'mid-range', label: 'Mid-range', desc: '3★ hotels, local restaurants',      emoji: '✈️' },
  { key: 'luxury',    label: 'Luxury',    desc: '5★ hotels, fine dining, VIP',       emoji: '💎' },
];

const STYLE_OPTIONS = [
  { key: 'culture',     label: 'Culture & History',   emoji: '🏛️' },
  { key: 'food',        label: 'Food & Drink',         emoji: '🍜' },
  { key: 'nature',      label: 'Nature & Adventure',   emoji: '🏔️' },
  { key: 'nightlife',   label: 'Nightlife',            emoji: '🎵' },
  { key: 'shopping',    label: 'Shopping',             emoji: '🛍️' },
  { key: 'relaxation',  label: 'Beach & Relaxation',   emoji: '🏖️' },
];

// ─── Aurora loading facts ────────────────────────────────────────────────────
const PLACE_FACTS = [
  { place: 'Tokyo, Japan',          fact: 'Tokyo has over 200,000 restaurants — more than any other city on Earth.' },
  { place: 'Machu Picchu, Peru',    fact: 'The Inca stones at Machu Picchu fit so precisely a knife can\'t pass between them — no mortar used.' },
  { place: 'Iceland',               fact: 'Iceland has no mosquitoes. Scientists still aren\'t entirely sure why.' },
  { place: 'Venice, Italy',         fact: 'Venice is built on 118 small islands connected by 400 bridges, slowly sinking since 421 AD.' },
  { place: 'Bhutan',                fact: 'Bhutan measures success with Gross National Happiness, not GDP — it\'s written into their constitution.' },
  { place: 'The Sahara, Africa',    fact: 'The Sahara Desert is roughly the same size as the entire United States.' },
  { place: 'Antarctica',            fact: 'Antarctica is the world\'s largest desert — receiving less rain annually than the Sahara.' },
  { place: 'Singapore',             fact: 'Singapore is one of only three city-states in the world and one of the most densely populated places on Earth.' },
  { place: 'Norway',                fact: 'Norway\'s coastline is over 100,000 km long when every fjord is traced — longer than the equator.' },
  { place: 'Petra, Jordan',         fact: 'The ancient city of Petra was carved entirely by hand into rose-red sandstone over 2,000 years ago.' },
  { place: 'New Zealand',           fact: 'New Zealand was the last major landmass on Earth to be settled by humans, only around 700 years ago.' },
  { place: 'The Amazon, Brazil',    fact: 'The Amazon River alone discharges more water into the ocean than the next seven largest rivers combined.' },
  { place: 'Cappadocia, Turkey',    fact: 'People have lived inside volcanic rock formations in Cappadocia for over 3,000 years.' },
  { place: 'Maldives',              fact: 'The Maldives is the lowest-lying country on Earth, with an average elevation of just 1.5 metres.' },
  { place: 'Great Wall, China',     fact: 'The Great Wall is not a single wall — it\'s a series of walls built over 2,000 years spanning 21,196 km.' },
  { place: 'Santorini, Greece',     fact: 'Santorini is actually the rim of a massive ancient caldera — the island itself is a volcanic crater.' },
  { place: 'Patagonia, Argentina',  fact: 'Patagonia holds some of the last truly roadless wilderness on Earth, covering an area larger than Germany.' },
  { place: 'Angkor Wat, Cambodia',  fact: 'Angkor Wat is the largest religious monument ever built, covering over 400 square kilometres.' },
];

// ─── Date picker helpers ─────────────────────────────────────────────────────
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = toLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDay(dateStr: string): string {
  if (!dateStr) return '';
  return toLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function CreateTripContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { user, setCurrentTrip, allTrips, setAllTrips } = useAppStore();

  const [step,         setStep]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'creating' | 'planning'>('creating');
  const [error,        setError]        = useState('');

  // Step 1
  const [destination,    setDestination]    = useState('');
  const [coverImageUrl,  setCoverImageUrl]  = useState('');

  // Step 2
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [groupSize,  setGroupSize]  = useState(2);

  // Calendar UI state
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [calOpen,  setCalOpen]  = useState<'start' | 'end' | null>(null);
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const calRef = useRef<HTMLDivElement>(null);

  // Loading facts cycle
  const [factIdx,    setFactIdx]    = useState(() => Math.floor(Math.random() * PLACE_FACTS.length));
  const [factVisible, setFactVisible] = useState(true);

  useEffect(() => {
    if (!loading || loadingPhase !== 'planning') return;
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIdx(i => (i + 1) % PLACE_FACTS.length);
        setFactVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [loading, loadingPhase]);

  // Close calendar on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Pre-fill from explore page query params
  useEffect(() => {
    const dest  = searchParams.get('destination');
    const start = searchParams.get('startDate');
    const end   = searchParams.get('endDate');
    const size  = searchParams.get('groupSize');
    if (dest)  setDestination(dest);
    if (start) setStartDate(start);
    if (end)   setEndDate(end);
    if (size)  setGroupSize(parseInt(size, 10) || 2);
    if (dest && start && end) setStep(3);
    else if (dest) setStep(2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to login if no session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth?redirect=/create-trip');
    });
  }, [router]);

  useEffect(() => {
    if (destination.length < 2) { setCoverImageUrl(''); return; }
    let cancelled = false;
    fetchCoverImage(destination).then(url => { if (!cancelled) setCoverImageUrl(url); });
    return () => { cancelled = true; };
  }, [destination]);

  // Step 3
  const [pace,   setPace]   = useState('moderate');
  const [budget, setBudget] = useState('mid-range');
  const [styles, setStyles] = useState<string[]>(['culture']);

  const toggleStyle = (key: string) =>
    setStyles(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);

  const tripDays = startDate && endDate
    ? Math.ceil((toLocalDate(endDate).getTime() - toLocalDate(startDate).getTime()) / 86400000) + 1
    : 0;

  // ─── Calendar render ───────────────────────────────────────────────────────
  function renderCalendar() {
    const firstDow   = new Date(calYear, calMonth, 1).getDay();
    const daysInMon  = new Date(calYear, calMonth + 1, 0).getDate();
    const startD     = startDate ? toLocalDate(startDate) : null;
    const endD       = endDate   ? toLocalDate(endDate)   : null;

    const prevMonth = () => {
      if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
      else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
      if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
      else setCalMonth(m => m + 1);
    };

    const cells: (number | null)[] = [...Array(firstDow).fill(null)];
    for (let d = 1; d <= daysInMon; d++) cells.push(d);

    return (
      <div className="bg-white rounded-2xl p-4 mt-2 shadow-card border border-gray-100 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-[#1D1D1D]">{CAL_MONTHS[calMonth]} {calYear}</span>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {CAL_DAYS.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const thisD   = new Date(calYear, calMonth, d);
            const dStr    = toDateStr(calYear, calMonth, d);
            const isPast  = thisD < today;
            const isBeforeStart = calOpen === 'end' && startD && thisD < startD;
            const isStart = startD && thisD.getTime() === startD.getTime();
            const isEnd   = endD   && thisD.getTime() === endD.getTime();
            const inRange = startD && endD && thisD > startD && thisD < endD;
            const isToday = thisD.getTime() === today.getTime();
            const disabled = isPast || !!isBeforeStart;

            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => {
                  if (calOpen === 'start') {
                    setStartDate(dStr);
                    if (endD && thisD > endD) setEndDate('');
                    setCalOpen('end');
                  } else {
                    setEndDate(dStr);
                    setCalOpen(null);
                  }
                }}
                className={[
                  'relative flex items-center justify-center h-8 text-xs transition-all select-none',
                  disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer',
                  isStart || isEnd ? 'bg-[#607BFF] text-white rounded-full font-semibold' : '',
                  inRange && !isStart && !isEnd ? 'bg-[#607BFF]/10 text-[#1D1D1D]' : '',
                  !isStart && !isEnd && !inRange && !disabled ? 'hover:bg-gray-100 rounded-full text-[#1D1D1D]' : '',
                  isToday && !isStart && !isEnd ? 'font-bold' : '',
                ].join(' ')}
              >
                {d}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          {calOpen === 'start' ? 'Select departure date' : 'Select return date'}
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!user) { router.replace('/auth?redirect=/create-trip'); return; }
    setLoading(true);
    setError('');
    setFactIdx(Math.floor(Math.random() * PLACE_FACTS.length));
    setFactVisible(true);

    try {
      const start = toLocalDate(startDate);
      const end   = toLocalDate(endDate);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr =
        start.getDate() === end.getDate() && start.getMonth() === end.getMonth()
          ? `${start.getDate()} ${months[start.getMonth()]}`
          : `${start.getDate()}–${end.getDate()} ${months[start.getMonth()]}`;

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
          initial: (user.name || 'T')[0].toUpperCase(),
          photoURL: user.photoURL,
        }],
        itinerary: {},
        preferences: { pace: pace as 'relaxed' | 'moderate' | 'packed', budget, style: styles, currency: currency.code },
      };

      const tripId = await createTrip(tripData);

      setLoadingPhase('planning');
      let itinerary: Record<number, Activity[]> = {};
      try {
        const prompt = `Plan a ${tripDays}-day ${pace} trip to ${destination} for ${groupSize} ${groupSize === 1 ? 'person' : 'people'} on a ${budget} budget. Interests: ${styles.join(', ')}.`;
        const result = await generateItinerary(prompt, {
          destination,
          days: tripDays,
          style: `${pace}, ${budget}, ${styles.join(', ')}`,
        });

        const startD = toLocalDate(startDate);
        result.days.forEach((day, idx) => {
          const d = new Date(startD);
          d.setDate(d.getDate() + idx);
          const dayNum = d.getDate();
          itinerary[dayNum] = day.activities.map(act => ({
            ...act,
            id: act.id || `act-${dayNum}-${Math.random().toString(36).slice(2)}`,
            completed: false,
          }));
        });

        await updateTripItinerary(tripId, itinerary);
      } catch (aiErr) {
        console.error('Aurora generation failed:', aiErr);
        showToast('Trip created! AI planning failed — you can generate it from the trip page.', 'error');
      }

      const fullTrip = { id: tripId, ...tripData, itinerary };
      setCurrentTrip(fullTrip);
      setAllTrips([fullTrip, ...allTrips.filter(t => t.id !== tripId)]);
      if (Object.keys(itinerary).length > 0) showToast(`${destination} trip created with itinerary!`);
      router.push(`/trip/${tripId}`);
    } catch (err) {
      console.error('Trip creation failed:', err);
      setError('Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
      setLoadingPhase('creating');
    }
  };

  // ─── Step dots ─────────────────────────────────────────────────────────────
  const StepDot = ({ n }: { n: number }) => (
    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
      step === n ? 'bg-[#607BFF] text-white scale-110' :
      step > n   ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
    }`}>
      {step > n ? <Check className="w-4 h-4" /> : n}
    </div>
  );

  const currentFact = PLACE_FACTS[factIdx];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2]">

        {/* ─── Aurora planning overlay ────────────────────────────────────── */}
        {loading && loadingPhase === 'planning' && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a14]">
            {/* Orb */}
            <div className="w-48 h-48 mb-8">
              <AuroraOrb isThinking={true} />
            </div>

            {/* Headline */}
            <h2 className="text-white text-2xl font-bold mb-2 text-center px-6">
              Planning your {destination} trip
            </h2>
            <p className="text-white/50 text-sm mb-12">Aurora is crafting your perfect itinerary…</p>

            {/* Fact card */}
            <div
              className="mx-6 max-w-sm text-center transition-opacity duration-400"
              style={{ opacity: factVisible ? 1 : 0 }}
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">
                {currentFact.place}
              </p>
              <p className="text-white/80 text-sm leading-relaxed">
                {currentFact.fact}
              </p>
            </div>

            {/* Dots indicator */}
            <div className="flex gap-1.5 mt-10">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-5 pt-10 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
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

          {/* ─── Step 1: Destination ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#607BFF]" />
                  <span className="text-xs font-semibold text-[#607BFF] uppercase tracking-wider">Step 1 of 3</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1D1D1D] leading-tight">Where are you<br />heading?</h1>
                <p className="text-gray-500 text-sm mt-2">Aurora will plan your perfect trip there</p>
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#607BFF]" />
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="City, country or region..."
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-[#1D1D1D] text-lg font-medium outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors shadow-soft"
                />
              </div>

              <div>
                <p className="text-xs text-gray-400 font-medium mb-3">Popular destinations</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Tokyo 🗾','Bali 🌴','Paris 🗼','Barcelona 🌞','New York 🗽','Lisbon 🛤️'].map(d => (
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

              {destination.length > 2 && (
                <div className="relative h-44 rounded-3xl overflow-hidden shadow-card animate-fade-in-up">
                  <img src={coverImageUrl || getFallbackImage()} alt={destination} className="w-full h-full object-cover" />
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

          {/* ─── Step 2: Dates + Group ────────────────────────────────────── */}
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

              {/* ── Custom date picker ── */}
              <div className="bg-white rounded-2xl p-5 shadow-soft space-y-3" ref={calRef}>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1D1D1D]">
                  <Calendar className="w-4 h-4 text-[#607BFF]" />
                  Travel Dates
                </div>

                {/* Date chips */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Departure */}
                  <button
                    onClick={() => {
                      if (startDate) {
                        const d = toLocalDate(startDate);
                        setCalYear(d.getFullYear());
                        setCalMonth(d.getMonth());
                      } else {
                        setCalYear(today.getFullYear());
                        setCalMonth(today.getMonth());
                      }
                      setCalOpen(calOpen === 'start' ? null : 'start');
                    }}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      calOpen === 'start'
                        ? 'border-[#607BFF] bg-[#607BFF]/5'
                        : startDate
                        ? 'border-gray-100 bg-gray-50 hover:border-[#607BFF]/40'
                        : 'border-dashed border-gray-200 bg-gray-50 hover:border-[#607BFF]/40'
                    }`}
                  >
                    <span className="text-xs text-gray-400 mb-1">Departure</span>
                    {startDate ? (
                      <>
                        <span className="text-base font-bold text-[#1D1D1D] leading-none">{fmtDate(startDate)}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{fmtDay(startDate)}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 font-medium">Select date</span>
                    )}
                  </button>

                  {/* Return */}
                  <button
                    onClick={() => {
                      if (!startDate) return;
                      if (endDate) {
                        const d = toLocalDate(endDate);
                        setCalYear(d.getFullYear());
                        setCalMonth(d.getMonth());
                      } else {
                        const d = toLocalDate(startDate);
                        setCalYear(d.getFullYear());
                        setCalMonth(d.getMonth());
                      }
                      setCalOpen(calOpen === 'end' ? null : 'end');
                    }}
                    disabled={!startDate}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all cursor-pointer disabled:opacity-40 ${
                      calOpen === 'end'
                        ? 'border-[#607BFF] bg-[#607BFF]/5'
                        : endDate
                        ? 'border-gray-100 bg-gray-50 hover:border-[#607BFF]/40'
                        : 'border-dashed border-gray-200 bg-gray-50 hover:border-[#607BFF]/40'
                    }`}
                  >
                    <span className="text-xs text-gray-400 mb-1">Return</span>
                    {endDate ? (
                      <>
                        <span className="text-base font-bold text-[#1D1D1D] leading-none">{fmtDate(endDate)}</span>
                        <span className="text-xs text-gray-400 mt-0.5">{fmtDay(endDate)}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 font-medium">Select date</span>
                    )}
                  </button>
                </div>

                {/* Inline calendar */}
                {calOpen && renderCalendar()}

                {tripDays > 0 && (
                  <div className="bg-[#607BFF]/10 rounded-xl px-4 py-2 text-center">
                    <span className="text-[#607BFF] font-semibold text-sm">
                      {tripDays} day{tripDays !== 1 ? 's' : ''} · Aurora will plan each one
                    </span>
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
                disabled={!startDate || !endDate || toLocalDate(endDate) < toLocalDate(startDate)}
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
                <p className="text-gray-500 text-sm mt-2">Aurora uses this to tailor your itinerary</p>
              </div>

              {/* Pace */}
              <div className="bg-white rounded-2xl p-4 shadow-soft">
                <p className="text-sm font-semibold text-[#1D1D1D] mb-3">Trip Pace</p>
                <div className="space-y-2">
                  {PACE_OPTIONS.map(opt => (
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
                  {BUDGET_OPTIONS.map(opt => (
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
                <p className="text-sm font-semibold text-[#1D1D1D] mb-1">
                  Interests <span className="text-gray-400 font-normal">(pick all that apply)</span>
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {STYLE_OPTIONS.map(opt => (
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
                <Sparkles className="w-4 h-4" />
                {loading && loadingPhase === 'creating' ? 'Creating your trip…' : 'Create Trip with Aurora'}
              </button>
              <p className="text-center text-xs text-gray-400">
                Aurora will generate your {tripDays > 0 ? `${tripDays}-day ` : ''}itinerary automatically ✨
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
