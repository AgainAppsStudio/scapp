import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, Printer, FileText, Search } from 'lucide-react';
import { useAppContext } from '../App';
import { Card, Button, DateFilter, Modal } from './ui';
import { formatCurrency, formatDate, exportToCSV, getDateRange } from '../utils';
import { DateRangeFilter } from '../types';

const Reports: React.FC = () => {
  const { enrichedSales, payments, expenses, currencySymbol } = useAppContext();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [previewModal, setPreviewModal] = useState<{ title: string, type: string, data: any[] } | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalDateFilter, setModalDateFilter] = useState<DateRangeFilter>('all');
  const [modalCustomStart, setModalCustomStart] = useState<number>(0);
  const [modalCustomEnd, setModalCustomEnd] = useState<number>(Date.now());

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);
  const { start: modalStart, end: modalEnd } = getDateRange(modalDateFilter, modalCustomStart, modalCustomEnd);

  const filteredSales = useMemo(() => {
    return enrichedSales.filter(s => s.date >= start && s.date <= end);
  }, [enrichedSales, start, end]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => p.date >= start && p.date <= end);
  }, [payments, start, end]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= start && e.date <= end);
  }, [expenses, start, end]);

  const handleExportDueCustomers = () => {
    const rows = [
      ["Invoice No", "Customer Name", "Phone", "Total Price", "Paid", "Remaining Due", "Status", "Date"]
    ];
    filteredSales.filter(s => s.status === 'ACTIVE').forEach(s => {
      rows.push([
        s.invoiceNo, s.customer?.name || '', s.customer?.phone || '',
        s.totalPrice.toString(), s.totalPaid.toString(), s.remainingBalance.toString(), s.status, formatDate(s.date)
      ]);
    });
    exportToCSV("Due_Customers_Report", rows);
  };

  const handleExportPayments = () => {
    const rows = [
      ["Date", "Invoice No", "Customer", "Amount", "Note"]
    ];
    filteredPayments.forEach(p => {
      const sale = enrichedSales.find(s => s.id === p.saleId);
      rows.push([
        formatDate(p.date), sale?.invoiceNo || '', sale?.customer?.name || '',
        p.amount.toString(), p.note || ''
      ]);
    });
    exportToCSV("Payments_Report", rows);
  };

  const handleExportExpenses = () => {
    const rows = [
      ["Date", "Category", "Amount", "Note"]
    ];
    filteredExpenses.forEach(e => {
      rows.push([
        formatDate(e.date), e.category, e.amount.toString(), e.note || ''
      ]);
    });
    exportToCSV("Expenses_Report", rows);
  };

  const handleExportProfitLoss = () => {
    const totalCollection = filteredPayments.reduce((sum, p) => sum + p.amount, 0) + filteredSales.reduce((sum, s) => sum + s.downPayment, 0);
    const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalCollection - totalExpensesAmount;

    const rows = [
      ["Metric", "Amount"],
      ["Total Collection", totalCollection.toString()],
      ["Total Expenses", totalExpensesAmount.toString()],
      ["Net Profit/Loss", netProfit.toString()]
    ];
    exportToCSV("Profit_Loss_Report", rows);
  };

  const filteredModalData = useMemo(() => {
    if (!previewModal) return [];
    const s = modalSearch.toLowerCase();
    
    let data = previewModal.data;

    // Apply date filter within the modal
    if (previewModal.type === 'due') {
      data = data.filter((item: any) => item.date >= modalStart && item.date <= modalEnd);
    } else if (previewModal.type === 'payments' || previewModal.type === 'expenses') {
      data = data.filter((item: any) => item.date >= modalStart && item.date <= modalEnd);
    }

    // Apply search filter
    if (previewModal.type === 'due') {
      return data.filter((item: any) => 
        item.invoiceNo.toLowerCase().includes(s) || 
        item.customer?.name.toLowerCase().includes(s)
      );
    }
    if (previewModal.type === 'payments') {
      return data.filter((item: any) => {
        const sale = enrichedSales.find(sale => sale.id === item.saleId);
        return sale?.invoiceNo.toLowerCase().includes(s) || 
               sale?.customer?.name.toLowerCase().includes(s);
      });
    }
    if (previewModal.type === 'expenses') {
      return data.filter((item: any) => 
        item.category.toLowerCase().includes(s) || 
        (item.note && item.note.toLowerCase().includes(s))
      );
    }
    return data;
  }, [previewModal, modalSearch, modalStart, modalEnd, enrichedSales]);

  const openModal = (title: string, type: string, data: any[]) => {
    setModalSearch('');
    setModalDateFilter('all');
    setPreviewModal({ title, type, data });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export Reports</h2>
        <DateFilter 
          filter={dateFilter} 
          setFilter={setDateFilter} 
          customStart={customStart} 
          setCustomStart={setCustomStart} 
          customEnd={customEnd} 
          setCustomEnd={setCustomEnd} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Due Customers</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active installments and remaining balances.</p>
          </div>
          <div className="w-full flex gap-2 mt-4">
            <Button onClick={() => openModal('Due Customers Report', 'due', enrichedSales.filter(s => s.status === 'ACTIVE'))} variant="outline" className="flex-1 gap-2">
              <FileText size={18} /> View
            </Button>
            <Button onClick={handleExportDueCustomers} className="flex-1 gap-2">
              <Download size={18} /> CSV
            </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Payments</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete history of all payments collected.</p>
          </div>
          <div className="w-full flex gap-2 mt-4">
            <Button onClick={() => openModal('Payments Report', 'payments', payments)} variant="outline" className="flex-1 gap-2">
              <FileText size={18} /> View
            </Button>
            <Button onClick={handleExportPayments} className="flex-1 gap-2">
              <Download size={18} /> CSV
            </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Expenses</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete history of all expenses recorded.</p>
          </div>
          <div className="w-full flex gap-2 mt-4">
            <Button onClick={() => openModal('Expenses Report', 'expenses', expenses)} variant="outline" className="flex-1 gap-2">
              <FileText size={18} /> View
            </Button>
            <Button onClick={handleExportExpenses} className="flex-1 gap-2">
              <Download size={18} /> CSV
            </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profit & Loss</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Summary of collections vs expenses.</p>
          </div>
          <div className="w-full flex gap-2 mt-4">
            <Button onClick={() => openModal('Profit & Loss Report', 'profitloss', [])} variant="outline" className="flex-1 gap-2">
              <FileText size={18} /> View
            </Button>
            <Button onClick={handleExportProfitLoss} className="flex-1 gap-2">
              <Download size={18} /> CSV
            </Button>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={!!previewModal} onClose={() => setPreviewModal(null)} title={previewModal?.title || ''} maxWidth="max-w-5xl">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hidden">
            {previewModal?.type !== 'profitloss' && (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" placeholder="Search..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
                  />
                </div>
                <DateFilter 
                  filter={modalDateFilter} 
                  setFilter={setModalDateFilter} 
                  customStart={modalCustomStart} 
                  setCustomStart={setModalCustomStart} 
                  customEnd={modalCustomEnd} 
                  setCustomEnd={setModalCustomEnd} 
                />
              </div>
            )}
            <Button onClick={handlePrint} variant="outline" className="gap-2 ml-auto"><Printer size={16}/> Print / Save PDF</Button>
          </div>
          
          <div className="overflow-x-auto print-only:block bg-white dark:bg-gray-900 p-4 rounded-lg">
            <div className="print-only:block mb-6 text-center hidden">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{previewModal?.title}</h2>
              <p className="text-gray-500 dark:text-gray-400">Generated on {formatDate(Date.now())}</p>
            </div>

            {previewModal?.type === 'profitloss' ? (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-3 text-gray-700 dark:text-gray-300">Metric</th>
                    <th className="p-3 text-gray-700 dark:text-gray-300 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 text-gray-900 dark:text-white">Total Collection</td>
                    <td className="p-3 text-gray-900 dark:text-white text-right">{formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0) + filteredSales.reduce((sum, s) => sum + s.downPayment, 0), currencySymbol)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 text-gray-900 dark:text-white">Total Expenses</td>
                    <td className="p-3 text-red-600 dark:text-red-400 text-right">-{formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0), currencySymbol)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 font-bold">
                    <td className="p-3 text-gray-900 dark:text-white">Net Profit/Loss</td>
                    <td className={`p-3 text-right ${filteredPayments.reduce((sum, p) => sum + p.amount, 0) + filteredSales.reduce((sum, s) => sum + s.downPayment, 0) - filteredExpenses.reduce((sum, e) => sum + e.amount, 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0) + filteredSales.reduce((sum, s) => sum + s.downPayment, 0) - filteredExpenses.reduce((sum, e) => sum + e.amount, 0), currencySymbol)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    {previewModal?.type === 'due' && (
                      <>
                        <th className="p-3 text-gray-700 dark:text-gray-300">Invoice</th><th className="p-3 text-gray-700 dark:text-gray-300">Customer</th><th className="p-3 text-gray-700 dark:text-gray-300">Total</th><th className="p-3 text-gray-700 dark:text-gray-300">Due</th><th className="p-3 text-gray-700 dark:text-gray-300">Date</th>
                      </>
                    )}
                    {previewModal?.type === 'payments' && (
                      <>
                        <th className="p-3 text-gray-700 dark:text-gray-300">Date</th><th className="p-3 text-gray-700 dark:text-gray-300">Invoice</th><th className="p-3 text-gray-700 dark:text-gray-300">Amount</th><th className="p-3 text-gray-700 dark:text-gray-300">Note</th>
                      </>
                    )}
                    {previewModal?.type === 'expenses' && (
                      <>
                        <th className="p-3 text-gray-700 dark:text-gray-300">Date</th><th className="p-3 text-gray-700 dark:text-gray-300">Category</th><th className="p-3 text-gray-700 dark:text-gray-300">Amount</th><th className="p-3 text-gray-700 dark:text-gray-300">Note</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredModalData.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {previewModal?.type === 'due' && (
                        <>
                          <td className="p-3 text-gray-900 dark:text-white">{item.invoiceNo}</td><td className="p-3 text-gray-900 dark:text-white">{item.customer?.name}</td><td className="p-3 text-gray-900 dark:text-white">{formatCurrency(item.totalPrice, currencySymbol)}</td><td className="p-3 text-red-500">{formatCurrency(item.remainingBalance, currencySymbol)}</td><td className="p-3 text-gray-900 dark:text-white">{formatDate(item.date)}</td>
                        </>
                      )}
                      {previewModal?.type === 'payments' && (
                        <>
                          <td className="p-3 text-gray-900 dark:text-white">{formatDate(item.date)}</td><td className="p-3 text-gray-900 dark:text-white">{enrichedSales.find(s => s.id === item.saleId)?.invoiceNo}</td><td className="p-3 text-green-600 font-bold">{formatCurrency(item.amount, currencySymbol)}</td><td className="p-3 text-gray-900 dark:text-white">{item.note || '-'}</td>
                        </>
                      )}
                      {previewModal?.type === 'expenses' && (
                        <>
                          <td className="p-3 text-gray-900 dark:text-white">{formatDate(item.date)}</td><td className="p-3 text-gray-900 dark:text-white">{item.category}</td><td className="p-3 text-red-600 font-bold">{formatCurrency(item.amount, currencySymbol)}</td><td className="p-3 text-gray-900 dark:text-white">{item.note || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {filteredModalData.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No data found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;
