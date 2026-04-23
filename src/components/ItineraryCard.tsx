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
    <div>
      {/* Day header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-[#1D1D1D]">{month} {dayNumber}</h3>
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

      {/* Timeline */}
      <div className="relative" style={{ paddingLeft: '40px' }}>
        {/* Vertical dashed line */}
        <div
          className="absolute"
          style={{ left: '19px', top: 0, bottom: 0, borderLeft: '2px dashed #D1D5DB' }}
        />

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No activities planned yet</p>
            <button onClick={onAddPlace} className="mt-3 text-xs text-[#607BFF] font-medium">
              + Add a place
            </button>
          </div>
        ) : (
          <div>
            {activities.map((item) => (
              <div key={item.id} className="relative mb-1">
                {/* Timeline dot */}
                <div
                  className={`absolute z-10 flex items-center justify-center rounded-full ${
                    item.completed
                      ? 'bg-[#1D1D1D]'
                      : item.highlight
                      ? 'bg-[#607BFF]'
                      : 'bg-gray-400'
                  }`}
                  style={{ left: '-30px', top: '8px', width: '20px', height: '20px' }}
                >
                  {item.completed ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>

                {/* Time label */}
                <div className="text-sm font-bold text-[#1D1D1D] mb-2">{item.time}</div>

                {/* Activity card */}
                <div
                  className={`bg-white rounded-3xl p-4 shadow-soft mb-1 group ${
                    item.highlight ? 'border-l-4 border-[#607BFF]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-2">
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
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.highlight ? 'bg-[#607BFF]/10 text-[#607BFF]' : 'bg-pink-100 text-pink-500'
                        }`}
                      >
                        {ICON_MAP[item.icon || 'map-pin'] || <MapPin className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  <h3
                    className={`text-xl font-bold leading-tight ${
                      item.completed ? 'text-gray-400 line-through' : 'text-[#1D1D1D]'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <div className="flex items-end justify-between mt-1.5">
                    <div>
                      {item.location && (
                        <p className="text-xs text-gray-500">{item.location}</p>
                      )}
                      {item.autoAdded && (
                        <p className="text-[10px] text-gray-400 mt-1 italic">Auto added from poll</p>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-400 text-right ml-2 flex-shrink-0">{item.notes}</p>
                    )}
                  </div>
                </div>

                {/* Transport note between activities */}
                {item.transportNote && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-3 mb-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                    <span>{item.transportNote}</span>
                    <Car className="w-3 h-3 flex-shrink-0" />
                    {item.transportTime && <span className="text-gray-400">{item.transportTime}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
