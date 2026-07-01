import React, { useState, useMemo } from 'react';
import { Plus, Search, Receipt } from 'lucide-react';
import { useAppContext } from '../App';
import { Card, Button, Input, Select, Modal, Badge, DateFilter } from './ui';
import { db } from '../services/db';
import { formatCurrency, formatDate, getDateRange } from '../utils';
import { DateRangeFilter } from '../types';

const Payments: React.FC = () => {
  const { t, payments, enrichedSales, refreshData } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    saleId: '', date: new Date().toISOString().split('T')[0], amount: 0, note: ''
  });

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const activeSales = enrichedSales.filter(s => s.status === 'ACTIVE');
  const selectedSale = activeSales.find(s => s.id === formData.saleId);

  const filteredPayments = useMemo(() => {
    const s = search.toLowerCase();
    return payments.map(p => {
      const sale = enrichedSales.find(sale => sale.id === p.saleId);
      return { ...p, sale };
    }).filter(p => 
      p.date >= start && p.date <= end &&
      (p.sale?.invoiceNo.toLowerCase().includes(s) || 
      p.sale?.customer?.name.toLowerCase().includes(s))
    );
  }, [payments, enrichedSales, search, start, end]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    if (formData.amount > selectedSale.remainingBalance) {
      alert("Payment amount cannot exceed remaining balance.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await db.payments.add({
        saleId: formData.saleId,
        date: new Date(formData.date).getTime(),
        amount: formData.amount,
        note: formData.note
      });
      await refreshData();
      setIsModalOpen(false);
      setFormData({ saleId: '', date: new Date().toISOString().split('T')[0], amount: 0, note: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
            />
          </div>
          <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto gap-2">
          <Plus size={20} /> {t('addPayment')}
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Invoice & Customer</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPayments.map(payment => (
              <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="p-4 text-gray-900 dark:text-white">{formatDate(payment.date)}</td>
                <td className="p-4">
                  <p className="font-medium text-gray-900 dark:text-white">{payment.sale?.invoiceNo}</p>
                  <p className="text-sm text-gray-500">{payment.sale?.customer?.name}</p>
                </td>
                <td className="p-4 font-bold text-green-600">{formatCurrency(payment.amount)}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{payment.note || '-'}</td>
              </tr>
            ))}
            {filteredPayments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No payments found.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Collect Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select 
            label="Select Active Sale" required value={formData.saleId} onChange={e => setFormData({...formData, saleId: e.target.value})}
            options={[{value: '', label: 'Select...'}, ...activeSales.map(s => ({value: s.id, label: `${s.invoiceNo} - ${s.customer?.name} (Due: ${formatCurrency(s.remainingBalance)})`}))]}
          />
          
          {selectedSale && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Total Due:</span> <span className="font-bold text-red-500">{formatCurrency(selectedSale.remainingBalance)}</span></div>
              <div><span className="text-gray-500">Monthly EMI:</span> <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedSale.schedule[0]?.expectedAmount || 0)}</span></div>
            </div>
          )}

          <Input type="date" label="Payment Date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          <Input type="number" label="Amount" required min={1} max={selectedSale?.remainingBalance || 999999} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
          <Input label="Note (Optional)" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={isSubmitting || !formData.saleId}>{isSubmitting ? 'Processing...' : 'Confirm Payment'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Payments;
