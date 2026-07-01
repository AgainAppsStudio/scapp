import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { User, Language, Theme, Customer, Sale, Payment, SaleWithDetails, Device, Expense, ActivityLog } from './types';
import { TRANSLATIONS } from './constants';
import { db, auth, setDbUser } from './services/db';
import { enrichSaleData } from './utils';

import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Payments from './components/Payments';
import Expenses from './components/Expenses';
import Analytics from './components/Analytics';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Auth from './components/Auth';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  devices: Device[];
  expenses: Expense[];
  logs: ActivityLog[];
  enrichedSales: SaleWithDetails[];
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const savedLang = localStorage.getItem('language') as Language || 'en';
    setLanguage(savedLang);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setDbUser(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || 'https://picsum.photos/200/200'
        });
      } else {
        setDbUser(null);
        setUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [c, s, p, d, e, l] = await Promise.all([
        db.customers.getAll(),
        db.sales.getAll(),
        db.payments.getAll(),
        db.devices.getAll(),
        db.expenses.getAll(),
        db.logs.getAll()
      ]);
      setCustomers(c);
      setSales(s);
      setPayments(p);
      setDevices(d);
      setExpenses(e);
      setLogs(l);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const enrichedSales = useMemo(() => {
    return sales.map(sale => enrichSaleData(sale, customers, payments));
  }, [sales, customers, payments]);

  const t = (key: string): string => TRANSLATIONS[language][key] || key;

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleSetLanguage = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const contextValue: AppContextType = {
    user, setUser,
    language, setLanguage: handleSetLanguage,
    theme, setTheme: handleSetTheme,
    t,
    customers, sales, payments, devices, expenses, logs, enrichedSales,
    refreshData, isLoading
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <AppContext.Provider value={contextValue}>
        <Auth />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
