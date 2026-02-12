import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  BarChart3,
  Calendar 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/expenseParser';
import { Category, CATEGORY_CONFIG } from '@/types/expense';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend 
} from 'recharts';
import { format, subDays, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

const CHART_COLORS = [
  'hsl(24, 95%, 53%)',   // food - orange
  'hsl(200, 98%, 39%)',  // transport - blue
  'hsl(280, 87%, 53%)',  // shopping - purple
  'hsl(330, 81%, 60%)',  // entertainment - pink
  'hsl(48, 96%, 53%)',   // utilities - yellow
  'hsl(142, 71%, 45%)',  // health - green
  'hsl(190, 95%, 39%)',  // travel - teal
  'hsl(220, 14%, 46%)',  // other - gray
];

const Analytics = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { expenses, isLoading, getExpensesByCategory, getTotalByPeriod } = useExpenses();
  const [viewType, setViewType] = useState<'week' | 'month'>('month');

  // Prepare category data for pie chart
  const categoryData = useMemo(() => {
    const totals = getExpensesByCategory(viewType === 'week' ? 'week' : 'month');
    return Object.entries(totals)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount], index) => ({
        name: CATEGORY_CONFIG[category as Category]?.label || category,
        value: amount,
        color: CHART_COLORS[Object.keys(CATEGORY_CONFIG).indexOf(category)] || CHART_COLORS[7],
      }))
      .sort((a, b) => b.value - a.value);
  }, [getExpensesByCategory, viewType]);

  // Prepare daily spending data for bar chart
  const dailyData = useMemo(() => {
    const now = new Date();
    const startDate = viewType === 'week' ? subDays(now, 6) : startOfMonth(now);
    const days = eachDayOfInterval({ start: startDate, end: now });

    return days.map(day => {
      const dayExpenses = expenses.filter(exp => isSameDay(new Date(exp.date), day));
      const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      return {
        date: format(day, viewType === 'week' ? 'EEE' : 'MMM d'),
        amount: total,
      };
    });
  }, [expenses, viewType]);

  // Stats
  const totalSpent = getTotalByPeriod(viewType === 'week' ? 'week' : 'month');
  const avgDaily = useMemo(() => {
    const days = viewType === 'week' ? 7 : new Date().getDate();
    return totalSpent / days;
  }, [totalSpent, viewType]);

  const topCategory = categoryData[0];

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

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
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
              <p className="text-xs text-muted-foreground">Spending insights</p>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewType === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('week')}
              className={viewType === 'week' ? 'bg-accent text-accent-foreground' : ''}
            >
              Week
            </Button>
            <Button
              variant={viewType === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('month')}
              className={viewType === 'month' ? 'bg-accent text-accent-foreground' : ''}
            >
              Month
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Total Spent</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Daily Average</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(avgDaily)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <PieChartIcon className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Top Category</span>
            </div>
            <p className="text-2xl font-bold">
              {topCategory?.name || 'N/A'}
            </p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Spending by Category
            </h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            )}
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Daily Spending
            </h3>
            {dailyData.some(d => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="hsl(var(--accent))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            )}
          </motion.div>
        </div>

        {/* Category Breakdown List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {categoryData.map((item, index) => {
              const percentage = totalSpent > 0 ? (item.value / totalSpent) * 100 : 0;
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(item.value)}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Analytics;
