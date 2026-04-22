'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Copy, Check, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getTrip } from '@/services/trips';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import FloatingNav from '@/components/FloatingNav';
import { Trip, Participant } from '@/types';
import { showToast } from '@/components/Toast';

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { currentTrip, allTrips, user, setCurrentTrip } = useAppStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = currentTrip?.id === tripId ? currentTrip
      : allTrips.find(t => t.id === tripId) ?? null;
    if (cached) { setTrip(cached); return; }
    getTrip(tripId).then(t => { if (t) setTrip(t); }).catch(() => {});
  }, [tripId, currentTrip, allTrips]);

  const inviteUrl = typeof window !== 'undefined' && trip?.inviteCode
    ? `${window.location.origin}/join/${trip.inviteCode}`
    : null;

  const isOwner = user?.uid === trip?.ownerId;

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      showToast('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePermissionChange = async (participantId: string, role: 'editor' | 'viewer') => {
    if (!trip || !isOwner) return;
    setOpenMenuId(null);
    setSaving(true);
    const updatedParticipants: Participant[] = trip.participants.map(p =>
      p.id === participantId ? { ...p, role } : p
    );
    const { error } = await supabase
      .from('trips')
      .update({ participants: updatedParticipants })
      .eq('id', trip.id);
    if (error) {
      showToast('Failed to update permission', 'error');
    } else {
      const updatedTrip = { ...trip, participants: updatedParticipants };
      setTrip(updatedTrip);
      setCurrentTrip(updatedTrip);
      showToast('Permission updated');
    }
    setSaving(false);
  };

  if (!trip) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#607BFF] border-t-transparent animate-spin" />
        </div>
        <FloatingNav />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-[#1D1D1D]">
            Group · {trip.destination}
          </h1>
          <button
            onClick={handleCopy}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
            title="Copy invite link"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-700" />}
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 text-center px-8 py-4">
          Invite friends and family here to plan your trip together.
          {isOwner && ' Tap the role badge to change a member\'s access.'}
        </p>

        {/* Members list */}
        <div className="flex-1 px-5 space-y-1">
          {trip.participants.map((p) => {
            const isParticipantOwner = p.id === trip.ownerId;
            const role = isParticipantOwner ? 'editor' : (p.role ?? 'editor');
            const canToggle = isOwner && !isParticipantOwner;

            return (
              <div key={p.id} className="flex items-center gap-4 py-4 border-b border-gray-50">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.photoURL ? (
                    <img src={p.photoURL} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-medium text-sm">
                      {(p.initial || p.name?.[0] || 'T').toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1D1D1D] text-sm">{p.name || 'Traveler'}</p>
                  <span className="text-xs text-gray-400">
                    {isParticipantOwner ? 'Organiser' : 'Member'}
                  </span>
                </div>

                {/* Permission badge */}
                <div className="relative">
                  <button
                    disabled={!canToggle || saving}
                    onClick={() => canToggle && setOpenMenuId(openMenuId === p.id ? null : p.id)}
                    className={`flex items-center gap-1 border rounded-lg px-3 py-1.5 transition-colors ${
                      canToggle
                        ? 'border-gray-200 hover:border-[#607BFF] hover:bg-[#607BFF]/5 cursor-pointer'
                        : 'border-gray-100 cursor-default'
                    }`}
                  >
                    <span className={`text-xs font-medium ${role === 'editor' ? 'text-[#607BFF]' : 'text-gray-500'}`}>
                      {isParticipantOwner ? 'Can edit' : role === 'editor' ? 'Can edit' : 'Can view'}
                    </span>
                    {canToggle && <ChevronDown className="w-3 h-3 text-gray-400" />}
                  </button>

                  {/* Permission dropdown */}
                  {openMenuId === p.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-9 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-32">
                        {(['editor', 'viewer'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => handlePermissionChange(p.id, r)}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                              role === r
                                ? 'bg-[#607BFF]/10 text-[#607BFF] font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {r === 'editor' ? 'Can edit' : 'Can view'}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="px-5 pb-6 pt-6 space-y-3">
          {inviteUrl && (
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
              <span className="text-sm font-medium text-gray-700">
                {copied ? 'Link copied!' : 'Copy invite link'}
              </span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add members
          </button>
        </div>
      </div>
      <FloatingNav />
    </AuthGuard>
  );
}
