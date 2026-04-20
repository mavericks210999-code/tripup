'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Save, Loader2, MapPin, Calendar, Image as ImageIcon, Palette } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getTrip, updateTrip } from '@/services/trips';
import { showToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';
import { Trip } from '@/types';

const TRAVEL_STYLES = ['Cultural', 'Adventure', 'Relaxed', 'Luxury', 'Budget', 'Foodie', 'Nature', 'Urban'];

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  const { currentTrip, setCurrentTrip, setAllTrips, allTrips } = useAppStore();

  const [trip, setTrip] = useState<Trip | null>(currentTrip);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [style, setStyle] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    const load = async () => {
      let t = currentTrip;
      if (!t || t.id !== tripId) {
        t = await getTrip(tripId);
      }
      if (t) {
        setTrip(t);
        setDestination(t.destination);
        setStartDate(t.startDate || '');
        setEndDate(t.endDate || '');
        setStyle(t.preferences?.style || []);
        setCoverImage(t.coverImage || '');
      }
    };
    load();
  }, [tripId, currentTrip]);

  const refreshCoverImage = async () => {
    if (!destination.trim()) return;
    setLoadingImage(true);
    try {
      const res = await fetch(`/api/destination-image?destination=${encodeURIComponent(destination)}`);
      if (res.ok) {
        const data = await res.json();
        setCoverImage(data.url);
      }
    } catch { /* ignore */ }
    setLoadingImage(false);
  };

  const handleSave = async () => {
    if (!destination.trim() || !startDate || !endDate) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr =
        start.getDate() === end.getDate() && start.getMonth() === end.getMonth()
          ? `${start.getDate()} ${monthNames[start.getMonth()]}`
          : `${start.getDate()}–${end.getDate()} ${monthNames[start.getMonth()]}`;

      await updateTrip(tripId, {
        destination,
        dates: dateStr,
        startDate,
        endDate,
        coverImage: coverImage || undefined,
        preferences: { ...trip?.preferences, style },
      });

      // Update store
      const updated: Trip = {
        ...trip!,
        destination,
        dates: dateStr,
        startDate,
        endDate,
        coverImage: coverImage || undefined,
        preferences: { ...trip?.preferences, style },
      };
      setCurrentTrip(updated);
      setAllTrips(allTrips.map((t) => (t.id === tripId ? updated : t)));

      showToast('Trip updated!', 'success');
      router.back();
    } catch {
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2]">
        {/* Cover image preview */}
        <div className="relative h-56 bg-gray-200">
          {coverImage ? (
            <img src={coverImage} alt={destination} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Nav bar overlay */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-base">Edit Trip</h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-white text-[#222222] px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>

          {/* Refresh image button */}
          <button
            onClick={refreshCoverImage}
            disabled={loadingImage || !destination.trim()}
            className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
            New photo
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-6 space-y-5">
          {/* Destination */}
          <div className="bg-white rounded-2xl p-4 shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px]">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <MapPin className="w-4 h-4" />
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Where are you going?"
              className="w-full text-[#222222] text-base font-medium outline-none placeholder:text-gray-300"
            />
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl p-4 shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px]">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <Calendar className="w-4 h-4" />
              Dates
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">From</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-[#222222] text-sm font-medium outline-none"
                />
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">To</p>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-[#222222] text-sm font-medium outline-none"
                />
              </div>
            </div>
          </div>

          {/* Travel style */}
          <div className="bg-white rounded-2xl p-4 shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px]">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <Palette className="w-4 h-4" />
              Travel style
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    style.includes(s)
                      ? 'bg-[#607BFF] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !destination.trim() || !startDate || !endDate}
            className="w-full py-4 bg-[#222222] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save changes
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
