import { motion } from 'framer-motion';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Film, 
  Zap, 
  Heart, 
  Plane, 
  MoreHorizontal 
} from 'lucide-react';
import { formatCurrency } from '@/lib/expenseParser';
import type { Category } from '@/types/expense';

interface CategoryBreakdownProps {
  categoryTotals: Record<string, number>;
  totalAmount: number;
}

const CATEGORY_CONFIG: Record<Category, { icon: React.ElementType; label: string; color: string }> = {
  food: { icon: Utensils, label: 'Food & Dining', color: 'bg-orange-500' },
  transport: { icon: Car, label: 'Transport', color: 'bg-blue-500' },
  shopping: { icon: ShoppingBag, label: 'Shopping', color: 'bg-pink-500' },
  entertainment: { icon: Film, label: 'Entertainment', color: 'bg-purple-500' },
  utilities: { icon: Zap, label: 'Utilities', color: 'bg-yellow-500' },
  health: { icon: Heart, label: 'Health', color: 'bg-red-500' },
  travel: { icon: Plane, label: 'Travel', color: 'bg-teal-500' },
  other: { icon: MoreHorizontal, label: 'Other', color: 'bg-gray-500' },
};

export function CategoryBreakdown({ categoryTotals, totalAmount }: CategoryBreakdownProps) {
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedCategories.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
        No expenses in this period
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Spending by Category
      </h3>
      <div className="space-y-3">
        {sortedCategories.map(([category, amount], index) => {
          const config = CATEGORY_CONFIG[category as Category] || CATEGORY_CONFIG.other;
          const Icon = config.icon;
          const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${config.color} bg-opacity-20 flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${config.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={`h-full ${config.color} rounded-full`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
