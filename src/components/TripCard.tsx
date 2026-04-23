'use client';

import { useState } from 'react';
import { MoreVertical, Trash2, Share2, Edit3, X } from 'lucide-react';
import { Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  onDelete?: (tripId: string) => void;
  onShare?: (trip: Trip) => void;
  onEdit?: (trip: Trip) => void;
}

export default function TripCard({ trip, onPress, onDelete, onShare, onEdit }: TripCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(trip.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
      setMenuOpen(false);
    }
  };

  const coverSrc = trip.coverImage ||
    `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80`;

  return (
    <div className="relative">
      <div
        onClick={onPress}
        className="relative h-52 rounded-3xl overflow-hidden shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.06)_0px_4px_12px,rgba(0,0,0,0.1)_0px_8px_20px] cursor-pointer group"
      >
        <img
          src={coverSrc}
          alt={trip.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Dates pill */}
        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
          {trip.dates}
        </div>

        {/* 3-dot menu button */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
          className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Card bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-2xl font-bold text-white">{trip.destination}</h3>
          <div className="flex items-center justify-between mt-2">
            <div className="flex -space-x-2">
              {trip.participants.slice(0, 4).map((p, i) =>
                p.photoURL ? (
                  <img
                    key={i}
                    src={p.photoURL}
                    alt={p.name}
                    className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white bg-[#607BFF] text-white text-[10px] flex items-center justify-center font-bold"
                  >
                    {p.initial}
                  </div>
                )
              )}
              {trip.participants.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-black/40 text-white text-[10px] flex items-center justify-center font-bold">
                  +{trip.participants.length - 4}
                </div>
              )}
            </div>
            <span className="text-white/70 text-xs">
              {trip.participants.length} traveler{trip.participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Context menu overlay */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)} />
          <div className="absolute z-50 bg-white rounded-2xl shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.08)_0px_8px_24px] overflow-hidden w-48"
            style={{ top: '48px', right: '8px' }}
          >
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#222222]">{trip.destination}</span>
              <button onClick={() => setMenuOpen(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(trip); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#222222] hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-gray-500" />
                Edit trip
              </button>
            )}
            {onShare && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare(trip); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#222222] hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4 text-gray-500" />
                Share invite
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete trip
              </button>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 animate-backdrop" onClick={() => setConfirmDelete(false)} />
          <div className="fixed z-[60] bg-white rounded-3xl p-6 shadow-2xl w-[calc(100%-48px)] max-w-sm"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-[#222222] text-center mb-2">Delete trip?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              "{trip.destination}" and all its activities and expenses will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
