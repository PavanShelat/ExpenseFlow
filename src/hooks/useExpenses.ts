import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Category } from '@/types/expense';

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: Category;
  confidence: number;
  date: Date;
  created_at: Date;
  updated_at: Date;
}

interface ParsedExpense {
  id: string;
  amount: number;
  description: string;
  category: Category;
  confidence: number;
  needsReview: boolean;
  date: Date;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, session } = useAuth();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

  const getAuthHeaders = () => {
    const token = session?.access_token;
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // Fetch expenses from database
  const fetchExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    try {
      const headers = getAuthHeaders();
      if (!headers) throw new Error('Missing auth token');

      const response = await fetch(`${apiBaseUrl}/api/expenses`, {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch expenses');
      }

      const payload = await response.json();
      const mapped = (payload?.expenses || []).map((exp: any) => ({
        id: exp.id,
        amount: parseFloat(exp.amount.toString()),
        description: exp.description,
        category: exp.category as Category,
        confidence: parseFloat((exp.confidence || 1).toString()),
        date: new Date(exp.date),
        created_at: new Date(exp.created_at),
        updated_at: new Date(exp.updated_at),
      }));

      setExpenses(mapped);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpenses = useCallback(async (parsedExpenses: ParsedExpense[]) => {
    if (!user) return;

    try {
      const headers = getAuthHeaders();
      if (!headers) throw new Error('Missing auth token');

      const toInsert = parsedExpenses.map((exp) => ({
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        confidence: exp.confidence,
        date: exp.date.toISOString(),
      }));

      const response = await fetch(`${apiBaseUrl}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ expenses: toInsert }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add expenses');
      }

      const payload = await response.json();
      const mapped = (payload?.expenses || []).map((exp: any) => ({
        id: exp.id,
        amount: parseFloat(exp.amount.toString()),
        description: exp.description,
        category: exp.category as Category,
        confidence: parseFloat((exp.confidence || 1).toString()),
        date: new Date(exp.date),
        created_at: new Date(exp.created_at),
        updated_at: new Date(exp.updated_at),
      }));

      setExpenses((prev) => [...mapped, ...prev]);
      toast.success(`Added ${parsedExpenses.length} expense${parsedExpenses.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to add expenses:', error);
      toast.error('Failed to save expenses');
    }
  }, [user]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    if (!user) return;

    try {
      const headers = getAuthHeaders();
      if (!headers) throw new Error('Missing auth token');

      const response = await fetch(`${apiBaseUrl}/api/expenses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          amount: updates.amount,
          description: updates.description,
          category: updates.category,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update expense');
      }

      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === id ? { ...exp, ...updates, updated_at: new Date() } : exp
        )
      );
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error('Failed to update expense');
    }
  }, [user]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const headers = getAuthHeaders();
      if (!headers) throw new Error('Missing auth token');

      const response = await fetch(`${apiBaseUrl}/api/expenses/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete expense');
      }

      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      toast.success('Expense deleted');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    }
  }, [user]);

  const getFilteredExpenses = useCallback((period: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter((exp) => {
      if (period === 'all') return true;
      const expDate = new Date(exp.date);
      switch (period) {
        case 'today':
          return expDate >= startOfDay;
        case 'week':
          return expDate >= startOfWeek;
        case 'month':
          return expDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [expenses]);

  const getTotalByPeriod = useCallback((period: 'today' | 'week' | 'month' | 'all') => {
    return getFilteredExpenses(period).reduce((sum, exp) => sum + exp.amount, 0);
  }, [getFilteredExpenses]);

  const getExpensesByCategory = useCallback((period: 'today' | 'week' | 'month' | 'all' = 'all') => {
    const filtered = getFilteredExpenses(period);
    const byCategory: Record<string, number> = {};
    filtered.forEach((exp) => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });
    return byCategory;
  }, [getFilteredExpenses]);

  return {
    expenses,
    isLoading,
    addExpenses,
    updateExpense,
    deleteExpense,
    getFilteredExpenses,
    getTotalByPeriod,
    getExpensesByCategory,
    refetch: fetchExpenses,
  };
}
