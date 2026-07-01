export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  nid: string;
  address: string;
  photoUrl?: string;
  notes?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorNid?: string;
  guarantorAddress?: string;
  guarantorRelation?: string;
  createdAt: number;
}

export interface Device {
  id: string;
  brand: string;
  model: string;
  imei1?: string;
  imei2?: string;
  color?: string;
  storage?: string;
  stock: number;
  unitPrice: number;
  purchasePrice: number;
  barcode?: string;
  createdAt: number;
}

export interface Sale {
  id: string;
  customerId: string;
  deviceId?: string;
  invoiceNo: string;
  date: number; // timestamp
  brand: string;
  model: string;
  imei1: string;
  imei2?: string;
  color: string;
  storage: string;
  totalPrice: number;
  downPayment: number;
  months: number;
  profit?: number;
  createdAt: number;
}

export interface Payment {
  id: string;
  saleId: string;
  date: number; // timestamp
  amount: number;
  note?: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: number;
  note: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface InstallmentSchedule {
  monthIndex: number;
  dueDate: number;
  expectedAmount: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE' | 'UPCOMING';
}

export interface SaleWithDetails extends Sale {
  customer?: Customer;
  payments: Payment[];
  schedule: InstallmentSchedule[];
  totalPaid: number;
  remainingBalance: number;
  monthlyInstallment: number;
  nextDueDate?: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export type Language = 'en' | 'bn';
export type Theme = 'light' | 'dark';
export type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
