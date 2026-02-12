import Tesseract from 'tesseract.js';
import { parseExpenses, detectCategory } from '@/lib/expenseParser';
import type { ParsedExpense, Category } from '@/types/expense';

type ProgressHandler = (progress: number) => void;

const TOTAL_KEYWORDS = [
  'total',
  'grand total',
  'amount due',
  'balance due',
  'total due',
  'amount received',
  'card payment',
  'net amount',
  'payable',
  'bill amount',
  'amount',
];

const IGNORE_MERCHANT_LINES = [
  'thank you',
  'thanks',
  'receipt',
  'invoice',
  'total',
  'subtotal',
  'tax',
  'gst',
  'cgst',
  'sgst',
  'cess',
  'visa',
  'mastercard',
  'amex',
  'cash',
  'change',
  'balance',
  'due',
  'payment',
  'debit',
  'credit',
  'tip',
  'gratuity',
  'rounding',
  'discount',
];

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const amount = parseFloat(cleaned);
  if (Number.isNaN(amount)) return null;
  return amount;
}

function extractMoneyValues(text: string): number[] {
  const matches = text.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [];
  return matches
    .map(parseMoney)
    .filter((amount): amount is number => typeof amount === 'number' && amount > 0);
}

function findTotalAmount(text: string): { amount: number | null; confidence: number } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const prioritized = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => {
      const lower = line.toLowerCase();
      if (!TOTAL_KEYWORDS.some((keyword) => lower.includes(keyword))) return false;
      if (lower.includes('subtotal')) return false;
      if (lower.includes('taxable')) return false;
      return true;
    });

  for (let i = prioritized.length - 1; i >= 0; i -= 1) {
    const { line } = prioritized[i];
    const values = extractMoneyValues(line);
    if (values.length > 0) {
      return { amount: values[values.length - 1], confidence: 0.85 };
    }
  }

  const bottomLines = lines.slice(-10);
  for (let i = bottomLines.length - 1; i >= 0; i -= 1) {
    const values = extractMoneyValues(bottomLines[i]);
    if (values.length > 0) {
      return { amount: values[values.length - 1], confidence: 0.6 };
    }
  }

  const allValues = extractMoneyValues(text);
  if (allValues.length === 0) return { amount: null, confidence: 0.4 };
  return { amount: Math.max(...allValues), confidence: 0.55 };
}

function findReceiptDate(text: string): Date | null {
  const normalized = text.replace(/\s+/g, ' ');

  const ymd = normalized.match(/\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const mdy = normalized.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (mdy) {
    let month = parseInt(mdy[1], 10);
    let day = parseInt(mdy[2], 10);
    let year = parseInt(mdy[3], 10);
    if (year < 100) year += 2000;
    if (day > 12 && month <= 12) {
      const swap = month;
      month = day;
      day = swap;
    }
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const monthName = normalized.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})\b/);
  if (monthName) {
    const monthStr = monthName[1].toLowerCase();
    const monthIndex = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ].findIndex((name) => name.startsWith(monthStr));
    if (monthIndex >= 0) {
      let year = parseInt(monthName[3], 10);
      if (year < 100) year += 2000;
      const day = parseInt(monthName[2], 10);
      const date = new Date(year, monthIndex, day);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  return null;
}

function findMerchant(text: string): string | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const head = lines.slice(0, 8);

  const candidates = head
    .filter((line) => line.length >= 3)
    .filter((line) => /[a-zA-Z]/.test(line))
    .filter((line) => {
      const lower = line.toLowerCase();
      return !IGNORE_MERCHANT_LINES.some((ignore) => lower.includes(ignore));
    });

  if (candidates.length === 0) return null;

  const weighted = candidates
    .map((line) => {
      const lower = line.toLowerCase();
      const normalized = line.replace(/\d+/g, '').replace(/[^A-Za-z\s&.-]/g, '').trim();
      let score = line.length;
      if (lower.includes('mart')) score += 10;
      if (lower.includes('super')) score += 8;
      if (lower.includes('store')) score += 8;
      if (lower.includes('market')) score += 6;
      return { line: normalized || line, score };
    })
    .sort((a, b) => b.score - a.score);

  return weighted[0].line.replace(/\s{2,}/g, ' ').trim();
}

function normalizeDescription(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Receipt';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const MERCHANT_CATEGORY_HINTS: Record<Category, string[]> = {
  food: ['restaurant', 'cafe', 'coffee', 'bakery', 'pizza', 'burger', 'kitchen', 'diner', 'bar', 'grill', 'bistro'],
  transport: ['gas', 'fuel', 'petrol', 'station', 'uber', 'lyft', 'taxi', 'parking'],
  shopping: ['walmart', 'target', 'costco', 'ikea', 'best buy', 'amazon', 'mall', 'mart', 'store', 'shop', 'market'],
  entertainment: ['cinema', 'theatre', 'theater', 'netflix', 'spotify', 'arcade'],
  utilities: ['utility', 'electric', 'power', 'water', 'internet', 'telecom'],
  health: ['pharmacy', 'clinic', 'hospital', 'health', 'dental', 'optical'],
  travel: ['airlines', 'hotel', 'resort', 'airbnb', 'motel', 'inn'],
  other: [],
};

function pickCategoryFromMerchant(merchant?: string): { category: Category; confidence: number } {
  if (!merchant) return { category: 'other', confidence: 0.4 };
  const lower = merchant.toLowerCase();
  let best: Category = 'other';
  let score = 0;

  for (const [category, hints] of Object.entries(MERCHANT_CATEGORY_HINTS)) {
    let localScore = 0;
    for (const hint of hints) {
      if (lower.includes(hint)) {
        localScore += hint.length;
      }
    }
    if (localScore > score) {
      score = localScore;
      best = category as Category;
    }
  }

  if (best !== 'other') {
    return { category: best, confidence: Math.min(0.9, 0.6 + score * 0.05) };
  }

  return detectCategory(merchant);
}

function pickCategory(parsedCategory?: Category): Category {
  return parsedCategory || 'other';
}

export async function parseReceiptImage(
  file: File,
  onProgress?: ProgressHandler,
): Promise<{ expense: ParsedExpense; text: string }> {
  const ocrImage = await loadImageForOcr(file);
  const result = await Tesseract.recognize(ocrImage, 'eng', {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(message.progress || 0);
      }
    },
  });

  const text = result.data.text || '';
  const parsed = parseExpenses(text);
  const ruleExpense = parsed.expenses[0];
  const { amount: keywordAmount, confidence: amountConfidence } = findTotalAmount(text);

  const merchant = findMerchant(text);
  const date = findReceiptDate(text) || new Date();

  const amount = keywordAmount ?? ruleExpense?.amount ?? 0;
  const description = normalizeDescription(merchant || ruleExpense?.description || 'Receipt');
  const merchantCategory = pickCategoryFromMerchant(merchant);
  const category = merchantCategory.category !== 'other'
    ? merchantCategory.category
    : pickCategory(ruleExpense?.category);
  const confidence = merchantCategory.category !== 'other'
    ? merchantCategory.confidence
    : (ruleExpense?.confidence ?? amountConfidence);

  return {
    text,
    expense: {
      id: generateId(),
      amount,
      description,
      category,
      confidence,
      needsReview: true,
      date,
    },
  };
}

async function loadImageForOcr(file: File): Promise<HTMLCanvasElement> {
  if (!file || file.size === 0) {
    throw new Error('Empty image file');
  }

  const bitmap = await loadImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    throw new Error('Failed to initialize image canvas');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to HTMLImageElement
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unsupported image format'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to initialize image canvas');
    }
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
