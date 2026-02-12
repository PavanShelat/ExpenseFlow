export type Category = 
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'utilities'
  | 'health'
  | 'travel'
  | 'other';

export interface ParsedExpense {
  id: string;
  amount: number;
  description: string;
  category: Category;
  confidence: number; // 0-1 scale
  needsReview: boolean;
  date: Date;
}

export interface Expense extends ParsedExpense {
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsingResult {
  success: boolean;
  expenses: ParsedExpense[];
  rawInput: string;
  processingTime: number;
}

export const CATEGORY_CONFIG: Record<Category, { label: string; icon: string; color: string }> = {
  food: { label: 'Food & Dining', icon: '🍽️', color: 'hsl(24, 95%, 53%)' },
  transport: { label: 'Transport', icon: '🚗', color: 'hsl(200, 98%, 39%)' },
  shopping: { label: 'Shopping', icon: '🛒', color: 'hsl(280, 87%, 53%)' },
  entertainment: { label: 'Entertainment', icon: '🎬', color: 'hsl(330, 81%, 60%)' },
  utilities: { label: 'Utilities', icon: '⚡', color: 'hsl(48, 96%, 53%)' },
  health: { label: 'Health', icon: '🏥', color: 'hsl(142, 71%, 45%)' },
  travel: { label: 'Travel', icon: '✈️', color: 'hsl(190, 95%, 39%)' },
  other: { label: 'Other', icon: '📝', color: 'hsl(220, 14%, 46%)' },
};
