'use client';

import { useState } from 'react';
import { Plus, Check, MapPin, Landmark, Utensils, Hotel, Car, Camera, ShoppingBag } from 'lucide-react';
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
};

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
      {/* Day header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-[#1D1D1D]">{month} {dayNumber}</h3>
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
        /* Timeline container — left padding makes room for dots + line */
        <div className="relative pl-10">
          {/* Dashed vertical line */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-200"
            style={{ left: '19px' }}
          />

          {activities.map((item) => {
            const isHighlight = !!item.highlight && !item.completed;

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
                <p className="text-sm font-bold text-[#1D1D1D] mb-2">{item.time}</p>

                {/* Inner activity card */}
                <div
                  className={`rounded-2xl p-4 mb-1 relative overflow-hidden group ${
                    isHighlight
                      ? 'bg-white border border-[#607BFF]/40'
                      : 'bg-gray-50'
                  }`}
                >
                  {/* Blue left accent stripe for highlighted */}
                  {isHighlight && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#607BFF] rounded-l-2xl" />
                  )}

                  {/* Category row */}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium leading-none">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {/* Hover actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={() => toggleComplete(item)}
                          className="text-[10px] text-gray-400 hover:text-[#607BFF]"
                        >
                          {item.completed ? 'Undo' : 'Done'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-[10px] text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isHighlight ? 'bg-gray-100 text-gray-500' : 'bg-pink-100 text-pink-500'
                        }`}
                      >
                        {ICON_MAP[item.icon || 'map-pin'] || <MapPin className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-xl font-bold leading-tight mb-1.5 ${
                      item.completed ? 'text-gray-400 line-through' : 'text-[#1D1D1D]'
                    }`}
                  >
                    {item.title}
                  </h3>

                  {/* Location + notes row */}
                  <div className="flex items-end justify-between gap-2 min-w-0">
                    {item.location && (
                      <p className="text-xs text-gray-500 leading-relaxed flex-1 min-w-0 truncate">
                        {item.location}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {item.notes}
                      </p>
                    )}
                  </div>

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
                    {/* Small dot on the timeline */}
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
