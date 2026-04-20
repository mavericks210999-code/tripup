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
  dayLabel,
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
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm font-medium">
            {month} {dayNumber}
          </span>
          <span className="text-gray-400 text-xs">{dayLabel}</span>
          {isToday && (
            <span className="px-3 py-1 bg-[#607BFF] text-white text-xs font-semibold rounded-full">
              Today
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

      {activities.length === 0 ? (
        <div className="text-center py-6">
          <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No activities planned yet</p>
          <button
            onClick={onAddPlace}
            className="mt-3 text-xs text-[#607BFF] font-medium"
          >
            + Add a place
          </button>
        </div>
      ) : (
        <div className="relative" style={{ paddingLeft: '40px' }}>
          {/* Timeline line */}
          <div
            className="absolute"
            style={{
              left: '19px',
              top: 0,
              bottom: 0,
              borderLeft: '2px dashed #D1D5DB',
            }}
          />

          <div className="space-y-6">
            {activities.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline dot */}
                <div
                  className={`absolute flex items-center justify-center rounded-full z-10 ${
                    item.completed
                      ? 'bg-[#1D1D1D]'
                      : item.highlight
                      ? 'bg-[#607BFF]'
                      : 'bg-gray-300'
                  }`}
                  style={{ left: '-30px', top: '4px', width: '20px', height: '20px' }}
                >
                  {item.completed ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : item.highlight ? (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  ) : (
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  )}
                </div>

                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-semibold text-gray-900">{item.time}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleComplete(item)}
                      className="text-xs text-gray-400 hover:text-[#607BFF]"
                    >
                      {item.completed ? 'Undo' : 'Done'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.highlight ? 'bg-[#607BFF]/10 text-[#607BFF]' : 'bg-pink-100 text-pink-500'
                    }`}
                  >
                    {ICON_MAP[item.icon || 'map-pin'] || <MapPin className="w-4 h-4" />}
                  </div>
                </div>

                <span className="text-[10px] uppercase text-gray-400 tracking-wide">
                  {item.category}
                </span>
                <h3
                  className={`font-bold text-base mt-0.5 ${
                    item.completed ? 'text-gray-400 line-through' : 'text-[#1D1D1D]'
                  }`}
                >
                  {item.title}
                </h3>
                {item.location && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.location}</p>
                )}
                {item.notes && (
                  <p className="text-[10px] text-gray-400 mt-1">{item.notes}</p>
                )}
                {item.autoAdded && (
                  <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                    Auto added from poll
                  </p>
                )}

                {item.transportNote && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-2 mt-1">
                    <Car className="w-3 h-3" />
                    <span>{item.transportNote}</span>
                    {item.transportTime && <span className="text-gray-400">· {item.transportTime}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
