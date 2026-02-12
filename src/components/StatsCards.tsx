import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Wallet, PieChart } from 'lucide-react';
import { formatCurrency } from '@/lib/expenseParser';

interface StatsCardsProps {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  allTimeTotal: number;
}

export function StatsCards({ todayTotal, weekTotal, monthTotal, allTimeTotal }: StatsCardsProps) {
  const stats = [
    {
      label: 'Today',
      value: todayTotal,
      icon: Calendar,
      color: 'hsl(var(--accent))',
      bgColor: 'hsl(var(--accent) / 0.1)',
    },
    {
      label: 'This Week',
      value: weekTotal,
      icon: TrendingUp,
      color: 'hsl(200, 98%, 39%)',
      bgColor: 'hsl(200, 98%, 39%, 0.1)',
    },
    {
      label: 'This Month',
      value: monthTotal,
      icon: Wallet,
      color: 'hsl(280, 87%, 53%)',
      bgColor: 'hsl(280, 87%, 53%, 0.1)',
    },
    {
      label: 'All Time',
      value: allTimeTotal,
      icon: PieChart,
      color: 'hsl(var(--foreground))',
      bgColor: 'hsl(var(--secondary))',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass-card rounded-xl p-4 hover:shadow-elevated transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: stat.bgColor }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
          <motion.p
            key={stat.value}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {formatCurrency(stat.value)}
          </motion.p>
        </motion.div>
      ))}
    </div>
  );
}
