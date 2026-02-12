import { ParsedExpense, ParsingResult, Category } from '@/types/expense';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface AIExpense {
  amount: number;
  description: string;
  category: Category;
  confidence: number;
}

interface AIParseResponse {
  success: boolean;
  expenses: AIExpense[];
  error?: string;
}

export async function parseExpensesWithAI(input: string): Promise<ParsingResult> {
  const startTime = performance.now();

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return {
      success: false,
      expenses: [],
      rawInput: input,
      processingTime: performance.now() - startTime,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/parse-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: trimmedInput }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI parsing failed:', response.status, errorText);
      throw new Error(`AI parsing failed: ${response.status}`);
    }

    const data: AIParseResponse = await response.json();

    if (!data.success || data.expenses.length === 0) {
      return {
        success: false,
        expenses: [],
        rawInput: input,
        processingTime: performance.now() - startTime,
      };
    }

    const expenses: ParsedExpense[] = data.expenses.map((exp) => ({
      id: generateId(),
      amount: exp.amount,
      description: exp.description,
      category: exp.category,
      confidence: exp.confidence,
      needsReview: exp.confidence < 0.7,
      date: new Date(),
    }));

    return {
      success: true,
      expenses,
      rawInput: input,
      processingTime: performance.now() - startTime,
    };
  } catch (error) {
    console.error('AI expense parsing error:', error);
    return {
      success: false,
      expenses: [],
      rawInput: input,
      processingTime: performance.now() - startTime,
    };
  }
}
