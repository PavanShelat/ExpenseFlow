import { useEffect, useMemo, useState } from 'react';
import { Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ParsedExpense, Category, CATEGORY_CONFIG } from '@/types/expense';

interface ReceiptPreviewDialogProps {
  open: boolean;
  expense: ParsedExpense | null;
  imageUrl?: string | null;
  onConfirm: (expense: ParsedExpense) => void;
  onOpenChange: (open: boolean) => void;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function ReceiptPreviewDialog({
  open,
  expense,
  imageUrl,
  onConfirm,
  onOpenChange,
}: ReceiptPreviewDialogProps) {
  const [draft, setDraft] = useState<ParsedExpense | null>(expense);

  useEffect(() => {
    setDraft(expense);
  }, [expense]);

  const allCategories = useMemo(
    () => Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][],
    [],
  );

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Receipt Details</DialogTitle>
          <DialogDescription>
            Confirm the data we found from the receipt image before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 p-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Receipt preview"
                  className="h-40 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg bg-secondary/40 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Edit any field before saving the expense.
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="receipt-description">
                Description
              </label>
              <Input
                id="receipt-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="receipt-amount">
                  Amount
                </label>
                <Input
                  id="receipt-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev!,
                      amount: parseFloat(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="receipt-date">
                  Date
                </label>
                <Input
                  id="receipt-date"
                  type="date"
                  value={formatDateValue(draft.date)}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev!,
                      date: parseDateValue(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="receipt-category">
                Category
              </label>
              <select
                id="receipt-category"
                value={draft.category}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev!,
                    category: event.target.value as Category,
                  }))
                }
                className="w-full appearance-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {allCategories.map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => draft && onConfirm(draft)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Check className="mr-2 h-4 w-4" />
            Save Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
