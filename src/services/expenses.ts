import { supabase } from '@/lib/supabase';
import { Expense, Balance, Participant } from '@/types';
import type { ExpenseRow } from '@/types/supabase';

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amount: row.amount,
    currency: row.currency,
    paidBy: row.paid_by,
    paidByName: row.paid_by_name,
    date: row.date,
    split: row.split ?? [],
    createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      trip_id:      expense.tripId,
      title:        expense.title,
      amount:       expense.amount,
      currency:     expense.currency,
      paid_by:      expense.paidBy,
      paid_by_name: expense.paidByName,
      date:         expense.date,
      split:        expense.split,
    })
    .select('id')
    .single<Pick<ExpenseRow, 'id'>>();

  if (error) throw error;
  return data!.id;
}

export async function getTripExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .returns<ExpenseRow[]>();

  if (error) throw error;
  return (data ?? []).map(rowToExpense);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

export async function updateExpense(
  expenseId: string,
  updates: Partial<Pick<Expense, 'title' | 'amount' | 'paidBy' | 'paidByName' | 'split'>>
): Promise<void> {
  const payload: Partial<ExpenseRow> = {};
  if (updates.title !== undefined)       payload.title        = updates.title;
  if (updates.amount !== undefined)      payload.amount       = updates.amount;
  if (updates.paidBy !== undefined)      payload.paid_by      = updates.paidBy;
  if (updates.paidByName !== undefined)  payload.paid_by_name = updates.paidByName;
  if (updates.split !== undefined)       payload.split        = updates.split;

  const { error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', expenseId);

  if (error) throw error;
}

// ─── Calculations ─────────────────────────────────────────────────────────────

export function calculateBalances(
  expenses: Expense[],
  participants: Participant[],
  currentUserId: string
): Balance[] {
  // net[id] > 0  → they owe you  |  net[id] < 0  → you owe them
  const net: Record<string, number> = {};
  participants.forEach((p) => (net[p.id] = 0));

  expenses.forEach((expense) => {
    const perPerson = expense.amount / (expense.split.length || 1);

    if (net[expense.paidBy] !== undefined) {
      net[expense.paidBy] += expense.amount;
    }
    expense.split.forEach((s) => {
      if (net[s.participantId] !== undefined) {
        net[s.participantId] -= s.amount ?? perPerson;
      }
    });
  });

  return participants
    .filter((p) => p.id !== currentUserId)
    .map((p) => {
      const fromCurrentUser = -(net[p.id] ?? 0);
      return {
        participantId: p.id,
        name:          p.name,
        photoURL:      p.photoURL,
        amount:        Math.abs(fromCurrentUser),
        status:
          fromCurrentUser === 0  ? 'settled'    :
          fromCurrentUser > 0    ? 'owe'         :
                                   'owedToYou',
      } as Balance;
    });
}

export function getTotalSpent(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getYouOwe(expenses: Expense[], currentUserId: string): number {
  return expenses.reduce((total, expense) => {
    if (expense.paidBy === currentUserId) return total;
    const share = expense.split.find((s) => s.participantId === currentUserId);
    return total + (share?.amount ?? 0);
  }, 0);
}
