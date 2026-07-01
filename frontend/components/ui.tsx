import React from 'react';
import { X, ArrowUpDown, Calendar } from 'lucide-react';
import { DateRangeFilter } from '../types';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white hover:bg-indigo-700 focus:ring-primary",
    secondary: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    ghost: "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
    outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({ label, error, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <input 
      className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white transition-colors ${error ? 'border-red-500' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: {value: string|number, label: string}[] }> = ({ label, options, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <select 
      className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white transition-colors ${className}`}
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{opt.label}</option>)}
    </select>
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print-hidden">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = ({ children, variant = 'default' }) => {
  const variants = {
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

export const SortableHeader: React.FC<{ label: string; field: string; currentSort: string; direction: 'asc'|'desc'; onSort: (field: string) => void }> = ({ label, field, currentSort, direction, onSort }) => (
  <th className="p-4 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onClick={() => onSort(field)}>
    <div className="flex items-center gap-1">
      {label}
      <ArrowUpDown size={14} className={currentSort === field ? 'text-primary' : 'text-gray-400 opacity-50'} />
    </div>
  </th>
);

export const DateFilter: React.FC<{ 
  filter: DateRangeFilter; 
  setFilter: (f: DateRangeFilter) => void;
  customStart?: number;
  setCustomStart?: (d: number) => void;
  customEnd?: number;
  setCustomEnd?: (d: number) => void;
}> = ({ filter, setFilter, customStart, setCustomStart, customEnd, setCustomEnd }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
      <Calendar size={16} className="text-gray-500 dark:text-gray-400 ml-2" />
      <select 
        value={filter} 
        onChange={(e) => setFilter(e.target.value as DateRangeFilter)}
        className="bg-transparent border-none text-sm focus:ring-0 text-gray-900 dark:text-white py-1 pr-8 cursor-pointer outline-none"
      >
        <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">All Time</option>
        <option value="today" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Today</option>
        <option value="week" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">This Week</option>
        <option value="month" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">This Month</option>
        <option value="year" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">This Year</option>
        <option value="custom" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Custom Range</option>
      </select>
    </div>
    {filter === 'custom' && setCustomStart && setCustomEnd && (
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
          onChange={e => setCustomStart(new Date(e.target.value).getTime())} 
        />
        <span className="text-gray-500 dark:text-gray-400">-</span>
        <input 
          type="date" 
          className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" 
          onChange={e => setCustomEnd(new Date(e.target.value).getTime())} 
        />
      </div>
    )}
  </div>
);
