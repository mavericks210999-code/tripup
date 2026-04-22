'use client';

import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { signOut } from '@/services/auth';
import AuthGuard from '@/components/AuthGuard';
import FloatingNav from '@/components/FloatingNav';
import { ArrowLeft, User, Bell, Shield, CreditCard, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, allTrips, setAllTrips, setCurrentTrip, clearMinervaMessages } = useAppStore();

  // Use cached allTrips from store; derive unique countries visited
  const tripCount = allTrips.length;
  const countriesVisited = new Set(allTrips.map((t) => t.country ?? t.destination)).size;
  const memberSince = user?.memberSince
    ? new Date(user.memberSince).getFullYear().toString()
    : new Date().getFullYear().toString();

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setAllTrips([]);
    setCurrentTrip(null);
    clearMinervaMessages();
    router.replace('/auth');
  };

  const menuItems = [
    { icon: <User className="w-5 h-5 text-gray-400" />, label: 'Edit Profile', action: () => {} },
    { icon: <Bell className="w-5 h-5 text-gray-400" />, label: 'Notifications', action: () => {} },
    { icon: <Shield className="w-5 h-5 text-gray-400" />, label: 'Privacy', action: () => {} },
    { icon: <CreditCard className="w-5 h-5 text-gray-400" />, label: 'Payment Methods', action: () => {} },
    { icon: <HelpCircle className="w-5 h-5 text-gray-400" />, label: 'Help & Support', action: () => {} },
    { icon: <LogOut className="w-5 h-5 text-red-500" />, label: 'Logout', action: handleLogout, danger: true },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2] pb-28">
        <div
          className="relative px-5 pt-12 pb-8"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <button onClick={() => router.back()} className="text-white/80 mb-6">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-20 h-20 rounded-full border-4 border-white/30 object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white/30 bg-white/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{user?.name?.[0]?.toUpperCase() ?? 'T'}</span>
              </div>
            )}
            <div className="text-white">
              <h2 className="text-2xl font-bold">{user?.name ?? 'Traveler'}</h2>
              {user?.email && <p className="text-white/70 text-sm">{user.email}</p>}
            </div>
          </div>
        </div>

        <div className="px-5 -mt-4 space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-soft flex justify-around">
            {[{ value: String(tripCount), label: 'Trips' }, { value: String(countriesVisited), label: 'Countries' }, { value: memberSince, label: 'Member since' }].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-[#1D1D1D]">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Menu */}
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {menuItems.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${i !== menuItems.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className={`text-sm ${item.danger ? 'text-red-500' : 'text-[#1D1D1D]'}`}>{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl p-4 shadow-soft">
            <h3 className="font-bold text-[#1D1D1D] mb-3">App Preferences</h3>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#1D1D1D]">Dark Mode</span>
              <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#1D1D1D]">Auto-sync</span>
              <div className="w-12 h-6 bg-[#607BFF] rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 pb-4">TripUp v1.0.0 · Made with ✨ by Minerva AI</p>
        </div>
      </div>
      <FloatingNav />
    </AuthGuard>
  );
}
