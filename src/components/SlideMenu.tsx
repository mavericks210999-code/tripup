'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

interface SlideMenuProps {
  tripId?: string;
}

export default function SlideMenu({ tripId }: SlideMenuProps) {
  const { menuOpen, setMenuOpen, setDayModalOpen, setTempActivity, setTripTab } = useAppStore();
  const router = useRouter();

  if (!menuOpen) return null;

  const handleItem = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const items = [
    {
      label: 'Expense',
      action: () => tripId && router.push(`/trip/${tripId}/add-expense`),
    },
    {
      label: 'Place',
      action: () => { setTempActivity({ category: 'Sightseeing', icon: 'map-pin' }); setDayModalOpen(true); },
    },
    {
      label: 'Reservation',
      action: () => { setTempActivity({ category: 'Hotel', icon: 'hotel' }); setDayModalOpen(true); },
    },
    {
      label: 'Transport',
      action: () => { setTempActivity({ category: 'Transport', icon: 'car' }); setDayModalOpen(true); },
    },
    {
      label: 'Note',
      action: () => { setTempActivity({ category: 'Other', icon: 'map-pin' }); setDayModalOpen(true); },
    },
    {
      label: 'Members',
      action: () => {
        if (tripId) router.push(`/trip/${tripId}/members`);
      },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-backdrop"
        onClick={() => setMenuOpen(false)}
      />

      {/* Sheet — slides up from centre bottom, nav bar stays visible above */}
      <div
        className="fixed z-50 bg-white rounded-t-[28px] pt-4 pb-32 px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] animate-slide-up"
        style={{
          bottom: 0,
          left: '50%',
          width: 'min(100%, 448px)',
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="grid grid-cols-3 gap-3">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => handleItem(item.action)}
              className="py-4 px-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-[#1D1D1D]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
