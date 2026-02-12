import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, LogOut, User, BarChart3, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseInput } from '@/components/ExpenseInput';
import { ExpensePreview } from '@/components/ExpensePreview';
import { ExpenseLedger } from '@/components/ExpenseLedger';
import { StatsCards } from '@/components/StatsCards';
import { ExpenseFilters, TimePeriod } from '@/components/ExpenseFilters';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { ParsedExpense, Category } from '@/types/expense';
import { Navigate, Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ViewState = 'idle' | 'input' | 'preview';

const Index = () => {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [receiptDraft, setReceiptDraft] = useState<ParsedExpense | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { 
    expenses, 
    isLoading, 
    addExpenses, 
    deleteExpense,
    updateExpense,
    getFilteredExpenses,
    getTotalByPeriod,
    getExpensesByCategory,
  } = useExpenses();

  // Get filtered data based on selected period and category
  const filteredExpenses = useMemo(() => {
    let filtered = getFilteredExpenses(selectedPeriod);
    if (selectedCategory) {
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }
    return filtered;
  }, [getFilteredExpenses, selectedPeriod, selectedCategory]);
  
  const categoryTotals = useMemo(() => 
    getExpensesByCategory(selectedPeriod), 
    [getExpensesByCategory, selectedPeriod]
  );
  
  const periodTotal = useMemo(() => 
    getTotalByPeriod(selectedPeriod), 
    [getTotalByPeriod, selectedPeriod]
  );

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleParsed = (parsed: ParsedExpense[], input: string) => {
    setParsedExpenses(parsed);
    setRawInput(input);
    setViewState('preview');
  };

  const handleConfirm = (confirmedExpenses: ParsedExpense[]) => {
    addExpenses(confirmedExpenses);
    setParsedExpenses([]);
    setRawInput('');
    setViewState('idle');
  };

  const handleReceiptParsed = (expense: ParsedExpense, meta: { rawText: string; imageUrl: string }) => {
    setReceiptDraft(expense);
    setReceiptImageUrl(meta.imageUrl);
    setReceiptOpen(true);
  };

  const handleReceiptConfirm = (expense: ParsedExpense) => {
    addExpenses([expense]);
    setReceiptOpen(false);
    setReceiptDraft(null);
    if (receiptImageUrl) {
      URL.revokeObjectURL(receiptImageUrl);
    }
    setReceiptImageUrl(null);
  };

  const handleReceiptClose = (open: boolean) => {
    setReceiptOpen(open);
    if (!open) {
      setReceiptDraft(null);
      if (receiptImageUrl) {
        URL.revokeObjectURL(receiptImageUrl);
      }
      setReceiptImageUrl(null);
    }
  };

  const handleCancel = () => {
    setParsedExpenses([]);
    setRawInput('');
    setViewState('idle');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">ExpenseFlow</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Tracking</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {viewState === 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    onClick={() => setViewState('input')}
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-soft"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Link */}
            <Link to="/chat">
              <Button variant="ghost" size="icon" className="rounded-full">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </Link>

            {/* Analytics Link */}
            <Link to="/analytics">
              <Button variant="ghost" size="icon" className="rounded-full">
                <BarChart3 className="w-5 h-5" />
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <StatsCards
          todayTotal={getTotalByPeriod('today')}
          weekTotal={getTotalByPeriod('week')}
          monthTotal={getTotalByPeriod('month')}
          allTimeTotal={getTotalByPeriod('all')}
        />

        {/* Input / Preview State */}
        <AnimatePresence mode="wait">
          {viewState === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExpenseInput
                onParsed={handleParsed}
                onReceiptParsed={handleReceiptParsed}
              />
              <div className="text-center mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setViewState('idle')}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {viewState === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <ExpensePreview
                expenses={parsedExpenses}
                rawInput={rawInput}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ReceiptPreviewDialog
          open={receiptOpen}
          expense={receiptDraft}
          imageUrl={receiptImageUrl}
          onConfirm={handleReceiptConfirm}
          onOpenChange={handleReceiptClose}
        />

        {/* Quick Add Button (when idle and no input showing) */}
        {viewState === 'idle' && expenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <Button
              onClick={() => setViewState('input')}
              variant="outline"
              size="lg"
              className="rounded-full px-8 shadow-soft hover:shadow-elevated hover:border-accent/50 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add expenses naturally
            </Button>
          </motion.div>
        )}

        {/* Filters and Analytics */}
        {viewState === 'idle' && expenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ExpenseFilters
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
            
            <CategoryBreakdown
              categoryTotals={categoryTotals}
              totalAmount={periodTotal}
            />
          </motion.div>
        )}

        {/* Ledger */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedPeriod === 'all' ? 'All Expenses' : 
               selectedPeriod === 'today' ? "Today's Expenses" :
               selectedPeriod === 'week' ? 'This Week' : 'This Month'}
            </h2>
            <span className="text-sm text-muted-foreground">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ExpenseLedger 
            expenses={filteredExpenses} 
            onDelete={deleteExpense} 
            onUpdate={updateExpense}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
import { ReceiptPreviewDialog } from '@/components/ReceiptPreviewDialog';
