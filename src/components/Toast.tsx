'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// ─── Global event bus (avoids React context overhead) ────────────────────────

type Listener = (toast: ToastMessage) => void;
const listeners: Set<Listener> = new Set();
let nextId = 1;

export function showToast(message: string, type: ToastType = 'success') {
  const toast: ToastMessage = { id: nextId++, message, type };
  listeners.forEach((fn) => fn(toast));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  return { toast: showToast };
}

// ─── Toast item ───────────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Animate out then remove
    const t2 = setTimeout(() => setVisible(false), 2800);
    const t3 = setTimeout(() => onRemove(toast.id), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [toast.id, onRemove]);

  const icon =
    toast.type === 'success' ? <Check className="w-4 h-4" /> :
    toast.type === 'error'   ? <AlertCircle className="w-4 h-4" /> :
                               <Info className="w-4 h-4" />;

  const colors =
    toast.type === 'success' ? 'bg-[#1D1D1D] text-white' :
    toast.type === 'error'   ? 'bg-red-500 text-white' :
                               'bg-[#607BFF] text-white';

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium max-w-xs transition-all duration-300 ${colors} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {icon}
      <span>{toast.message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="ml-1 opacity-70 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Container — mount once in layout or per-page ─────────────────────────────

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler: Listener = (toast) => setToasts((prev) => [...prev, toast]);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
