'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass, MapPin, Thermometer, Star, ChevronDown, ChevronUp,
  Calendar, Users, X, ArrowRight, CheckCircle2, Sparkles,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import FloatingNav from '@/components/FloatingNav';

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRENDING_DESTINATIONS = [
  {
    name: 'Bali, Indonesia',
    country: 'Indonesia',
    temp: '28°C',
    season: 'Dry season',
    rating: 4.8,
    tags: ['Beaches', 'Temples', 'Wellness'],
    photoId: '1537996194471-e657df975ab4',
    description: 'Tropical paradise with world-class surf, ancient temples, and lush rice terraces.',
    thingsToDo: [
      'Surf world-class waves at Kuta or Uluwatu beaches',
      'Watch sunrise from the rim of Mount Batur volcano',
      'Explore the Sacred Monkey Forest Sanctuary in Ubud',
      'Visit ancient Tanah Lot sea temple at golden hour',
      'Take a traditional Balinese cooking class',
      'Cycle through emerald-green Tegalalang rice terraces',
    ],
  },
  {
    name: 'Kyoto, Japan',
    country: 'Japan',
    temp: '22°C',
    season: 'Cherry blossom',
    rating: 4.9,
    tags: ['Culture', 'Temples', 'Food'],
    photoId: '1540959733332-eab4deabeeaf',
    description: 'Ancient capital where geishas, bamboo forests and zen gardens meet modernity.',
    thingsToDo: [
      'Walk the iconic Arashiyama Bamboo Grove at dawn',
      'Stroll thousands of torii gates at Fushimi Inari Shrine',
      'Catch a geisha performance in Gion district',
      'Experience a traditional tea ceremony in Higashiyama',
      'Visit the golden Kinkaku-ji Temple at sunrise',
      'Sample kaiseki multi-course cuisine at a local ryokan',
    ],
  },
  {
    name: 'Amalfi Coast, Italy',
    country: 'Italy',
    temp: '26°C',
    season: 'Summer',
    rating: 4.9,
    tags: ['Coastline', 'Food', 'Architecture'],
    photoId: '1499678587654-68c7b7d2da0c',
    description: 'Dramatic cliffs, colorful villages, and the best seafood in the Mediterranean.',
    thingsToDo: [
      'Hike the spectacular Path of the Gods coastal trail',
      'Take a boat tour to the Blue Grotto sea cave in Capri',
      'Explore the ancient ruins of Pompeii nearby',
      'Taste fresh limoncello and handmade pasta in Ravello',
      'Swim off the black sand beaches of Positano',
      'Drive the hairpin-bending SS163 coastal road',
    ],
  },
  {
    name: 'Santorini, Greece',
    country: 'Greece',
    temp: '24°C',
    season: 'Perfect weather',
    rating: 4.8,
    tags: ['Sunsets', 'Beaches', 'Romance'],
    photoId: '1570077188670-e3a8d69ac5ff',
    description: 'Iconic whitewashed villages, volcanic beaches, and unforgettable sunsets.',
    thingsToDo: [
      'Watch the legendary sunset from Oia village',
      'Swim at the volcanic Red Beach near Akrotiri',
      'Tour the ancient ruins of Akrotiri prehistoric city',
      'Sail around the caldera on a catamaran',
      'Sample local wine at a cliffside winery in Pyrgos',
      'Explore the medieval village of Pyrgos at dusk',
    ],
  },
  {
    name: 'Patagonia, Argentina',
    country: 'Argentina',
    temp: '12°C',
    season: 'Hiking season',
    rating: 4.9,
    tags: ['Adventure', 'Nature', 'Trekking'],
    photoId: '1464822759023-fed622ff2c3b',
    description: 'The end of the world — glaciers, jagged peaks, and endless wilderness.',
    thingsToDo: [
      'Trek the iconic W Circuit in Torres del Paine',
      'Walk on the Perito Moreno Glacier ice field',
      'Spot penguins at the Magdalena Island colony',
      'Horse ride across the Patagonian steppe at sunset',
      'Kayak through Los Glaciares National Park',
      'Watch condors soar above Mirador del Cóndor',
    ],
  },
  {
    name: 'Marrakech, Morocco',
    country: 'Morocco',
    temp: '30°C',
    season: 'Spring',
    rating: 4.7,
    tags: ['Markets', 'Culture', 'Desert'],
    photoId: '1534236800297-8ef5c5cbcf18',
    description: 'A sensory overload of spices, colors and ancient medinas in the Maghreb.',
    thingsToDo: [
      'Get lost in the labyrinthine souks of the Medina',
      'Visit the famous Jardin Majorelle and YSL Museum',
      'Take an overnight camel trek into the Sahara',
      'Sip mint tea in Djemaa el-Fna square at sunset',
      'Explore the ancient Bahia Palace and its gardens',
      'Take a day trip to the Atlas Mountains Berber villages',
    ],
  },
  {
    name: 'Lisbon, Portugal',
    country: 'Portugal',
    temp: '20°C',
    season: 'Best weather',
    rating: 4.8,
    tags: ['Culture', 'Food', 'Nightlife'],
    photoId: '1585208798174-9b804a92b77c',
    description: 'Seven hills, pastel buildings, world-class food and the home of Fado music.',
    thingsToDo: [
      'Ride the iconic yellow Tram 28 through historic Alfama',
      'Watch a soulful Fado performance in a traditional adega',
      'Eat pastel de nata at the original Pastéis de Belém',
      'Explore the ornate Jerónimos Monastery in Belém',
      'Wander the cobblestone streets of LX Factory market',
      'Take a day trip to the fairytale palaces of Sintra',
    ],
  },
  {
    name: 'New York, USA',
    country: 'USA',
    temp: '18°C',
    season: 'Spring',
    rating: 4.7,
    tags: ['City', 'Art', 'Food'],
    photoId: '1534430480872-3498386e7856',
    description: 'The city that never sleeps — museums, Broadway, Central Park and endless neighborhoods.',
    thingsToDo: [
      'Walk across the iconic Brooklyn Bridge at sunrise',
      'Explore world-class art at the Metropolitan Museum',
      'See a Broadway show in the Theater District',
      'Eat your way through Chelsea Market food hall',
      'Take the Staten Island Ferry for free Manhattan skyline views',
      'Stroll the elevated High Line park above the Meatpacking District',
    ],
  },
];

// ─── Trip Planning Modal ───────────────────────────────────────────────────────

interface PlanModalProps {
  destination: string;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string, groupSize: number) => void;
}

function PlanModal({ destination, onClose, onConfirm }: PlanModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupSize, setGroupSize] = useState(2);

  const tripDays =
    startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
      : 0;

  const valid = startDate && endDate && new Date(endDate) >= new Date(startDate);

  return (
    <>
      {/* Backdrop — sits below FloatingNav (z-50) */}
      <div
        className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides up behind the nav bar (z-40 < nav z-50) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl p-6 pb-28 shadow-2xl animate-fade-in-up max-w-lg mx-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#1D1D1D]">Plan your trip</h2>
            <p className="text-sm text-[#607BFF] font-medium mt-0.5">{destination}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Dates */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1D1D1D]">
            <Calendar className="w-4 h-4 text-[#607BFF]" />
            Travel dates
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Departure</label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-[#1D1D1D] outline-none border border-gray-200 focus:border-[#607BFF] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Return</label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-[#1D1D1D] outline-none border border-gray-200 focus:border-[#607BFF] transition-colors"
              />
            </div>
          </div>
          {tripDays > 0 && (
            <div className="bg-[#607BFF]/10 rounded-xl px-4 py-2 text-center">
              <span className="text-[#607BFF] font-semibold text-sm">
                {tripDays} day{tripDays !== 1 ? 's' : ''} · Minerva will plan each one ✨
              </span>
            </div>
          )}
        </div>

        {/* Group size */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1D1D1D]">
              <Users className="w-4 h-4 text-[#607BFF]" />
              Travelers
            </div>
            <span className="text-lg font-bold text-[#607BFF]">{groupSize}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 text-[#1D1D1D] font-bold flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
            >
              −
            </button>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: Math.min(groupSize, 8) }).map((_, i) => (
                <div key={i} className="flex-1 h-2 bg-[#607BFF] rounded-full" />
              ))}
              {Array.from({ length: Math.max(0, 8 - groupSize) }).map((_, i) => (
                <div key={i} className="flex-1 h-2 bg-gray-200 rounded-full" />
              ))}
            </div>
            <button
              onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 text-[#1D1D1D] font-bold flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {groupSize === 1 ? 'Solo traveler' : groupSize === 2 ? 'Couple or friends' : `Group of ${groupSize}`}
          </p>
        </div>

        <button
          disabled={!valid}
          onClick={() => valid && onConfirm(startDate, endDate, groupSize)}
          className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer hover:bg-gray-800 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Continue &amp; plan with Minerva
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

// ─── Destination Card ──────────────────────────────────────────────────────────

interface Destination {
  name: string;
  country: string;
  temp: string;
  season: string;
  rating: number;
  tags: string[];
  photoId: string;
  description: string;
  thingsToDo: string[];
}

function DestinationCard({
  dest,
  onPlanTrip,
}: {
  dest: Destination;
  onPlanTrip: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? dest.thingsToDo : dest.thingsToDo.slice(0, 3);

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.06)_0px_8px_16px]">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={`https://images.unsplash.com/photo-${dest.photoId}?w=800&h=400&fit=crop&q=80`}
          alt={dest.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Temp badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
          <Thermometer className="w-3 h-3 text-orange-500" />
          <span className="text-xs font-medium text-[#222222]">{dest.temp}</span>
        </div>

        {/* Season badge */}
        <div className="absolute bottom-3 left-3 bg-[#607BFF] rounded-full px-3 py-1">
          <span className="text-[11px] font-medium text-white">{dest.season}</span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        {/* Name + rating */}
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-bold text-[#222222] text-base">{dest.name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-[#222222]">{dest.rating}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-3">{dest.description}</p>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap mb-4">
          {dest.tags.map((tag, j) => (
            <span
              key={j}
              className="text-xs font-medium text-[#607BFF] bg-[#607BFF]/8 px-2.5 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Things to do */}
        <div className="border-t border-gray-100 pt-3 mb-4">
          <p className="text-xs font-bold text-[#222222] uppercase tracking-wider mb-2.5">
            Things to do
          </p>
          <ul className="space-y-2">
            {visibleItems.map((item, k) => (
              <li key={k} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#607BFF] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 leading-snug">{item}</span>
              </li>
            ))}
          </ul>
          {dest.thingsToDo.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-[#607BFF] cursor-pointer"
            >
              {expanded ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> +{dest.thingsToDo.length - 3} more things to do</>
              )}
            </button>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onPlanTrip(dest.name)}
          className="w-full bg-[#1D1D1D] text-white py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4" />
          Plan a trip here
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const router = useRouter();
  const [planningDest, setPlanningDest] = useState<string | null>(null);

  const handleConfirm = (startDate: string, endDate: string, groupSize: number) => {
    if (!planningDest) return;
    const params = new URLSearchParams({
      destination: planningDest,
      startDate,
      endDate,
      groupSize: groupSize.toString(),
    });
    router.push(`/create-trip?${params.toString()}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2] pb-28">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#607BFF]/10 rounded-full flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#607BFF]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#222222]">Explore</h1>
              <p className="text-xs text-gray-500">Discover your next adventure</p>
            </div>
          </div>

          {/* Search hint */}
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px]">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Where do you want to go?</span>
          </div>
        </div>

        {/* Trending section */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#222222]">Trending now</h2>
            <span className="text-xs text-gray-400">Updated weekly</span>
          </div>

          <div className="space-y-4">
            {TRENDING_DESTINATIONS.map((dest, i) => (
              <DestinationCard
                key={i}
                dest={dest}
                onPlanTrip={(name) => setPlanningDest(name)}
              />
            ))}
          </div>
        </div>
      </div>

      <FloatingNav />

      {planningDest && (
        <PlanModal
          destination={planningDest}
          onClose={() => setPlanningDest(null)}
          onConfirm={handleConfirm}
        />
      )}
    </AuthGuard>
  );
}
