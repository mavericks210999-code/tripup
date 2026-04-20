'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { generateItinerary, askMinerva } from '@/services/ai';
import { updateTripItinerary } from '@/services/trips';
import { showToast } from '@/components/Toast';

interface MinervaPanelProps {
  tripId?: string;
  destination?: string;
  tripDays?: number;
  travelStyle?: string;
  startDate?: string;
}

export default function MinervaPanel({ tripId, destination, tripDays, travelStyle, startDate }: MinervaPanelProps) {
  const {
    minervaOpen,
    setMinervaOpen,
    minervaMessages,
    addMinervaMessage,
    minervaLoading,
    setMinervaLoading,
    currentTrip,
    updateItinerary,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [previewDays, setPreviewDays] = useState<{ title: string; activities: { title: string; time?: string; location?: string }[] }[] | null>(null);
  const [pendingItinerary, setPendingItinerary] = useState<Record<number, unknown[]> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [minervaMessages]);

  if (!minervaOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const prompt = customPrompt || input.trim();
    if (!prompt || minervaLoading) return;

    setInput('');
    addMinervaMessage({ role: 'user', content: prompt, timestamp: Date.now() });
    setMinervaLoading(true);

    try {
      // In a trip context, broadly treat planning requests as itinerary generation.
      // Any prompt about visiting, doing, seeing, recommending, or places → generate.
      const isItineraryRequest = destination && (
        /plan|itinerary|generate|schedule|day|trip|visit|go|see|do|best|places|things|recommend|activities|explore|morning|afternoon|evening|weekend|night/i.test(prompt)
      );

      if (isItineraryRequest && destination) {
        const result = await generateItinerary(prompt, {
          destination,
          days: tripDays,
          style: travelStyle,
        });

        // Convert AI days format to our Itinerary format
        // Keys must match calendar dates used by the day selector (e.g. 16, 17, 18)
        const itinerary: Record<number, unknown[]> = {};
        result.days.forEach((day, idx) => {
          let dayNum: number;
          if (startDate) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + idx);
            dayNum = d.getDate();
          } else {
            dayNum = idx + 1;
          }
          itinerary[dayNum] = day.activities.map((act) => ({
            ...act,
            id: act.id || `act-${dayNum}-${Math.random().toString(36).slice(2)}`,
            completed: false,
          }));
        });

        setPendingItinerary(itinerary);
        setPreviewDays(result.days);
        addMinervaMessage({
          role: 'assistant',
          content: `I've created a ${result.days.length}-day itinerary for ${destination}! Review it below and confirm to add it to your trip.`,
          timestamp: Date.now(),
        });
      } else {
        const reply = await askMinerva(prompt, {
          destination,
        });
        addMinervaMessage({ role: 'assistant', content: reply, timestamp: Date.now() });
      }
    } catch (err) {
      showToast('Minerva ran into an issue. Please try again.', 'error');
      addMinervaMessage({
        role: 'assistant',
        content: 'Sorry, I had trouble with that. Please try again!',
        timestamp: Date.now(),
      });
    } finally {
      setMinervaLoading(false);
    }
  };

  const confirmItinerary = async () => {
    if (!pendingItinerary || !currentTrip) return;
    updateItinerary(pendingItinerary as Record<number, import('@/types').Activity[]>);
    if (tripId) {
      await updateTripItinerary(tripId, pendingItinerary as Record<number, import('@/types').Activity[]>)
        .then(() => showToast('Itinerary saved to your trip ✨'))
        .catch(() => showToast('Itinerary updated locally but failed to save', 'error'));
    }
    setPendingItinerary(null);
    setPreviewDays(null);
    addMinervaMessage({
      role: 'assistant',
      content: '✓ Itinerary added to your trip! Check the Itinerary tab.',
      timestamp: Date.now(),
    });
  };

  const days = tripDays || 3;
  const suggestions = destination
    ? [
        `Plan a ${days}-day itinerary for ${destination}`,
        `Best restaurants in ${destination}`,
        `Hidden gems in ${destination}`,
      ]
    : [
        'Plan a 3-day trip to Lisbon',
        'Best time to visit Tokyo',
        'Budget tips for Europe',
      ];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setMinervaOpen(false)}
      />
      <div
        className="fixed z-50 w-80 animate-fade-in-up"
        style={{ bottom: '90px', right: '20px' }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="minerva-gradient p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Minerva</h3>
                <p className="text-white/70 text-xs">AI Travel Assistant</p>
              </div>
            </div>
            <button onClick={() => setMinervaOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-64 overflow-y-auto no-scrollbar p-4 space-y-3 bg-gray-50">
            {minervaMessages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium mb-3">Try asking:</p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="w-full text-left p-3 bg-white rounded-xl text-xs text-gray-700 border border-gray-100 hover:border-[#607BFF] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              minervaMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                      msg.role === 'user'
                        ? 'bg-[#607BFF] text-white'
                        : 'bg-white text-gray-700 shadow-soft'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {minervaLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-3 py-2 shadow-soft">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}

            {pendingItinerary && previewDays && (
              <div className="bg-[#607BFF]/10 rounded-2xl p-3 border border-[#607BFF]/20 space-y-2">
                <p className="text-xs font-semibold text-[#607BFF]">Itinerary preview</p>
                <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                  {previewDays.map((day, i) => (
                    <div key={i} className="bg-white rounded-xl p-2">
                      <p className="text-[10px] font-bold text-[#1D1D1D] mb-1">{day.title || `Day ${i + 1}`}</p>
                      {day.activities.map((act, j) => (
                        <div key={j} className="flex items-start gap-1.5 py-0.5">
                          <span className="text-[10px] text-[#607BFF] font-medium w-10 flex-shrink-0">{act.time || '—'}</span>
                          <div>
                            <p className="text-[10px] font-semibold text-[#1D1D1D] leading-tight">{act.title}</p>
                            {act.location && <p className="text-[9px] text-gray-400 truncate">{act.location}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <button
                  onClick={confirmItinerary}
                  className="w-full py-2 bg-[#607BFF] text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-3 h-3" />
                  Add to my trip
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Minerva..."
                className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-xs outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || minervaLoading}
                className="w-8 h-8 bg-[#607BFF] rounded-full flex items-center justify-center text-white disabled:opacity-40"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
