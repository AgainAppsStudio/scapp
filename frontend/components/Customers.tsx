import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, MessageCircle, History } from 'lucide-react';
import { useAppContext } from '../App';
import { Card, Button, Input, Modal, Badge, DateFilter } from './ui';
import { db } from '../services/db';
import { Customer, DateRangeFilter } from '../types';
import { shareToWhatsApp, formatCurrency, formatDate, getDateRange } from '../utils';

const Customers: React.FC = () => {
  const { t, customers, enrichedSales, refreshData } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', phone: '', whatsapp: '', nid: '', address: '', notes: '',
    guarantorName: '', guarantorPhone: '', guarantorNid: '', guarantorAddress: '', guarantorRelation: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const filteredCustomers = useMemo(() => {
    const s = search.toLowerCase();
    return customers.filter(c => 
      c.createdAt >= start && c.createdAt <= end &&
      (c.name.toLowerCase().includes(s) || 
      c.phone.includes(s) || 
      c.nid.includes(s))
    );
  }, [customers, search, start, end]);

  const customerHistory = useMemo(() => {
    if (!historyModal) return [];
    return enrichedSales.filter(s => s.customerId === historyModal.id);
  }, [historyModal, enrichedSales]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name, phone: customer.phone, whatsapp: customer.whatsapp || '',
        nid: customer.nid, address: customer.address, notes: customer.notes || '',
        guarantorName: customer.guarantorName || '',
        guarantorPhone: customer.guarantorPhone || '',
        guarantorNid: customer.guarantorNid || '',
        guarantorAddress: customer.guarantorAddress || '',
        guarantorRelation: customer.guarantorRelation || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ 
        name: '', phone: '', whatsapp: '', nid: '', address: '', notes: '',
        guarantorName: '', guarantorPhone: '', guarantorNid: '', guarantorAddress: '', guarantorRelation: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await db.customers.update(editingCustomer.id, formData);
      } else {
        await db.customers.add(formData);
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
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await db.customers.delete(id);
      await refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
            />
          </div>
          <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto gap-2">
          <Plus size={20} /> {t('addCustomer')}
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">{t('name')}</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Contact</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">NID</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Address</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="p-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline"><Phone size={14}/> {customer.phone}</a>
                    {customer.whatsapp && (
                      <button onClick={() => shareToWhatsApp(customer.whatsapp, 'Hello from Mobile Installment Manager')} className="flex items-center gap-1 text-sm text-green-600 hover:underline"><MessageCircle size={14}/> {customer.whatsapp}</button>
                    )}
                  </div>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-300">{customer.nid}</td>
                <td className="p-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{customer.address}</td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="ghost" onClick={() => setHistoryModal(customer)} className="p-2 text-blue-500 hover:text-blue-600" title="Payment History"><History size={18} /></Button>
                  <Button variant="ghost" onClick={() => handleOpenModal(customer)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><Edit2 size={18} /></Button>
                  <Button variant="ghost" onClick={() => handleDelete(customer.id)} className="p-2 text-red-500 hover:text-red-600"><Trash2 size={18} /></Button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Details</h3>
          </div>
          <Input label="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone Number" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <Input label="WhatsApp Number" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
          </div>
          <Input label="NID / Passport" required value={formData.nid} onChange={e => setFormData({...formData, nid: e.target.value})} />
          <Input label="Address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mt-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Guarantor Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Guarantor Name" value={formData.guarantorName} onChange={e => setFormData({...formData, guarantorName: e.target.value})} />
            <Input label="Relation" value={formData.guarantorRelation} onChange={e => setFormData({...formData, guarantorRelation: e.target.value})} />
            <Input label="Guarantor Phone" value={formData.guarantorPhone} onChange={e => setFormData({...formData, guarantorPhone: e.target.value})} />
            <Input label="Guarantor NID" value={formData.guarantorNid} onChange={e => setFormData({...formData, guarantorNid: e.target.value})} />
          </div>
          <Input label="Guarantor Address" value={formData.guarantorAddress} onChange={e => setFormData({...formData, guarantorAddress: e.target.value})} />

          <div className="w-full mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea 
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
              rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : t('save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!historyModal} onClose={() => setHistoryModal(null)} title={`Payment History: ${historyModal?.name}`} maxWidth="max-w-4xl">
        <div className="space-y-6">
          {customerHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sales or payment history found for this customer.</p>
          ) : (
            customerHistory.map(sale => (
              <div key={sale.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{sale.brand} {sale.model}</h4>
                    <p className="text-sm text-gray-500">Invoice: {sale.invoiceNo} | Date: {formatDate(sale.date)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'warning'}>{sale.status}</Badge>
                    <p className="text-sm font-bold text-red-500 mt-1">Due: {formatCurrency(sale.remainingBalance)}</p>
                  </div>
                </div>
                
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payments Made:</h5>
                {sale.payments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No payments recorded yet (excluding down payment).</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {sale.payments.map(p => (
                        <tr key={p.id}>
                          <td className="py-2 text-gray-900 dark:text-white">{formatDate(p.date)}</td>
                          <td className="py-2 text-green-600 font-medium">{formatCurrency(p.amount)}</td>
                          <td className="py-2 text-gray-500 dark:text-gray-400">{p.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
