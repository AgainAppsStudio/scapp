import React, { useMemo, useState } from 'react';
import { Users, Smartphone, CreditCard, TrendingUp, AlertCircle, CheckCircle2, Package, Printer, DollarSign, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAppContext } from '../App';
import { Card, Badge, Modal, Button, DateFilter } from './ui';
import { formatCurrency, formatDate, getDateRange } from '../utils';
import { DateRangeFilter } from '../types';

const Dashboard: React.FC = () => {
  const { customers, enrichedSales, payments, devices, expenses, isLoading, currencySymbol } = useAppContext();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [detailModal, setDetailModal] = useState<{ title: string, type: string, data: any[] } | null>(null);

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const filteredSales = useMemo(() => enrichedSales.filter(s => s.date >= start && s.date <= end), [enrichedSales, start, end]);
  const filteredPayments = useMemo(() => payments.filter(p => p.date >= start && p.date <= end), [payments, start, end]);
  const filteredCustomers = useMemo(() => customers.filter(c => c.createdAt >= start && c.createdAt <= end), [customers, start, end]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.date >= start && e.date <= end), [expenses, start, end]);

  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalCollection = filteredPayments.reduce((sum, p) => sum + p.amount, 0) + filteredSales.reduce((sum, s) => sum + s.downPayment, 0);
    const totalDue = totalSales - totalCollection;
    const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalCollection - totalExpensesAmount;
    
    const active = filteredSales.filter(s => s.status === 'ACTIVE');
    const completed = filteredSales.filter(s => s.status === 'COMPLETED');

    return { totalSales, totalCollection, totalDue, totalExpensesAmount, netProfit, active, completed };
  }, [filteredSales, filteredPayments, filteredExpenses]);

  const monthlyRevenueData = useMemo(() => {
    const last6Months = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.getMonth(), year: d.getFullYear(), name: d.toLocaleString('default', { month: 'short' }), revenue: 0, expense: 0 };
    }).reverse();

    payments.forEach(p => {
      const d = new Date(p.date);
      const match = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (match) match.revenue += p.amount;
    });
    enrichedSales.forEach(s => {
      const d = new Date(s.date);
      const match = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (match) match.revenue += s.downPayment;
    });
    expenses.forEach(e => {
      const d = new Date(e.date);
      const match = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (match) match.expense += e.amount;
    });

    return last6Months;
  }, [payments, enrichedSales, expenses]);

  const lowStockDevices = useMemo(() => devices.filter(d => d.stock < 3), [devices]);

  if (isLoading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  const StatCard = ({ title, value, icon: Icon, colorClass, onClick }: any) => (
    <Card className="p-6 flex items-center gap-4" onClick={onClick}>
      <div className={`p-4 rounded-full ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
        <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
      </div>

      {lowStockDevices.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-800 dark:text-red-400">Low Stock Alert</h4>
            <p className="text-sm text-red-600 dark:text-red-300">
              {lowStockDevices.length} device(s) are running low on inventory. Please check the Inventory tab.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard title="Total Customers" value={filteredCustomers.length} icon={Users} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" onClick={() => setDetailModal({ title: 'Customers', type: 'customers', data: filteredCustomers })} />
        <StatCard title="Total Sales" value={formatCurrency(stats.totalSales, currencySymbol)} icon={Smartphone} colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" onClick={() => setDetailModal({ title: 'Sales', type: 'sales', data: filteredSales })} />
        <StatCard title="Total Collection" value={formatCurrency(stats.totalCollection, currencySymbol)} icon={TrendingUp} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" onClick={() => setDetailModal({ title: 'Collections', type: 'payments', data: filteredPayments })} />
        <StatCard title="Total Due" value={formatCurrency(stats.totalDue, currencySymbol)} icon={CreditCard} colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" onClick={() => setDetailModal({ title: 'Due Accounts', type: 'sales', data: stats.active })} />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpensesAmount, currencySymbol)} icon={Wallet} colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => setDetailModal({ title: 'Expenses', type: 'expenses', data: filteredExpenses })} />
        <StatCard title="Net Profit/Loss" value={formatCurrency(stats.netProfit, currencySymbol)} icon={DollarSign} colorClass={stats.netProfit >= 0 ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"} />
        <StatCard title="Active Installments" value={stats.active.length} icon={AlertCircle} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" onClick={() => setDetailModal({ title: 'Active Installments', type: 'sales', data: stats.active })} />
        <StatCard title="Completed Installments" value={stats.completed.length} icon={CheckCircle2} colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" onClick={() => setDetailModal({ title: 'Completed Installments', type: 'sales', data: stats.completed })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue vs Expenses (Last 6 Months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${currencySymbol}${val/1000}k`} tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1f2937', color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value, currencySymbol), '']}
                />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Low Stock Devices</h3>
          <div className="space-y-4">
            {lowStockDevices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Inventory levels are healthy.</p>
            ) : (
              lowStockDevices.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Package className="text-gray-400" size={20} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{device.brand} {device.model}</p>
                      <p className="text-xs text-gray-500">Unit Price: {formatCurrency(device.unitPrice, currencySymbol)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="danger">{device.stock} Left</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.title || ''} maxWidth="max-w-4xl">
        <div className="space-y-4">
          <div className="flex justify-end print-hidden">
            <Button onClick={() => window.print()} variant="outline" className="gap-2"><Printer size={16}/> Print</Button>
          </div>
          <div className="overflow-x-auto print-only:block">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  {detailModal?.type === 'customers' && (
                    <>
                      <th className="p-3 text-gray-700 dark:text-gray-300">Name</th><th className="p-3 text-gray-700 dark:text-gray-300">Phone</th><th className="p-3 text-gray-700 dark:text-gray-300">Joined</th>
                    </>
                  )}
                  {detailModal?.type === 'sales' && (
                    <>
                      <th className="p-3 text-gray-700 dark:text-gray-300">Invoice</th><th className="p-3 text-gray-700 dark:text-gray-300">Customer</th><th className="p-3 text-gray-700 dark:text-gray-300">Device</th><th className="p-3 text-gray-700 dark:text-gray-300">Total</th><th className="p-3 text-gray-700 dark:text-gray-300">Due</th>
                    </>
                  )}
                  {detailModal?.type === 'payments' && (
                    <>
                      <th className="p-3 text-gray-700 dark:text-gray-300">Date</th><th className="p-3 text-gray-700 dark:text-gray-300">Amount</th><th className="p-3 text-gray-700 dark:text-gray-300">Note</th>
                    </>
                  )}
                  {detailModal?.type === 'expenses' && (
                    <>
                      <th className="p-3 text-gray-700 dark:text-gray-300">Date</th><th className="p-3 text-gray-700 dark:text-gray-300">Category</th><th className="p-3 text-gray-700 dark:text-gray-300">Amount</th><th className="p-3 text-gray-700 dark:text-gray-300">Note</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {detailModal?.data.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {detailModal?.type === 'customers' && (
                      <>
                        <td className="p-3 text-gray-900 dark:text-white">{item.name}</td><td className="p-3 text-gray-900 dark:text-white">{item.phone}</td><td className="p-3 text-gray-900 dark:text-white">{formatDate(item.createdAt)}</td>
                      </>
                    )}
                    {detailModal?.type === 'sales' && (
                      <>
                        <td className="p-3 text-gray-900 dark:text-white">{item.invoiceNo}</td><td className="p-3 text-gray-900 dark:text-white">{item.customer?.name}</td><td className="p-3 text-gray-900 dark:text-white">{item.brand} {item.model}</td>
                        <td className="p-3 text-gray-900 dark:text-white">{formatCurrency(item.totalPrice, currencySymbol)}</td><td className="p-3 text-red-500">{formatCurrency(item.remainingBalance, currencySymbol)}</td>
                      </>
                    )}
                    {detailModal?.type === 'payments' && (
                      <>
                        <td className="p-3 text-gray-900 dark:text-white">{formatDate(item.date)}</td><td className="p-3 text-green-600 font-bold">{formatCurrency(item.amount, currencySymbol)}</td><td className="p-3 text-gray-900 dark:text-white">{item.note || '-'}</td>
                      </>
                    )}
                    {detailModal?.type === 'expenses' && (
                      <>
                        <td className="p-3 text-gray-900 dark:text-white">{formatDate(item.date)}</td><td className="p-3 text-gray-900 dark:text-white">{item.category}</td><td className="p-3 text-red-600 font-bold">{formatCurrency(item.amount, currencySymbol)}</td><td className="p-3 text-gray-900 dark:text-white">{item.note || '-'}</td>
                      </>
                    )}
                  </tr>
                ))}
                {detailModal?.data.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No data found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
