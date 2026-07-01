import { Sale, Payment, InstallmentSchedule, SaleWithDetails, Customer, DateRangeFilter } from './types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(timestamp));
};

export const generateInvoiceNo = (): string => {
  const date = new Date();
  const prefix = 'INV';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
};

export const calculateSchedule = (sale: Sale, payments: Payment[]): InstallmentSchedule[] => {
  const principal = sale.totalPrice - sale.downPayment;
  const monthlyAmount = sale.months > 0 ? principal / sale.months : 0;
  let totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const schedule: InstallmentSchedule[] = [];
  const saleDate = new Date(sale.date);
  const today = new Date().getTime();

  for (let i = 1; i <= sale.months; i++) {
    const dueDate = new Date(saleDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const dueTimestamp = dueDate.getTime();
    
    let paidForThisMonth = 0;
    let status: InstallmentSchedule['status'] = 'UPCOMING';

    if (totalPaid >= monthlyAmount) {
      paidForThisMonth = monthlyAmount;
      totalPaid -= monthlyAmount;
      status = 'PAID';
    } else if (totalPaid > 0) {
      paidForThisMonth = totalPaid;
      totalPaid = 0;
      status = dueTimestamp < today ? 'OVERDUE' : 'PARTIAL';
    } else {
      status = dueTimestamp < today ? 'OVERDUE' : (dueTimestamp - today < 7 * 24 * 60 * 60 * 1000 ? 'DUE' : 'UPCOMING');
    }

    schedule.push({
      monthIndex: i,
      dueDate: dueTimestamp,
      expectedAmount: monthlyAmount,
      paidAmount: paidForThisMonth,
      status
    });
  }

  return schedule;
};

export const enrichSaleData = (sale: Sale, customers: Customer[], payments: Payment[]): SaleWithDetails => {
  const customer = customers.find(c => c.id === sale.customerId);
  const salePayments = payments.filter(p => p.saleId === sale.id).sort((a, b) => b.date - a.date);
  const schedule = calculateSchedule(sale, salePayments);
  
  const totalPaid = sale.downPayment + salePayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = sale.totalPrice - totalPaid;
  const principal = sale.totalPrice - sale.downPayment;
  const monthlyInstallment = sale.months > 0 ? principal / sale.months : 0;
  
  const nextDue = schedule.find(s => s.status !== 'PAID');
  const status = remainingBalance <= 0 ? 'COMPLETED' : 'ACTIVE';

  return {
    ...sale,
    customer,
    payments: salePayments,
    schedule,
    totalPaid,
    remainingBalance,
    monthlyInstallment,
    nextDueDate: nextDue?.dueDate,
    status
  };
};

export const exportToCSV = (filename: string, rows: string[][]) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const shareToWhatsApp = (phone: string, text: string) => {
  const formattedPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

export const getDateRange = (filter: DateRangeFilter, customStart?: number, customEnd?: number): { start: number, end: number } => {
  const now = new Date();
  let start = 0;
  let end = now.getTime() + 86400000; // Include today fully

  switch (filter) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      break;
    case 'week':
      const firstDay = now.getDate() - now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), firstDay).getTime();
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1).getTime();
      break;
    case 'custom':
      start = customStart || 0;
      end = customEnd ? customEnd + 86400000 : now.getTime() + 86400000;
      break;
    case 'all':
    default:
      start = 0;
      break;
  }
  return { start, end };
};
