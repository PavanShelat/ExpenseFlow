import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Edit3, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ParsedExpense, Category, CATEGORY_CONFIG } from '@/types/expense';
import { formatCurrency } from '@/lib/expenseParser';

interface ExpensePreviewProps {
  expenses: ParsedExpense[];
  rawInput: string;
  onConfirm: (expenses: ParsedExpense[]) => void;
  onCancel: () => void;
}

export function ExpensePreview({ expenses, rawInput, onConfirm, onCancel }: ExpensePreviewProps) {
  const [editedExpenses, setEditedExpenses] = useState<ParsedExpense[]>(expenses);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleUpdateExpense = (id: string, updates: Partial<ParsedExpense>) => {
    setEditedExpenses(prev =>
      prev.map(exp =>
        exp.id === id ? { ...exp, ...updates, needsReview: false } : exp
      )
    );
  };

  const handleRemoveExpense = (id: string) => {
    setEditedExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const totalAmount = editedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const allCategories = Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Review Expenses</h3>
              <p className="text-sm text-muted-foreground mt-0.5">"{rawInput}"</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="divide-y divide-border/50">
          <AnimatePresence>
            {editedExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Category Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${CATEGORY_CONFIG[expense.category].color}15` }}
                  >
                    {CATEGORY_CONFIG[expense.category].icon}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {editingId === expense.id ? (
                        <Input
                          value={expense.description}
                          onChange={(e) => handleUpdateExpense(expense.id, { description: e.target.value })}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                          autoFocus
                          className="h-8 text-base font-medium"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingId(expense.id)}
                          className="font-medium text-foreground hover:text-accent transition-colors flex items-center gap-1.5 group"
                        >
                          {expense.description}
                          <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                      
                      {expense.needsReview && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                          <AlertTriangle className="w-3 h-3" />
                          Review
                        </span>
                      )}
                    </div>

                    {/* Category selector */}
                    <div className="relative mt-1.5">
                      <select
                        value={expense.category}
                        onChange={(e) => handleUpdateExpense(expense.id, { category: e.target.value as Category })}
                        className="appearance-none bg-transparent text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors pr-5"
                      >
                        {allCategories.map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.icon} {config.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Confidence indicator */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[100px]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${expense.confidence * 100}%` }}
                          transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: expense.confidence >= 0.7 
                              ? 'hsl(var(--success))' 
                              : expense.confidence >= 0.5 
                                ? 'hsl(var(--warning))' 
                                : 'hsl(var(--destructive))'
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(expense.confidence * 100)}% confident
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <Input
                      type="number"
                      value={expense.amount}
                      onChange={(e) => handleUpdateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-24 text-right font-semibold text-lg h-10"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveExpense(expense.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border/50 bg-secondary/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(editedExpenses)}
            disabled={editedExpenses.length === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirm {editedExpenses.length} expense{editedExpenses.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
