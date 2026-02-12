import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { Readable } from "node:stream";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Auth verification will fail."
  );
}

const prisma = new PrismaClient();
const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

const VALID_CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "entertainment",
  "utilities",
  "health",
  "travel",
  "other",
];

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

function serializeExpense(expense) {
  return {
    id: expense.id,
    user_id: expense.user_id,
    amount: toNumber(expense.amount),
    description: expense.description,
    category: expense.category,
    confidence: toNumber(expense.confidence),
    date: expense.date?.toISOString ? expense.date.toISOString() : expense.date,
    created_at: expense.created_at?.toISOString
      ? expense.created_at.toISOString()
      : expense.created_at,
    updated_at: expense.updated_at?.toISOString
      ? expense.updated_at.toISOString()
      : expense.updated_at,
  };
}

async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    console.error("Auth check failed:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/expenses", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const expenses = await prisma.expense.findMany({
      where: { user_id: userId },
      orderBy: { date: "desc" },
    });
    res.json({ expenses: expenses.map(serializeExpense) });
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

app.post("/api/parse-expenses", async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, expenses: [], error: "GROQ_API_KEY is not configured" });
    }

    const { input } = req.body || {};
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({ success: false, expenses: [], error: "Input is required" });
    }

    const systemPrompt = `You are an expense parsing assistant. Parse natural language expense descriptions into structured data.

Extract ALL expenses mentioned in the text. For each expense, determine:
1. amount: The dollar amount (number only, no currency symbol)
2. description: A brief, clean description (2-4 words, capitalized)
3. category: One of: ${VALID_CATEGORIES.join(", ")}
4. confidence: How confident you are in the categorization (0.0 to 1.0)

Rules:
- If an amount mentions "dollars" or "$", extract just the number
- For ambiguous categories, use "other" with lower confidence
- Always return valid JSON array
- If no expenses can be parsed, return empty array`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      if (response.status === 429) {
        return res.status(429).json({ success: false, expenses: [], error: "Rate limit exceeded. Please try again later." });
      }
      if (response.status === 402) {
        return res.status(402).json({ success: false, expenses: [], error: "AI credits exhausted. Please add credits." });
      }
      return res.status(500).json({ success: false, expenses: [], error: `AI gateway error: ${response.status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No valid response from AI");
    }

    const jsonSlice = extractJsonFromContent(content);
    if (!jsonSlice) {
      throw new Error("AI response was not valid JSON");
    }

    const parsed = JSON.parse(jsonSlice);
    const expenses = normalizeParsedExpenses(parsed);

    const validatedExpenses = expenses
      .filter((exp) => {
        return (
          typeof exp.amount === "number" &&
          exp.amount > 0 &&
          typeof exp.description === "string" &&
          VALID_CATEGORIES.includes(exp.category)
        );
      })
      .map((exp) => ({
        amount: Math.round(exp.amount * 100) / 100,
        description: exp.description.trim(),
        category: exp.category,
        confidence: Math.min(1, Math.max(0, exp.confidence || 0.8)),
      }));

    return res.json({ success: true, expenses: validatedExpenses });
  } catch (error) {
    console.error("parse-expenses error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, expenses: [], error: errorMessage });
  }
});


app.post("/api/chat-expenses", requireUser, async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    const { message, conversationHistory } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const userId = req.user.id;
    const expenses = await prisma.expense.findMany({
      where: { user_id: userId },
      orderBy: { date: "desc" },
    });

    const normalizedExpenses = expenses.map((e) => ({
      ...e,
      amount: toNumber(e.amount),
    }));

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisWeekExpenses = normalizedExpenses.filter((e) => new Date(e.date) >= startOfWeek);
    const thisMonthExpenses = normalizedExpenses.filter((e) => new Date(e.date) >= startOfMonth);
    const lastMonthExpenses = normalizedExpenses.filter((e) => {
      const d = new Date(e.date);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const categoryTotals = {};
    const weekCategoryTotals = {};
    const monthCategoryTotals = {};
    const lastMonthCategoryTotals = {};

    normalizedExpenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    });

    thisWeekExpenses.forEach((e) => {
      weekCategoryTotals[e.category] = (weekCategoryTotals[e.category] || 0) + (e.amount || 0);
    });

    thisMonthExpenses.forEach((e) => {
      monthCategoryTotals[e.category] = (monthCategoryTotals[e.category] || 0) + (e.amount || 0);
    });

    lastMonthExpenses.forEach((e) => {
      lastMonthCategoryTotals[e.category] = (lastMonthCategoryTotals[e.category] || 0) + (e.amount || 0);
    });

    const totalAll = normalizedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalWeek = thisWeekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalMonth = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const expenseContext = `
Current Date: ${now.toISOString().split("T")[0]}

EXPENSE SUMMARY:
- Total all time: $${totalAll.toFixed(2)} (${normalizedExpenses.length} expenses)
- This week: $${totalWeek.toFixed(2)} (${thisWeekExpenses.length} expenses)
- This month: $${totalMonth.toFixed(2)} (${thisMonthExpenses.length} expenses)
- Last month: $${totalLastMonth.toFixed(2)} (${lastMonthExpenses.length} expenses)

ALL-TIME BY CATEGORY:
${Object.entries(categoryTotals).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join("\n")}

THIS WEEK BY CATEGORY:
${Object.entries(weekCategoryTotals).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join("\n") || "- No expenses this week"}

THIS MONTH BY CATEGORY:
${Object.entries(monthCategoryTotals).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join("\n") || "- No expenses this month"}

LAST MONTH BY CATEGORY:
${Object.entries(lastMonthCategoryTotals).map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join("\n") || "- No expenses last month"}

RECENT EXPENSES (last 20):
${normalizedExpenses.slice(0, 20).map((e) => `- ${new Date(e.date).toLocaleDateString()}: $${(e.amount || 0).toFixed(2)} - ${e.description} (${e.category})`).join("\n") || "No expenses found"}
`;

    const systemPrompt = `You are a helpful expense tracking assistant. You help users understand their spending habits by answering questions about their expenses.

${expenseContext}

Guidelines:
- Answer questions about spending patterns, totals, and categories
- Be concise and friendly
- Format currency amounts with $ and 2 decimal places
- If asked about something not in the data, politely explain what information is available
- Suggest ways to save money or track spending better when appropriate
- Use markdown formatting for better readability (bold for amounts, lists for breakdowns)`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
      }
      if (response.status === 402) {
        return res.status(402).json({ error: "AI credits exhausted. Please add credits." });
      }
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return res.status(500).json({ error: `AI gateway error: ${response.status}` });
    }

    if (!response.body) {
      return res.status(500).json({ error: "No response body" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = Readable.fromWeb(response.body);
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.end();
    });
    stream.pipe(res);
  } catch (error) {
    console.error("chat-expenses error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/api/expenses", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const items = Array.isArray(req.body?.expenses) ? req.body.expenses : [];
    if (items.length === 0) {
      return res.status(400).json({ error: "No expenses provided" });
    }

    const created = await prisma.$transaction(
      items.map((exp) =>
        prisma.expense.create({
          data: {
            user_id: userId,
            amount: exp.amount,
            description: exp.description,
            category: exp.category,
            confidence: exp.confidence ?? 1,
            date: exp.date ? new Date(exp.date) : new Date(),
          },
        })
      )
    );

    res.json({ expenses: created.map(serializeExpense) });
  } catch (error) {
    console.error("Failed to add expenses:", error);
    res.status(500).json({ error: "Failed to add expenses" });
  }
});

app.patch("/api/expenses/:id", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, description, category } = req.body || {};

    const result = await prisma.expense.updateMany({
      where: { id, user_id: userId },
      data: {
        amount,
        description,
        category,
        updated_at: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to update expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.delete("/api/expenses/:id", requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await prisma.expense.deleteMany({
      where: { id, user_id: userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
function extractJsonFromContent(content) {
  const startIndex = (() => {
    const brace = content.indexOf("{");
    const bracket = content.indexOf("[");
    if (brace === -1) return bracket;
    if (bracket === -1) return brace;
    return Math.min(brace, bracket);
  })();

  if (startIndex === -1) return null;

  const startChar = content[startIndex];
  const openChar = startChar === "[" ? "[" : "{";
  const closeChar = startChar === "[" ? "]" : "}";

  let depth = 0;
  for (let i = startIndex; i < content.length; i += 1) {
    const char = content[i];
    if (char === openChar) depth += 1;
    if (char === closeChar) depth -= 1;
    if (depth === 0) {
      return content.slice(startIndex, i + 1);
    }
  }

  return null;
}

function normalizeParsedExpenses(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.expenses)) {
    return parsed.expenses;
  }
  return [];
}
