import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExpensesWithAI } from '@/lib/aiExpenseParser';
import { parseReceiptImage } from '@/lib/receiptOcr';
import { ParsedExpense } from '@/types/expense';
import { toast } from 'sonner';

interface ExpenseInputProps {
  onParsed: (expenses: ParsedExpense[], rawInput: string) => void;
  onReceiptParsed?: (expense: ParsedExpense, meta: { rawText: string; imageUrl: string }) => void;
}

const PLACEHOLDER_EXAMPLES = [
  '$15 lunch and $40 fuel',
  '$25 coffee with clients, $150 office supplies',
  'Spent $45 on groceries and $12 uber',
  '$8.50 breakfast, $32 lunch, $15 parking',
];

export function ExpenseInput({ onParsed, onReceiptParsed }: ExpenseInputProps) {
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isOcrParsing, setIsOcrParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_EXAMPLES[0]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder((prev) => {
        const currentIndex = PLACEHOLDER_EXAMPLES.indexOf(prev);
        return PLACEHOLDER_EXAMPLES[(currentIndex + 1) % PLACEHOLDER_EXAMPLES.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isParsing || isOcrParsing) return;

    setIsParsing(true);

    try {
      const result = await parseExpensesWithAI(input);

      if (result.success && result.expenses.length > 0) {
        onParsed(result.expenses, input);
        setInput('');
      } else {
        toast.error('Could not parse expenses. Try rephrasing.');
      }
    } catch (error) {
      console.error('Parsing error:', error);
      toast.error('Failed to parse expenses');
    } finally {
      setIsParsing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (isOcrParsing) return;
    setIsOcrParsing(true);
    setOcrProgress(0);

    try {
      const imageUrl = URL.createObjectURL(file);
      const { expense, text } = await parseReceiptImage(file, (progress) => {
        setOcrProgress(progress);
      });

      if (expense.amount <= 0) {
        toast.error('Could not find a total on that receipt. Try a clearer image.');
        URL.revokeObjectURL(imageUrl);
        return;
      }

      if (onReceiptParsed) {
        onReceiptParsed(expense, { rawText: text, imageUrl });
      } else {
        URL.revokeObjectURL(imageUrl);
      }
    } catch (error) {
      console.error('Receipt OCR failed:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Unsupported image format')) {
        toast.error('Unsupported image format. Please upload a JPG or PNG.');
      } else if (message.includes('Empty image file')) {
        toast.error('That image file is empty. Please try again.');
      } else {
        toast.error('Failed to read that receipt. Try again with better lighting.');
      }
    } finally {
      setIsOcrParsing(false);
      setOcrProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleReceiptUpload(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="relative">
        {/* Glow effect behind input */}
        <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

        <div className="relative glass-card rounded-2xl p-1.5 transition-all duration-300 hover:shadow-elevated focus-within:shadow-elevated focus-within:ring-2 focus-within:ring-accent/30">
          <div className="flex items-start gap-3 p-4">
            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={2}
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground/60 text-lg leading-relaxed"
              />

              <AnimatePresence>
                {input.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground mt-2"
                  >
                    Press Enter to parse or click the button â†’
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing || isOcrParsing}
                className="rounded-xl border-border/60 text-muted-foreground hover:text-foreground"
                aria-label="Upload receipt"
              >
                {isOcrParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isParsing || isOcrParsing}
                size="lg"
                className="flex-shrink-0 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-soft transition-all duration-200 hover:shadow-elevated hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isParsing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isOcrParsing && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Scanning receipt... {Math.round(ocrProgress * 100)}%
        </p>
      )}

      {/* Helper text */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Type naturally: "<span className="text-foreground/80">$15 lunch and $40 fuel</span>" â€” we&apos;ll parse it instantly
      </p>
    </motion.div>
  );
}
