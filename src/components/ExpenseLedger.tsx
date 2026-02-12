import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Calendar, Pencil } from 'lucide-react';
import { Category, CATEGORY_CONFIG } from '@/types/expense';
import { formatCurrency } from '@/lib/expenseParser';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { EditExpenseDialog } from './EditExpenseDialog';

interface LedgerExpense {
  id: string;
  amount: number;
  description: string;
  category: Category;
  confidence: number;
  date: Date;
}

interface ExpenseLedgerProps {
  expenses: LedgerExpense[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: { amount: number; description: string; category: Category }) => void;
}

function groupExpensesByDate(expenses: LedgerExpense[]) {
  const groups: Record<string, LedgerExpense[]> = {};
  
  expenses.forEach(expense => {
    const date = new Date(expense.date);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else if (isThisWeek(date)) {
      key = format(date, 'EEEE');
    } else {
      key = format(date, 'MMM d, yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(expense);
  });
  
  return groups;
}

export function ExpenseLedger({ expenses, onDelete, onUpdate }: ExpenseLedgerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<LedgerExpense | null>(null);
  const groupedExpenses = groupExpensesByDate(expenses);
  
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
    }, 200);
  };

  const handleEdit = (expense: LedgerExpense) => {
    setEditingExpense(expense);
  };

  const handleSave = (id: string, updates: { amount: number; description: string; category: Category }) => {
    if (onUpdate) {
      onUpdate(id, updates);
    }
    setEditingExpense(null);
  };

  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
          <Calendar className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No expenses yet</h3>
        <p className="text-muted-foreground">
          Start by typing something like "$15 lunch and $40 fuel"
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedExpenses).map(([dateKey, dateExpenses]) => (
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Date Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {dateKey}
              </h3>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(dateExpenses.reduce((sum, e) => sum + e.amount, 0))}
              </span>
            </div>

            {/* Expense Cards */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {dateExpenses.map((expense) => (
                  <motion.div
                    key={expense.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                      opacity: deletingId === expense.id ? 0.5 : 1, 
                      scale: deletingId === expense.id ? 0.95 : 1 
                    }}
                    exit={{ opacity: 0, scale: 0.9, height: 0 }}
                    className="group glass-card rounded-xl p-4 hover:shadow-elevated transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* Category Icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${CATEGORY_CONFIG[expense.category].color}12` }}
                      >
                        {CATEGORY_CONFIG[expense.category].icon}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {expense.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_CONFIG[expense.category].label}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-foreground text-lg">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), 'h:mm a')}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingExpense && (
        <EditExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          expense={editingExpense}
          onSave={handleSave}
        />
      )}
    </>
  );
}
