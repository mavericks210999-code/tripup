'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { DollarSign, MapPin, Calendar, Truck, FileText, Users } from 'lucide-react';


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
      icon: <DollarSign className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50',
      action: () => tripId && router.push(`/trip/${tripId}/add-expense`),
    },
    {
      label: 'Place',
      icon: <MapPin className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      // Empty title → DayModal shows the form step first
      action: () => { setTempActivity({ category: 'Sightseeing', icon: 'map-pin' }); setDayModalOpen(true); },
    },
    {
      label: 'Reservation',
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50',
      action: () => { setTempActivity({ category: 'Hotel', icon: 'hotel' }); setDayModalOpen(true); },
    },
    {
      label: 'Transport',
      icon: <Truck className="w-5 h-5 text-orange-600" />,
      bg: 'bg-orange-50',
      action: () => { setTempActivity({ category: 'Transport', icon: 'car' }); setDayModalOpen(true); },
    },
    {
      label: 'Note',
      icon: <FileText className="w-5 h-5 text-yellow-600" />,
      bg: 'bg-yellow-50',
      action: () => { setTempActivity({ category: 'Other', icon: 'map-pin' }); setDayModalOpen(true); },
    },
    {
      label: 'Members',
      icon: <Users className="w-5 h-5 text-pink-600" />,
      bg: 'bg-pink-50',
      // Navigate to overview tab (which shows the group/participants section)
      action: () => {
        if (tripId) {
          setTripTab('overview');
          router.push(`/trip/${tripId}`);
        }
      },
    },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-backdrop"
        onClick={() => setMenuOpen(false)}
      />

      {/* Menu — starts behind nav bar, slides up seamlessly */}
      <div
        className="fixed z-50 bg-white rounded-t-[32px] pb-8 pt-5 px-5 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] animate-slide-up"
        style={{
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(100%, 448px)',
        }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="grid grid-cols-3 gap-3">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => handleItem(item.action)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors ${item.bg}`}
            >
              {item.icon}
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
