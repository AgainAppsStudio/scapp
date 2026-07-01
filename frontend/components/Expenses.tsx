import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Download, Wallet } from 'lucide-react';
import { useAppContext } from '../App';
import { Card, Button, Input, Select, Modal, DateFilter } from './ui';
import { db } from '../services/db';
import { Expense, DateRangeFilter } from '../types';
import { formatCurrency, formatDate, getDateRange, exportToCSV } from '../utils';

const Expenses: React.FC = () => {
  const { expenses, refreshData } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('month');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormData = {
    category: 'Rent',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    note: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const filteredExpenses = useMemo(() => {
    const s = search.toLowerCase();
    return expenses.filter(e => 
      e.date >= start && e.date <= end &&
      (e.category.toLowerCase().includes(s) || 
      e.note.toLowerCase().includes(s))
    );
  }, [expenses, search, start, end]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.category,
        amount: expense.amount,
        date: new Date(expense.date).toISOString().split('T')[0],
        note: expense.note
      });
    } else {
      setEditingExpense(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const expenseData = {
        category: formData.category,
        amount: formData.amount,
        date: new Date(formData.date).getTime(),
        note: formData.note
      };

      if (editingExpense) {
        await db.expenses.update(editingExpense.id, expenseData);
        await db.logs.add({ action: 'UPDATE_EXPENSE', details: `Updated expense: ${formData.category} - ${formatCurrency(formData.amount)}`, timestamp: Date.now() });
      } else {
        await db.expenses.add(expenseData);
        await db.logs.add({ action: 'ADD_EXPENSE', details: `Added expense: ${formData.category} - ${formatCurrency(formData.amount)}`, timestamp: Date.now() });
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await db.expenses.delete(id);
      await db.logs.add({ action: 'DELETE_EXPENSE', details: `Deleted an expense record`, timestamp: Date.now() });
      await refreshData();
    }
  };

  const handleExport = () => {
    const rows = [["Date", "Category", "Amount", "Note"]];
    filteredExpenses.forEach(e => {
      rows.push([
        formatDate(e.date),
        e.category,
        e.amount.toString(),
        e.note
      ]);
    });
    rows.push(["", "Total", totalExpenses.toString(), ""]);
    exportToCSV("Expenses_Report", rows);
  };

  const categories = [
    { value: 'Rent', label: 'Rent' },
    { value: 'Utilities', label: 'Utilities (Electricity, Internet, etc.)' },
    { value: 'Salary', label: 'Salary & Wages' },
    { value: 'Marketing', label: 'Marketing & Advertising' },
    { value: 'Maintenance', label: 'Maintenance & Repairs' },
    { value: 'Office Supplies', label: 'Office Supplies' },
    { value: 'Transportation', label: 'Transportation & Travel' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
            />
          </div>
          <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} className="gap-2"><Download size={18} /> Export</Button>
          <Button onClick={() => handleOpenModal()} className="gap-2"><Plus size={20} /> Add Expense</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1 flex flex-col justify-center items-center text-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 border-red-100 dark:border-red-800/30">
          <div className="w-16 h-16 bg-red-200 dark:bg-red-800/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <Wallet size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">For selected period</p>
        </Card>

        <Card className="md:col-span-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Note</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 text-gray-900 dark:text-white">{formatDate(expense.date)}</td>
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{expense.category}</td>
                  <td className="p-4 font-bold text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400 text-sm max-w-xs truncate">{expense.note || '-'}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="ghost" onClick={() => handleOpenModal(expense)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><Edit2 size={18} /></Button>
                    <Button variant="ghost" onClick={() => handleDelete(expense.id)} className="p-2 text-red-500 hover:text-red-600"><Trash2 size={18} /></Button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No expenses found for this period.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Edit Expense" : "Add New Expense"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select 
              label="Category" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
              options={categories}
            />
            <Input type="date" label="Date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <Input type="number" label="Amount" required min={1} value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note / Description</label>
            <textarea 
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
              rows={3} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}
              placeholder="What was this expense for?"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Expense'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
