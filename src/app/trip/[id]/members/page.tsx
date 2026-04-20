'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, MoreHorizontal, UserPlus, Copy, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getTrip } from '@/services/trips';
import AuthGuard from '@/components/AuthGuard';
import { Trip } from '@/types';
import { showToast } from '@/components/Toast';

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { currentTrip, allTrips, user } = useAppStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const cached = currentTrip?.id === tripId ? currentTrip
      : allTrips.find(t => t.id === tripId) ?? null;
    if (cached) { setTrip(cached); return; }
    getTrip(tripId).then(t => { if (t) setTrip(t); }).catch(() => {});
  }, [tripId, currentTrip, allTrips]);

  const inviteUrl = trip?.inviteCode
    ? `${window.location.origin}/join/${trip.inviteCode}`
    : null;

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      showToast('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!trip) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#607BFF] border-t-transparent animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-[#1D1D1D]">
            Group · {trip.destination}
          </h1>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gray-700" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 text-center px-8 pb-6">
          Invite friends and family here to plan your trip together. You can give
          access to members to edit or view the trip
        </p>

        {/* Members list */}
        <div className="flex-1 px-5 space-y-1">
          {trip.participants.map((p, i) => {
            const isOwner = p.id === trip.ownerId;
            return (
              <div key={p.id} className="flex items-center gap-4 py-4 border-b border-gray-50">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.photoURL ? (
                    <img src={p.photoURL} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-medium text-sm">{(p.initial || p.name?.[0] || 'T').toUpperCase()}</span>
                  )}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1D1D1D] text-sm">{p.name || 'Traveler'}</p>
                  <span className="text-xs text-gray-400">{isOwner ? 'Organiser' : 'Participant'}</span>
                </div>

                {/* Permission badge */}
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-600">{isOwner || i < 2 ? 'Can edit' : 'Can view'}</span>
                  <span className="text-gray-400 text-xs">▾</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="px-5 pb-10 pt-6 space-y-3">
          {/* Invite link */}
          {inviteUrl && (
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
              <span className="text-sm font-medium text-gray-700">
                {copied ? 'Link copied!' : 'Copy invite link'}
              </span>
            </button>
          )}

          {/* Add members */}
          <button
            onClick={handleCopy}
            className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add members
          </button>

          <button className="w-full text-center text-sm text-gray-500 py-2">
            More Options
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
