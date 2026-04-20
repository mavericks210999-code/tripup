'use client';

import { Trash2 } from 'lucide-react';
import { Expense, Participant } from '@/types';

interface ExpenseCardProps {
  expense: Expense;
  participants: Participant[];
  onDelete?: (id: string) => void;
}

export default function ExpenseCard({ expense, participants, onDelete }: ExpenseCardProps) {
  const perPerson = expense.amount / (expense.split.length || 1);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#1D1D1D] text-sm truncate">{expense.title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {expense.date} · Paid by {expense.paidByName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1D1D1D]">
            {expense.currency}{expense.amount.toFixed(2)}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(expense.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400">Split:</span>
        <div className="flex gap-1.5 flex-wrap">
          {expense.split.map((s, i) => {
            const participant = participants.find((p) => p.id === s.participantId);
            if (!participant) return null;
            return (
              <div
                key={i}
                title={`${participant.name}: ${expense.currency}${s.amount.toFixed(2)}`}
                className="w-6 h-6 rounded-full bg-[#607BFF] text-white flex items-center justify-center text-[10px] font-bold"
              >
                {participant.initial}
              </div>
            );
          })}
        </div>
        <span className="text-[10px] text-gray-400 ml-auto">
          {expense.currency}{perPerson.toFixed(2)}/person
        </span>
      </div>
    </div>
  );
}
