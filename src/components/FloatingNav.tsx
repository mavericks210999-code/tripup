'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Map, Plus, Compass, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  special?: boolean;
}

export default function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { setMenuOpen, currentTrip, setTripTab, tripTab } = useAppStore();

  const onTripPage = pathname.startsWith('/trip/');

  const goToItinerary = () => {
    if (currentTrip?.id) {
      setTripTab('itinerary');
      router.push(`/trip/${currentTrip.id}`);
    } else {
      router.push('/home');
    }
  };

  const goToExplore = () => {
    if (onTripPage && currentTrip?.id) {
      // Already on trip page — just switch to explore tab
      setTripTab('explore');
    } else {
      // Home context — global explore
      router.push('/explore');
    }
  };

  const navItems: NavItem[] = [
    { label: 'Home',    icon: <Home className="w-5 h-5" />,    href: '/home' },
    { label: 'Trip',    icon: <Map className="w-5 h-5" />,     action: goToItinerary },
    {
      label: '',
      icon: <Plus className="w-5 h-5 text-white" />,
      action: () => setMenuOpen(true),
      special: true,
    },
    { label: 'Explore', icon: <Compass className="w-5 h-5" />, action: goToExplore },
    { label: 'Profile', icon: <User className="w-5 h-5" />,   href: '/profile' },
  ];

  return (
    <div
      className="fixed bottom-5 z-50"
      style={{ left: '50%', transform: 'translateX(-50%)', width: 'min(calc(100% - 32px), calc(448px - 32px))' }}
    >
      <div className="bg-white rounded-[32px] px-6 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)] flex items-center justify-around">
        {navItems.map((item, i) => {
          if (item.special) {
            return (
              <button
                key={i}
                onClick={item.action}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-10 h-10 bg-[#1D1D1D] rounded-full flex items-center justify-center">
                  {item.icon}
                </div>
              </button>
            );
          }
          const isActive = item.href
            ? pathname === item.href || pathname.startsWith(item.href + '/')
            : item.label === 'Trip'
              ? pathname.startsWith('/trip/') && tripTab !== 'explore'
              : item.label === 'Explore'
                ? pathname.startsWith('/trip/') && tripTab === 'explore' || pathname === '/explore'
                : false;
          return (
            <button
              key={i}
              onClick={() => item.action ? item.action() : item.href && router.push(item.href)}
              className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive ? 'text-[#607BFF]' : 'text-gray-400'
              }`}
            >
              {item.icon}
              {item.label && (
                <span className="text-[10px] font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
