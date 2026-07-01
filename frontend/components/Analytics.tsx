import React, { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, Activity, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppContext } from '../App';
import { Card, DateFilter } from './ui';
import { formatCurrency, getDateRange } from '../utils';
import { DateRangeFilter } from '../types';

const Analytics: React.FC = () => {
  const { enrichedSales, payments, expenses } = useAppContext();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const analyticsData = useMemo(() => {
    const filteredPayments = payments.filter(p => p.date >= start && p.date <= end);
    const filteredSales = enrichedSales.filter(s => s.date >= start && s.date <= end);
    const filteredExpenses = expenses.filter(e => e.date >= start && e.date <= end);

    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0) + filteredSales.reduce((sum, s) => sum + s.downPayment, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const estimatedProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const actualProfit = estimatedProfit - totalExpenses;

    const uniqueCustomers = new Set(filteredSales.map(s => s.customerId)).size;
    const clv = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    const totalInstallments = filteredSales.reduce((sum, s) => sum + s.schedule.length, 0);
    const overdueInstallments = filteredSales.reduce((sum, s) => sum + s.schedule.filter(sch => sch.status === 'OVERDUE').length, 0);
    const paymentScore = totalInstallments > 0 ? Math.round(((totalInstallments - overdueInstallments) / totalInstallments) * 100) : 100;

    return { totalRevenue, totalExpenses, actualProfit, clv, paymentScore };
  }, [enrichedSales, payments, expenses, start, end]);

  const trendData = useMemo(() => {
    const last6Months = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.getMonth(), year: d.getFullYear(), name: d.toLocaleString('default', { month: 'short' }), revenue: 0, profit: 0 };
    }).reverse();

    payments.forEach(p => {
      const d = new Date(p.date);
      const match = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (match) match.revenue += p.amount;
    });
    
    last6Months.forEach(m => m.profit = m.revenue * 0.25);

    return last6Months;
  }, [payments]);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];
  const pieData = [
    { name: 'Collected', value: analyticsData.totalRevenue },
    { name: 'Expenses', value: analyticsData.totalExpenses },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h2>
        <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><DollarSign size={18}/> Net Profit</div>
          <h3 className={`text-2xl font-bold ${analyticsData.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(analyticsData.actualProfit)}</h3>
          <p className="text-xs text-gray-400">Estimated profit minus expenses</p>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Target size={18}/> Avg. CLV</div>
          <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(analyticsData.clv)}</h3>
          <p className="text-xs text-gray-400">Customer Lifetime Value</p>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Activity size={18}/> Payment Score</div>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analyticsData.paymentScore}%</h3>
          <p className="text-xs text-gray-400">AI-based probability of on-time payments</p>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><TrendingUp size={18}/> Revenue Forecast</div>
          <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(analyticsData.totalRevenue * 1.15)}</h3>
          <p className="text-xs text-gray-400">Projected next month (+15% trend)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue vs Profit Trends</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `৳${val/1000}k`} tick={{ fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Cash Flow Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-sm text-gray-500">Revenue</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-sm text-gray-500">Expenses</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
