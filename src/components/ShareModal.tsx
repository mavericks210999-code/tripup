'use client';

import { useState } from 'react';
import { X, Copy, Check, Share2, Link } from 'lucide-react';
import { Trip } from '@/types';

interface ShareModalProps {
  trip: Trip;
  onClose: () => void;
}

export default function ShareModal({ trip, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${trip.inviteCode}`
    : `/join/${trip.inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Join my trip to ${trip.destination}!`,
        text: `I'm planning a trip to ${trip.destination} (${trip.dates}). Join me!`,
        url: inviteLink,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-6 animate-backdrop"
        onClick={onClose}
      >
      <div
        className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#607BFF]/10 rounded-2xl flex items-center justify-center">
              <Share2 className="w-5 h-5 text-[#607BFF]" />
            </div>
            <div>
              <h3 className="font-bold text-[#222222]">Share trip</h3>
              <p className="text-xs text-gray-500">{trip.destination}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Invite link box */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Invite link</p>
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-[#222222] truncate flex-1 font-mono">{inviteLink}</p>
          </div>
        </div>

        {/* Invite code */}
        {trip.inviteCode && (
          <div className="flex items-center justify-between bg-[#607BFF]/5 rounded-2xl p-4 mb-5">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Invite code</p>
              <p className="text-2xl font-bold text-[#607BFF] tracking-widest mt-0.5">{trip.inviteCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Share this code</p>
              <p className="text-xs text-gray-400">on TripUp app</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
              copied
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-gray-200 text-[#222222] hover:border-gray-300'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            onClick={handleNativeShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#607BFF] text-white text-sm font-medium hover:bg-[#4F6AE8] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
