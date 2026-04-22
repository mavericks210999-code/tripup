'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Delete, Loader2, ChevronDown, X, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { addExpense } from '@/services/expenses';
import { getTrip } from '@/services/trips';
import { detectCurrency } from '@/lib/currency';
import { Trip } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import { showToast } from '@/components/Toast';

// ─── Exchange rates (approximate, relative to EUR) ────────────────────────────
const RATES_FROM_EUR: Record<string, number> = {
  EUR: 1, GBP: 0.855, USD: 1.08, JPY: 163, INR: 90, AUD: 1.64, CAD: 1.47,
  CHF: 0.97, SGD: 1.45, HKD: 8.43, KRW: 1445, BRL: 5.55, MXN: 18.6,
  NZD: 1.78, THB: 39.5, AED: 3.97, IDR: 17200, VND: 26800, MYR: 5.0,
  PHP: 61, ZAR: 20.2, EGP: 33, TRY: 35, MAD: 10.8, NOK: 11.5,
  SEK: 11.3, DKK: 7.46,
};

function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const fromRate = RATES_FROM_EUR[from] ?? 1;
  const toRate = RATES_FROM_EUR[to] ?? 1;
  return (amount / fromRate) * toRate;
}

function detectHomeCurrency(): string {
  if (typeof window === 'undefined') return 'GBP';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Europe/London' || tz.startsWith('GB')) return 'GBP';
    const locale = navigator.language || 'en-US';
    if (locale.startsWith('en-GB')) return 'GBP';
    if (locale === 'en-US' || locale === 'en-CA') return 'USD';
    if (locale.startsWith('ja')) return 'JPY';
    if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es') || locale.startsWith('it')) return 'EUR';
    if (locale.startsWith('hi') || locale.startsWith('mr')) return 'INR';
  } catch { /* ignore */ }
  return 'USD';
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', GBP: '£', USD: '$', JPY: '¥', INR: '₹', AUD: 'A$', CAD: 'C$',
  CHF: 'CHF', SGD: 'S$', HKD: 'HK$', KRW: '₩', BRL: 'R$', MXN: 'MX$',
  NZD: 'NZ$', THB: '฿', AED: 'د.إ', IDR: 'Rp', VND: '₫', MYR: 'RM',
  PHP: '₱', ZAR: 'R', EGP: 'EGP', TRY: '₺', MAD: 'MAD',
  NOK: 'kr', SEK: 'kr', DKK: 'DKK',
};

// ─── Split Options Sheet ──────────────────────────────────────────────────────

type SplitMode = 'equal' | 'amount' | 'percent';

interface SplitEntry { id: string; name: string; initial: string; photoURL?: string; value: number }

interface SplitSheetProps {
  total: number;
  currency: string;
  participants: { id: string; name: string; initial: string; photoURL?: string }[];
  onConfirm: (split: { participantId: string; amount: number }[]) => void;
  onClose: () => void;
}

function SplitSheet({ total, currency, participants, onConfirm, onClose }: SplitSheetProps) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  const [mode, setMode] = useState<SplitMode>('equal');
  const [entries, setEntries] = useState<SplitEntry[]>(() =>
    participants.map((p) => ({
      id: p.id,
      name: p.name,
      initial: p.initial,
      photoURL: p.photoURL,
      value: +(total / participants.length).toFixed(2),
    }))
  );

  const resetEqual = useCallback(() => {
    const share = +(total / participants.length).toFixed(2);
    setEntries((prev) => prev.map((e) => ({ ...e, value: share })));
  }, [total, participants.length]);

  useEffect(() => {
    if (mode === 'equal') resetEqual();
    if (mode === 'percent')
      setEntries((prev) => prev.map((e) => ({ ...e, value: +(100 / participants.length).toFixed(1) })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const updateValue = (id: string, raw: string) => {
    const num = parseFloat(raw) || 0;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, value: num } : e)));
  };

  const sumValues = entries.reduce((s, e) => s + e.value, 0);

  const remaining =
    mode === 'amount'
      ? +(total - sumValues).toFixed(2)
      : mode === 'percent'
      ? +(100 - sumValues).toFixed(1)
      : 0;

  const isBalanced = mode === 'equal' || Math.abs(remaining) < 0.02;

  const buildSplit = () => {
    if (mode === 'equal') {
      const share = total / participants.length;
      return entries.map((e) => ({ participantId: e.id, amount: +share.toFixed(2) }));
    }
    if (mode === 'percent') {
      return entries.map((e) => ({
        participantId: e.id,
        amount: +((e.value / 100) * total).toFixed(2),
      }));
    }
    return entries.map((e) => ({ participantId: e.id, amount: +e.value.toFixed(2) }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-gray-500 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-[#1D1D1D]">Split options</h2>
          <button onClick={resetEqual} className="text-sm font-semibold text-[#607BFF] flex items-center gap-1 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-5 py-3 flex-shrink-0">
          {(['equal', 'amount', 'percent'] as SplitMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer capitalize ${
                mode === m ? 'bg-[#1D1D1D] text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {m === 'equal' ? 'Equal' : m === 'amount' ? 'Amount' : 'Percent'}
            </button>
          ))}
        </div>

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-3">
          {entries.map((e) => {
            const displayAmount =
              mode === 'equal'
                ? `${sym}${(total / participants.length).toFixed(2)}`
                : mode === 'percent'
                ? `${e.value.toFixed(1)}%`
                : `${sym}${e.value.toFixed(2)}`;

            return (
              <div key={e.id} className="flex items-center gap-3">
                {e.photoURL ? (
                  <img src={e.photoURL} alt={e.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {e.initial}
                  </div>
                )}
                <span className="flex-1 font-medium text-sm text-[#1D1D1D]">{e.name.split(' ')[0]}</span>
                {mode === 'equal' ? (
                  <span className="text-sm font-semibold text-gray-500 underline">{displayAmount}</span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-400">{mode === 'percent' ? '' : sym}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={e.value || ''}
                      onChange={(ev) => updateValue(e.id, ev.target.value)}
                      className="w-20 text-right text-sm font-semibold text-[#1D1D1D] underline bg-transparent outline-none border-b border-gray-300 focus:border-[#607BFF]"
                    />
                    {mode === 'percent' && <span className="text-sm text-gray-400">%</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-gray-100 flex-shrink-0">
          <p className={`text-center text-sm font-medium mb-3 ${Math.abs(remaining) > 0.02 ? 'text-red-500' : 'text-gray-400'}`}>
            {mode !== 'equal' && (
              remaining === 0 ? `${sym}0.00 left` :
              remaining > 0 ? `${sym}${Math.abs(remaining).toFixed(2)} left` :
              `${sym}${Math.abs(remaining).toFixed(2)} over`
            )}
            {mode === 'equal' && `Split equally · ${sym}${(total / participants.length).toFixed(2)} each`}
          </p>
          <button
            disabled={!isBalanced}
            onClick={() => onConfirm(buildSplit())}
            className="w-full bg-[#1D1D1D] text-white py-4 rounded-2xl font-semibold disabled:opacity-40 cursor-pointer hover:bg-gray-800 transition-colors"
          >
            Split with group
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddExpensePage() {
  const params  = useParams();
  const tripId  = params.id as string;
  const router  = useRouter();
  const { currentTrip, user } = useAppStore();

  const [trip, setTrip]             = useState<Trip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [amount, setAmount]         = useState('0');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('Food');
  const [paidById, setPaidById]     = useState('');
  const [split, setSplit]           = useState<{ participantId: string; amount: number }[]>([]);
  const [splitSheetOpen, setSplitSheetOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const homeCurrency                = detectHomeCurrency();

  useEffect(() => {
    if (currentTrip?.id === tripId) {
      setTrip(currentTrip);
      setPaidById((prev) => prev || user?.uid || currentTrip.participants[0]?.id || '');
      return;
    }
    setLoadingTrip(true);
    getTrip(tripId)
      .then((t) => {
        if (t) {
          setTrip(t);
          setPaidById(user?.uid || t.participants[0]?.id || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTrip(false));
  }, [tripId, currentTrip, user?.uid]);

  const currency = trip ? detectCurrency(trip.destination) : { symbol: '€', code: 'EUR' };
  const numAmount = parseFloat(amount) || 0;

  // Default equal split whenever participants or amount changes
  useEffect(() => {
    if (!trip) return;
    const share = numAmount / trip.participants.length;
    setSplit(trip.participants.map((p) => ({ participantId: p.id, amount: +share.toFixed(2) })));
  }, [trip, numAmount]);

  const addDigit = (d: string) => {
    if (d === '.' && amount.includes('.')) return;
    if (amount.includes('.') && amount.split('.')[1]?.length >= 2) return;
    setAmount((prev) => (prev === '0' && d !== '.' ? d : prev + d));
  };

  const clearDigit = () =>
    setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));

  const handleSave = async () => {
    if (!numAmount || !description.trim() || !trip) return;
    setSaving(true);
    setError('');
    const paidByParticipant = trip.participants.find((p) => p.id === paidById) ?? trip.participants[0];
    const effectiveSplit = split.length > 0 ? split : trip.participants.map(p => ({
      participantId: p.id,
      amount: +(numAmount / trip.participants.length).toFixed(2),
    }));
    try {
      await addExpense({
        tripId,
        title:        description.trim(),
        amount:       numAmount,
        currency:     currency.code,
        paidBy:       paidByParticipant.id,
        paidByName:   paidByParticipant.name,
        date:         new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        split:        effectiveSplit,
      });
      showToast('Expense added');
      router.back();
    } catch (err) {
      console.error('Failed to save expense:', err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Failed to save expense', 'error');
      setError(msg || 'Failed to save. Please try again.');
      setSaving(false);
    }
  };

  const CATEGORIES = ['Food', 'Transport', 'Attraction', 'Stay', 'Shopping', 'Other'];
  const CALC_ROWS = [['1','2','3'], ['4','5','6'], ['7','8','9'], ['.','0','⌫']];

  // Converted amount in home currency
  const convertedAmount = homeCurrency !== currency.code && numAmount > 0
    ? convertCurrency(numAmount, currency.code, homeCurrency)
    : null;
  const homeSym = CURRENCY_SYMBOLS[homeCurrency] ?? homeCurrency;

  // Recent itinerary spots for description suggestions
  const recentSpots = trip
    ? Object.values(trip.itinerary || {}).flat().slice(0, 4).map((a) => (a as { title?: string }).title).filter(Boolean)
    : [];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F5F3F2]">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#F5F3F2]/95 backdrop-blur-sm px-5 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold text-[#1D1D1D]">Add Expense</h1>
            {trip && <p className="text-xs text-gray-400">{trip.destination}</p>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !description.trim() || numAmount === 0}
            className="text-sm font-semibold text-[#607BFF] disabled:opacity-40 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>

        {loadingTrip ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#607BFF] animate-spin" />
          </div>
        ) : !trip ? (
          <div className="text-center py-20 px-5"><p className="text-gray-500">Trip not found.</p></div>
        ) : (
          <div className="pb-10">
            {/* Amount display */}
            <div className="px-5 py-6 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl text-gray-400 font-light">{currency.symbol}</span>
                <span className="text-6xl font-semibold text-[#1D1D1D] tabular-nums">{amount}</span>
              </div>
              {convertedAmount !== null && (
                <p className="text-sm text-gray-400 mt-1">
                  ≈ {homeSym}{convertedAmount.toFixed(2)} {homeCurrency}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{currency.code}</p>
            </div>

            {/* Description + suggestions */}
            <div className="px-5 mb-4">
              <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description"
                  className="w-full px-4 py-4 text-base text-[#1D1D1D] placeholder-gray-400 outline-none font-medium"
                />
                {recentSpots.length > 0 && (
                  <div className="border-t border-gray-100 px-4 pb-3 pt-2">
                    <p className="text-[10px] text-gray-400 font-medium mb-2">Recent spots from itinerary</p>
                    {recentSpots.map((spot, i) => (
                      <button
                        key={i}
                        onClick={() => setDescription(spot as string)}
                        className="flex items-center gap-2 py-1.5 w-full text-left cursor-pointer"
                      >
                        <span className="text-gray-400 text-sm">🏛</span>
                        <span className="text-sm text-gray-600">{spot}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category pills */}
            <div className="px-5 mb-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      category === c
                        ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid by + Split */}
            <div className="px-5 mb-4 grid grid-cols-2 gap-3">
              {/* Paid by */}
              <div className="bg-white rounded-2xl p-3 shadow-soft">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Paid by</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {trip.participants.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaidById(p.id)}
                      className="flex-shrink-0 flex flex-col items-center gap-1"
                    >
                      <div className={`w-9 h-9 rounded-full border-2 p-0.5 transition-colors ${paidById === p.id ? 'border-[#607BFF]' : 'border-transparent'}`}>
                        {p.photoURL ? (
                          <img src={p.photoURL} alt={p.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-[#607BFF] text-white flex items-center justify-center font-bold text-xs">
                            {p.initial}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] ${paidById === p.id ? 'text-[#607BFF] font-semibold' : 'text-gray-400'}`}>
                        {p.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Split summary */}
              <button
                onClick={() => numAmount > 0 && setSplitSheetOpen(true)}
                className={`bg-white rounded-2xl p-3 shadow-soft text-left cursor-pointer hover:shadow-card transition-shadow ${numAmount === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Split with</p>
                <p className="text-sm font-bold text-[#1D1D1D]">everyone</p>
                <p className="text-xs text-gray-400">
                  {currency.symbol}{numAmount > 0 ? (numAmount / trip.participants.length).toFixed(2) : '0.00'} each
                </p>
                <p className="text-[10px] text-[#607BFF] font-semibold mt-1 flex items-center gap-0.5">
                  Edit split <ChevronDown className="w-3 h-3" />
                </p>
              </button>
            </div>

            {error && (
              <div className="px-5 mb-4">
                <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
              </div>
            )}

            {/* Calculator */}
            <div className="px-5">
              <div className="bg-white rounded-3xl p-4 shadow-soft">
                {CALC_ROWS.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-2 mb-2 last:mb-0">
                    {row.map((key) => (
                      <button
                        key={key}
                        onClick={() => key === '⌫' ? clearDigit() : addDigit(key)}
                        className="bg-gray-50 rounded-xl py-4 text-2xl font-medium text-[#1D1D1D] flex items-center justify-center active:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {key === '⌫' ? <Delete className="w-5 h-5 text-gray-400" /> : key}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {splitSheetOpen && trip && (
        <SplitSheet
          total={numAmount}
          currency={currency.code}
          participants={trip.participants}
          onConfirm={(s) => { setSplit(s); setSplitSheetOpen(false); }}
          onClose={() => setSplitSheetOpen(false)}
        />
      )}
    </AuthGuard>
  );
}
