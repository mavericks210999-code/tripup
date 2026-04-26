'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AuroraOrb } from '@/components/AuroraOrb';
import { TripTab } from '@/types';

interface TripHeaderProps {
  destination: string;
  dates: string;
  showBack?: boolean;
}

const TABS: { key: TripTab; label: string }[] = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'itinerary', label: 'Itinerary' },
  { key: 'explore',   label: 'Explore'   },
  { key: 'expenses',  label: 'Expenses'  },
];

export default function TripHeader({ destination, dates, showBack = true }: TripHeaderProps) {
  const router = useRouter();
  const { tripTab, setTripTab, setMinervaOpen, setMenuOpen } = useAppStore();

  return (
    <div className="sticky top-0 z-30 bg-[#F5F3F2]/95 backdrop-blur-sm px-5 py-3 border-b border-gray-200/50">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <div className="text-center">
          <h2 className="font-bold text-[#1D1D1D] text-lg leading-tight">{destination}</h2>
          <p className="text-xs text-gray-500">{dates}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinervaOpen(true)}
            className="w-10 h-10 rounded-full overflow-hidden shadow-soft"
            title="Ask Aurora"
          >
            <AuroraOrb />
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            title="Quick add"
          >
            <MoreHorizontal className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Tabs with sliding underline */}
      <div className="flex relative">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTripTab(tab.key)}
            className={`flex-1 pb-2.5 text-sm font-medium transition-colors relative ${
              tripTab === tab.key ? 'text-[#1D1D1D]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tripTab === tab.key && (
              <span className="absolute bottom-0 left-[10%] right-[10%] h-0.5 bg-[#607BFF] rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
