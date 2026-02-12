import { Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Category, CATEGORY_CONFIG } from '@/types/expense';

export type TimePeriod = 'today' | 'week' | 'month' | 'all';

interface ExpenseFiltersProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  selectedCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const CATEGORIES: Category[] = ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'health', 'travel', 'other'];

export function ExpenseFilters({ 
  selectedPeriod, 
  onPeriodChange, 
  selectedCategory, 
  onCategoryChange 
}: ExpenseFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Time Period Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
          <Calendar className="w-4 h-4" />
          <span>Period:</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={selectedPeriod === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange(option.value)}
              className={
                selectedPeriod === option.value
                  ? 'bg-accent text-accent-foreground'
                  : ''
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
          <Tag className="w-4 h-4" />
          <span>Category:</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(null)}
            className={selectedCategory === null ? 'bg-accent text-accent-foreground' : ''}
          >
            All
          </Button>
          {CATEGORIES.map((category) => {
            const config = CATEGORY_CONFIG[category];
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange(category)}
                className={selectedCategory === category ? 'bg-accent text-accent-foreground' : ''}
              >
                <span className="mr-1">{config.icon}</span>
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
