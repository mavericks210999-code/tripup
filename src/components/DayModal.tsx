'use client';

import { useState, useEffect } from 'react';
import { MapPin, Landmark, Utensils, Hotel, Car, Camera, ShoppingBag, Clock, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Activity } from '@/types';
import { addActivityToDay } from '@/services/trips';
import { showToast } from '@/components/Toast';

const CATEGORIES = [
  { key: 'Sightseeing',  icon: <Landmark className="w-4 h-4" />,    emoji: '🏛️' },
  { key: 'Food',         icon: <Utensils className="w-4 h-4" />,    emoji: '🍜' },
  { key: 'Hotel',        icon: <Hotel className="w-4 h-4" />,       emoji: '🏨' },
  { key: 'Transport',    icon: <Car className="w-4 h-4" />,         emoji: '🚗' },
  { key: 'Activity',     icon: <Camera className="w-4 h-4" />,      emoji: '📸' },
  { key: 'Shopping',     icon: <ShoppingBag className="w-4 h-4" />, emoji: '🛍️' },
  { key: 'Other',        icon: <MapPin className="w-4 h-4" />,      emoji: '📍' },
];

const CATEGORY_TO_ICON: Record<string, string> = {
  Sightseeing: 'landmark',
  Food: 'utensils',
  Hotel: 'hotel',
  Transport: 'car',
  Activity: 'camera',
  Shopping: 'shopping-bag',
  Other: 'map-pin',
};

interface DayModalProps {
  tripId: string;
  days: { number: number; label: string; month: string }[];
}

export default function DayModal({ tripId, days }: DayModalProps) {
  const {
    dayModalOpen,
    setDayModalOpen,
    tempActivity,
    setTempActivity,
    currentTrip,
    addActivity,
    selectedDay,
  } = useAppStore();

  // Form state — pre-filled from tempActivity (e.g. when adding from Explore tab)
  const [title, setTitle]       = useState('');
  const [time, setTime]         = useState('09:00');
  const [category, setCategory] = useState('Sightseeing');
  const [location, setLocation] = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [step, setStep]         = useState<'form' | 'day'>('form');

  // Sync form when modal opens / tempActivity changes
  useEffect(() => {
    if (dayModalOpen) {
      setTitle(tempActivity?.title || '');
      setTime('09:00');
      setCategory(tempActivity?.category || 'Sightseeing');
      setLocation(tempActivity?.location || '');
      setNotes(tempActivity?.notes || '');
      // If tempActivity already has a title (e.g. from Explore), skip straight
      // to day selection only when days are available
      setStep(tempActivity?.title ? 'day' : 'form');
      setSaving(false);
    }
  }, [dayModalOpen, tempActivity]);

  const handleClose = () => {
    setDayModalOpen(false);
    setTempActivity(null);
  };

  const handleAdd = async (dayNumber: number) => {
    if (!currentTrip || !title.trim()) return;
    setSaving(true);

    const activity: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time,
      title: title.trim(),
      category,
      location: location.trim(),
      notes: notes.trim() || undefined,
      icon: CATEGORY_TO_ICON[category] ?? 'map-pin',
      completed: false,
    };

    // Optimistic update first
    addActivity(dayNumber, activity);

    // Persist to DB (pass snapshot BEFORE optimistic update to avoid double-add)
    const itinerary = currentTrip.itinerary || {};
    await addActivityToDay(tripId, dayNumber, activity, itinerary)
      .then(() => showToast('Activity added'))
      .catch(() => showToast('Failed to save activity', 'error'));

    setSaving(false);
    setTempActivity(null);
    setDayModalOpen(false);
  };

  if (!dayModalOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="font-bold text-lg text-[#1D1D1D]">
            {step === 'form' ? 'Add Activity' : 'Choose Day'}
          </h3>
          <button onClick={handleClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── Step 1: Form ────────────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="px-5 pb-8 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Activity name *
              </label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Visit Eiffel Tower"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-[#1D1D1D] outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-[#1D1D1D] outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all text-xs font-medium ${
                      category === c.key
                        ? 'border-[#607BFF] bg-[#607BFF]/5 text-[#607BFF]'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-base">{c.emoji}</span>
                    <span className="text-[10px]">{c.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location <span className="font-normal normal-case">(optional)</span></span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Champ de Mars, Paris"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-[#1D1D1D] outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Notes <span className="font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes..."
                rows={2}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-[#1D1D1D] outline-none border-2 border-transparent focus:border-[#607BFF] transition-colors resize-none"
              />
            </div>

            <button
              disabled={!title.trim()}
              onClick={() => {
                if (days.length === 1) {
                  handleAdd(days[0].number);
                } else if (selectedDay && days.some(d => d.number === selectedDay)) {
                  handleAdd(selectedDay);
                } else {
                  setStep('day');
                }
              }}
              className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold disabled:opacity-40 hover:bg-gray-800 transition-colors"
            >
              {days.length <= 1 ? 'Add Activity' : 'Choose Day →'}
            </button>
          </div>
        )}

        {/* ── Step 2: Day picker ───────────────────────────────────────────── */}
        {step === 'day' && (
          <div className="px-5 pb-8">
            {/* Activity summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <span className="text-lg">{CATEGORIES.find(c => c.key === category)?.emoji ?? '📍'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#1D1D1D] truncate">{title}</p>
                <p className="text-xs text-gray-400">{time} · {category}{location ? ` · ${location}` : ''}</p>
              </div>
              <button onClick={() => setStep('form')} className="text-xs text-[#607BFF] font-medium flex-shrink-0">Edit</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {days.map((day) => (
                <button
                  key={day.number}
                  onClick={() => handleAdd(day.number)}
                  disabled={saving}
                  className="w-full p-4 bg-gray-50 rounded-xl text-left hover:bg-[#607BFF]/5 hover:border-[#607BFF] border-2 border-transparent transition-all flex items-center justify-between disabled:opacity-60"
                >
                  <div>
                    <span className="font-semibold text-[#1D1D1D]">{day.month} {day.number}</span>
                    <span className="text-gray-400 text-sm ml-2">{day.label}</span>
                  </div>
                  <span className="text-[#607BFF] text-sm">+ Add</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
