import React, { useState, useMemo } from 'react';
import { Plus, Search, Printer, Share2, Eye } from 'lucide-react';
import { useAppContext } from '../App';
import { Card, Button, Input, Select, Modal, Badge, DateFilter } from './ui';
import { db } from '../services/db';
import { formatCurrency, formatDate, generateInvoiceNo, shareToWhatsApp, getDateRange } from '../utils';
import { SaleWithDetails, DateRangeFilter } from '../types';

const Sales: React.FC = () => {
  const { t, enrichedSales, customers, devices, refreshData } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewSale, setViewSale] = useState<SaleWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm = {
    customerId: '', deviceId: '', date: new Date().toISOString().split('T')[0],
    brand: '', model: '', imei1: '', imei2: '', color: '', storage: '',
    totalPrice: 0, downPayment: 0, months: 6
  };
  const [formData, setFormData] = useState(initialForm);

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const filteredSales = useMemo(() => {
    const s = search.toLowerCase();
    return enrichedSales.filter(sale => 
      sale.date >= start && sale.date <= end &&
      (sale.invoiceNo.toLowerCase().includes(s) || 
      sale.customer?.name.toLowerCase().includes(s) ||
      sale.imei1.includes(s) ||
      sale.model.toLowerCase().includes(s))
    );
  }, [enrichedSales, search, start, end]);

  const selectedDevice = useMemo(() => {
    return devices.find(d => d.id === formData.deviceId);
  }, [devices, formData.deviceId]);

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      setFormData({ 
        ...formData, 
        deviceId, 
        brand: device.brand, 
        model: device.model, 
        totalPrice: device.unitPrice,
        imei1: device.imei1 || '',
        imei2: device.imei2 || '',
        color: device.color || '',
        storage: device.storage || ''
      });
    } else {
      setFormData({ 
        ...formData, 
        deviceId: '', 
        brand: '', 
        model: '', 
        totalPrice: 0,
        imei1: '',
        imei2: '',
        color: '',
        storage: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const device = devices.find(d => d.id === formData.deviceId);
      const profit = device ? formData.totalPrice - device.purchasePrice : 0;

      await db.sales.add({
        ...formData,
        date: new Date(formData.date).getTime(),
        invoiceNo: generateInvoiceNo(),
        profit
      });

      if (formData.deviceId && device) {
        await db.devices.update(formData.deviceId, { stock: device.stock - 1 });
      }

      await db.logs.add({ action: 'NEW_SALE', details: `Sale created for ${formData.brand} ${formData.model}`, timestamp: Date.now() });
      await refreshData();
      setIsModalOpen(false);
      setFormData(initialForm);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = (sale: SaleWithDetails) => {
    if (!sale.customer?.whatsapp) return alert("Customer has no WhatsApp number.");
    const text = `*Invoice:* ${sale.invoiceNo}\n*Model:* ${sale.brand} ${sale.model}\n*Total:* ${formatCurrency(sale.totalPrice)}\n*Due:* ${formatCurrency(sale.remainingBalance)}`;
    shareToWhatsApp(sale.customer.whatsapp, text);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hidden">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
            />
          </div>
          <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto gap-2">
          <Plus size={20} /> {t('addSale')}
        </Button>
      </div>

      <Card className="overflow-x-auto print-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">{t('invoice')}</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Customer</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Device</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Financials</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSales.map(sale => (
              <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="p-4">
                  <p className="font-medium text-gray-900 dark:text-white">{sale.invoiceNo}</p>
                  <p className="text-xs text-gray-500">{formatDate(sale.date)}</p>
                </td>
                <td className="p-4 font-medium text-gray-900 dark:text-white">{sale.customer?.name}</td>
                <td className="p-4">
                  <p className="text-gray-900 dark:text-white">{sale.brand} {sale.model}</p>
                  <p className="text-xs text-gray-500">IMEI: {sale.imei1}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm text-gray-900 dark:text-white">Total: {formatCurrency(sale.totalPrice)}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">EMI: {formatCurrency(sale.monthlyInstallment)}/mo</p>
                  <p className="text-sm font-bold text-red-500">Due: {formatCurrency(sale.remainingBalance)}</p>
                </td>
                <td className="p-4">
                  <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'warning'}>{sale.status}</Badge>
                </td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="ghost" onClick={() => setViewSale(sale)} className="p-2"><Eye size={18} /></Button>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No sales found.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Mobile Sale" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select 
              label="Customer" required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}
              options={[{value: '', label: 'Select Customer'}, ...customers.map(c => ({value: c.id, label: `${c.name} (${c.phone})`}))]}
            />
            <Input type="date" label="Sale Date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            
            <Select 
              label="Select from Inventory (Optional)" value={formData.deviceId} onChange={e => handleDeviceSelect(e.target.value)}
              options={[{value: '', label: 'Manual Entry'}, ...devices.filter(d => d.stock > 0).map(d => ({value: d.id, label: `${d.brand} ${d.model} (Stock: ${d.stock})`}))]}
            />
            <div className="hidden sm:block"></div>

            <Input label="Brand" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} disabled={!!selectedDevice} />
            <Input label="Model" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} disabled={!!selectedDevice} />
            
            <Input label="IMEI 1" required value={formData.imei1} onChange={e => setFormData({...formData, imei1: e.target.value})} disabled={!!selectedDevice?.imei1} />
            <Input label="IMEI 2 (Optional)" value={formData.imei2} onChange={e => setFormData({...formData, imei2: e.target.value})} disabled={!!selectedDevice?.imei2} />
            
            <Input label="Color" required value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} disabled={!!selectedDevice?.color} />
            <Input label="RAM/Storage" required placeholder="e.g. 8GB/128GB" value={formData.storage} onChange={e => setFormData({...formData, storage: e.target.value})} disabled={!!selectedDevice?.storage} />
            
            <Input type="number" label="Total Price" required min={0} value={formData.totalPrice || ''} onChange={e => setFormData({...formData, totalPrice: Number(e.target.value)})} disabled={!!selectedDevice} />
            <Input type="number" label="Down Payment" required min={0} max={formData.totalPrice} value={formData.downPayment || ''} onChange={e => setFormData({...formData, downPayment: Number(e.target.value)})} />
            
            <Input type="number" label="Installment Duration (Months)" required min={1} value={formData.months || ''} onChange={e => setFormData({...formData, months: Number(e.target.value)})} />
          </div>
          
          {formData.totalPrice > 0 && formData.months > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">Principal Amount: {formatCurrency(formData.totalPrice - formData.downPayment)}</p>
              <p className="font-bold text-blue-900 dark:text-blue-200">Monthly Installment: {formatCurrency((formData.totalPrice - formData.downPayment) / formData.months)}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : t('save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title="Invoice Details">
        {viewSale && (
          <div className="space-y-6">
            <div className="flex justify-end gap-2 print-hidden">
              <Button variant="secondary" onClick={() => handleShare(viewSale)}><Share2 size={18} className="mr-2"/> Share</Button>
              <Button onClick={() => window.print()}><Printer size={18} className="mr-2"/> Print</Button>
            </div>
            
            <div className="print-only:block bg-white p-8 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 dark:text-white">Invoice</h2>
                <p className="text-gray-500 dark:text-gray-400">{viewSale.invoiceNo}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Customer Details:</h4>
                  <p className="text-gray-900 dark:text-gray-300">{viewSale.customer?.name}</p>
                  <p className="text-gray-900 dark:text-gray-300">{viewSale.customer?.phone}</p>
                  <p className="text-gray-900 dark:text-gray-300">{viewSale.customer?.address}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Sale Details:</h4>
                  <p className="text-gray-900 dark:text-gray-300">Date: {formatDate(viewSale.date)}</p>
                  <p className="text-gray-900 dark:text-gray-300">Device: {viewSale.brand} {viewSale.model}</p>
                  <p className="text-gray-900 dark:text-gray-300">IMEI: {viewSale.imei1}</p>
                </div>
              </div>

              <table className="w-full mb-8 border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 text-gray-900 dark:text-white">Description</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 text-gray-900 dark:text-gray-300">Total Price</td>
                    <td className="text-right py-2 text-gray-900 dark:text-gray-300">{formatCurrency(viewSale.totalPrice)}</td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 text-gray-900 dark:text-gray-300">Down Payment</td>
                    <td className="text-right py-2 text-green-600 dark:text-green-400">-{formatCurrency(viewSale.downPayment)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2 text-gray-900 dark:text-white">Remaining Balance</td>
                    <td className="text-right py-2 text-red-600 dark:text-red-400">{formatCurrency(viewSale.remainingBalance)}</td>
                  </tr>
                </tbody>
              </table>

              <div>
                <h4 className="font-bold mb-4 text-gray-900 dark:text-white">Installment Schedule</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {viewSale.schedule.map((sch, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="font-medium text-gray-900 dark:text-white">Month {sch.monthIndex}</p>
                      <p className="text-gray-500 dark:text-gray-400">{formatDate(sch.dueDate)}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(sch.expectedAmount)}</p>
                      <Badge variant={sch.status === 'PAID' ? 'success' : sch.status === 'OVERDUE' ? 'danger' : 'default'}>{sch.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Sales;
