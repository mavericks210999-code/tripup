'use client';

import { useState } from 'react';
import { Plus, Check, MapPin, Landmark, Utensils, Hotel, Car, Camera, ShoppingBag, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { Activity } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { updateActivity, deleteActivity } from '@/services/trips';

const ICON_MAP: Record<string, React.ReactNode> = {
  landmark: <Landmark className="w-4 h-4" />,
  utensils: <Utensils className="w-4 h-4" />,
  hotel: <Hotel className="w-4 h-4" />,
  car: <Car className="w-4 h-4" />,
  camera: <Camera className="w-4 h-4" />,
  'shopping-bag': <ShoppingBag className="w-4 h-4" />,
  'map-pin': <MapPin className="w-4 h-4" />,
  moon: <Moon className="w-4 h-4" />,
};

const ICON_COLORS: Record<string, string> = {
  landmark: 'bg-pink-100 text-pink-500',
  camera: 'bg-pink-100 text-pink-500',
  utensils: 'bg-blue-100 text-blue-500',
  hotel: 'bg-amber-100 text-amber-600',
  car: 'bg-slate-100 text-slate-500',
  'shopping-bag': 'bg-teal-100 text-teal-600',
  'map-pin': 'bg-green-100 text-green-500',
  moon: 'bg-purple-100 text-purple-500',
};

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: 'bg-pink-100 text-pink-500',
  food: 'bg-blue-100 text-blue-500',
  dining: 'bg-blue-100 text-blue-500',
  restaurant: 'bg-blue-100 text-blue-500',
  nature: 'bg-green-100 text-green-500',
  outdoors: 'bg-green-100 text-green-500',
  nightlife: 'bg-purple-100 text-purple-500',
  bar: 'bg-purple-100 text-purple-500',
  club: 'bg-purple-100 text-purple-500',
  hotel: 'bg-amber-100 text-amber-600',
  accommodation: 'bg-amber-100 text-amber-600',
  relaxation: 'bg-amber-100 text-amber-600',
  shopping: 'bg-teal-100 text-teal-600',
  transport: 'bg-slate-100 text-slate-500',
};

function getIconColors(icon?: string, category?: string): string {
  if (icon && ICON_COLORS[icon]) return ICON_COLORS[icon];
  const catKey = category?.toLowerCase() ?? '';
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (catKey.includes(key)) return CATEGORY_COLORS[key];
  }
  return 'bg-gray-100 text-gray-500';
}

interface ItineraryCardProps {
  dayNumber: number;
  dayLabel: string;
  month: string;
  activities: Activity[];
  tripId: string;
  isToday?: boolean;
  onAddPlace: () => void;
}

export default function ItineraryCard({
  dayNumber,
  month,
  activities,
  tripId,
  isToday,
  onAddPlace,
}: ItineraryCardProps) {
  const { currentTrip, updateActivity: storeUpdateActivity, deleteActivity: storeDeleteActivity } = useAppStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleComplete = async (activity: Activity) => {
    const updated = { ...activity, completed: !activity.completed };
    storeUpdateActivity(dayNumber, updated);
    if (currentTrip) {
      await updateActivity(tripId, dayNumber, updated, currentTrip.itinerary || {}).catch(() => {});
    }
  };

  const handleDelete = async (activityId: string) => {
    setDeletingId(activityId);
    storeDeleteActivity(dayNumber, activityId);
    if (currentTrip) {
      await deleteActivity(tripId, dayNumber, activityId, currentTrip.itinerary || {}).catch(() => {});
    }
    setDeletingId(null);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-soft">
      {/* Day header — reduced from text-lg to text-sm */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm text-gray-500 tracking-wide">{month} {dayNumber}</h3>
          {isToday && (
            <span className="px-3 py-1 bg-[#607BFF] text-white text-xs font-semibold rounded-full">
              Ongoing
            </span>
          )}
        </div>
        <button
          onClick={onAddPlace}
          className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 flex items-center gap-1 hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mb-5" />

      {activities.length === 0 ? (
        <div className="text-center py-6">
          <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No activities planned yet</p>
          <button onClick={onAddPlace} className="mt-3 text-xs text-[#607BFF] font-medium">
            + Add a place
          </button>
        </div>
      ) : (
        <div className="relative pl-10">
          {/* Dashed vertical line */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-200"
            style={{ left: '19px' }}
          />

          {activities.map((item) => {
            const isHighlight = !!item.highlight && !item.completed;
            const iconColors = getIconColors(item.icon, item.category);
            const isExpanded = expandedIds.has(item.id);
            const bodyText = [item.location, item.notes].filter(Boolean).join(' · ');
            const hasBody = !!bodyText;

            return (
              <div key={item.id} className="relative">
                {/* Timeline dot */}
                <div
                  className={`absolute z-10 flex items-center justify-center rounded-full ${
                    item.completed
                      ? 'bg-[#1D1D1D]'
                      : isHighlight
                      ? 'bg-[#607BFF]'
                      : 'bg-gray-400'
                  }`}
                  style={{
                    left: isHighlight ? '-31px' : '-30px',
                    top: '6px',
                    width: isHighlight ? '22px' : '20px',
                    height: isHighlight ? '22px' : '20px',
                  }}
                >
                  {item.completed ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>

                {/* Time */}
                <p className="text-xs font-semibold text-gray-400 mb-1.5 tracking-wide">{item.time}</p>

                {/* Inner activity card */}
                <div
                  className={`rounded-2xl p-3.5 mb-1 relative overflow-hidden group cursor-pointer ${
                    isHighlight
                      ? 'bg-white border border-[#607BFF]/40'
                      : 'bg-gray-50'
                  }`}
                  onClick={() => hasBody && toggleExpand(item.id)}
                >
                  {/* Blue left accent stripe for highlighted */}
                  {isHighlight && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#607BFF] rounded-l-2xl" />
                  )}

                  {/* Top row: category label + hover actions + icon — all on same line */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {/* Hover actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleComplete(item); }}
                          className="text-[10px] text-gray-400 hover:text-[#607BFF]"
                        >
                          {item.completed ? 'Undo' : 'Done'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          disabled={deletingId === item.id}
                          className="text-[10px] text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      {/* Color-coded icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconColors}`}>
                        {ICON_MAP[item.icon || 'map-pin'] || <MapPin className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-[15px] font-semibold leading-snug mb-2 ${
                      item.completed ? 'text-gray-400 line-through' : 'text-[#1D1D1D]'
                    }`}
                  >
                    {item.title}
                  </h3>

                  {/* Body text — 2 lines max, expands on click */}
                  {hasBody && (
                    <div>
                      <p className={`text-[11px] text-gray-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {bodyText}
                      </p>
                      {hasBody && (
                        <div className="flex justify-end mt-1">
                          {isExpanded
                            ? <ChevronUp className="w-3 h-3 text-gray-300" />
                            : <ChevronDown className="w-3 h-3 text-gray-300" />
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-added label */}
                  {item.autoAdded && (
                    <p className="text-[10px] text-gray-400 text-center mt-3 italic">
                      Auto added from poll
                    </p>
                  )}
                </div>

                {/* Transport note between activities */}
                {item.transportNote && (
                  <div className="relative flex items-center gap-2 py-3 text-xs text-gray-500">
                    <div
                      className="absolute z-10 w-2.5 h-2.5 bg-gray-400 rounded-full"
                      style={{ left: '-25px' }}
                    />
                    <span className="truncate">{item.transportNote}</span>
                    {item.transportTime && (
                      <>
                        <span className="flex-shrink-0">▾</span>
                        <Car className="w-3 h-3 flex-shrink-0" />
                        <span className="flex-shrink-0">{item.transportTime}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
