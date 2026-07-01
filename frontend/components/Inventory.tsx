import React, { useState, useMemo } from 'react';
import { Plus, Search, PackagePlus, Download, Barcode, Edit2, Package, ShoppingCart, PlusCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../App';
import { Card, Button, Input, Modal, SortableHeader, Badge, DateFilter } from './ui';
import { db } from '../services/db';
import { Device, DateRangeFilter } from '../types';
import { formatCurrency, exportToCSV, getDateRange } from '../utils';

const Inventory: React.FC = () => {
  const { devices, sales, refreshData, currencySymbol } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStart, setCustomStart] = useState<number>(0);
  const [customEnd, setCustomEnd] = useState<number>(Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [stockModal, setStockModal] = useState<Device | null>(null);
  const [stockAddAmount, setStockAddAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Device, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const initialFormData = { 
    brand: '', model: '', imei1: '', imei2: '', color: '', storage: '', 
    stock: 0, unitPrice: 0, purchasePrice: 0, barcode: '' 
  };
  const [formData, setFormData] = useState(initialFormData);

  const { start, end } = getDateRange(dateFilter, customStart, customEnd);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key: key as keyof Device, direction });
  };

  const filteredAndSortedDevices = useMemo(() => {
    let result = devices.filter(d => 
      d.createdAt >= start && d.createdAt <= end &&
      (d.brand.toLowerCase().includes(search.toLowerCase()) || 
      d.model.toLowerCase().includes(search.toLowerCase()) ||
      d.barcode?.includes(search) ||
      d.imei1?.includes(search))
    );

    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [devices, search, sortConfig, start, end]);

  const chartData = useMemo(() => {
    const brandValues: Record<string, number> = {};
    filteredAndSortedDevices.forEach(d => {
      brandValues[d.brand] = (brandValues[d.brand] || 0) + (d.stock * d.unitPrice);
    });
    return Object.entries(brandValues).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredAndSortedDevices]);

  // Calculate Inventory Stats
  const totalAvailable = useMemo(() => devices.reduce((sum, d) => sum + d.stock, 0), [devices]);
  const totalSold = useMemo(() => sales.filter(s => s.deviceId).length, [sales]);
  const totalAdded = totalAvailable + totalSold;

  const handleOpenModal = (device?: Device) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        brand: device.brand, model: device.model, imei1: device.imei1 || '', imei2: device.imei2 || '',
        color: device.color || '', storage: device.storage || '', stock: device.stock,
        unitPrice: device.unitPrice, purchasePrice: device.purchasePrice, barcode: device.barcode || ''
      });
    } else {
      setEditingDevice(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingDevice) {
        await db.devices.update(editingDevice.id, formData);
        await db.logs.add({ action: 'UPDATE_DEVICE', details: `Updated ${formData.brand} ${formData.model}`, timestamp: Date.now() });
      } else {
        await db.devices.add(formData);
        await db.logs.add({ action: 'ADD_DEVICE', details: `Added ${formData.brand} ${formData.model}`, timestamp: Date.now() });
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModal || stockAddAmount <= 0) return;
    setIsSubmitting(true);
    try {
      await db.devices.update(stockModal.id, { stock: stockModal.stock + stockAddAmount });
      await db.logs.add({ action: 'ADD_STOCK', details: `Added ${stockAddAmount} units to ${stockModal.brand} ${stockModal.model}`, timestamp: Date.now() });
      await refreshData();
      setStockModal(null);
      setStockAddAmount(0);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const rows = [["Brand", "Model", "IMEI 1", "Color", "Storage", "Barcode", "Stock", "Purchase Price", "Unit Price", "Total Value"]];
    filteredAndSortedDevices.forEach(d => {
      rows.push([
        d.brand, d.model, d.imei1 || '', d.color || '', d.storage || '', d.barcode || '', 
        d.stock.toString(), d.purchasePrice.toString(), d.unitPrice.toString(), (d.stock * d.unitPrice).toString()
      ]);
    });
    exportToCSV("Inventory_Report", rows);
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="p-6 flex items-center gap-4">
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
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" placeholder="Search brand, model, IMEI..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
            />
          </div>
          <DateFilter filter={dateFilter} setFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} className="gap-2"><Download size={18} /> Export</Button>
          <Button onClick={() => handleOpenModal()} className="gap-2"><Plus size={20} /> Add Device</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Devices Added" value={totalAdded} icon={PlusCircle} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard title="Total Devices Sold" value={totalSold} icon={ShoppingCart} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard title="Total Devices Available" value={totalAvailable} icon={Package} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inventory Value by Brand</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: '#9ca3af' }} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [formatCurrency(value, currencySymbol), 'Value']} contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <SortableHeader label="Device" field="brand" currentSort={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                <SortableHeader label="Stock" field="stock" currentSort={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                <SortableHeader label="Unit Price" field="unitPrice" currentSort={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total Value</th>
                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedDevices.map(device => (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{device.brand} {device.model}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {device.storage && <span className="text-xs text-gray-500">{device.storage}</span>}
                      {device.color && <span className="text-xs text-gray-500">• {device.color}</span>}
                      {device.imei1 && <span className="text-xs text-gray-500">• IMEI: {device.imei1}</span>}
                    </div>
                    {device.barcode && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Barcode size={12}/> {device.barcode}</p>}
                  </td>
                  <td className="p-4">
                    <Badge variant={device.stock < 3 ? 'danger' : 'success'}>{device.stock} Units</Badge>
                  </td>
                  <td className="p-4 text-gray-900 dark:text-white">{formatCurrency(device.unitPrice, currencySymbol)}</td>
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{formatCurrency(device.stock * device.unitPrice, currencySymbol)}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button variant="ghost" onClick={() => handleOpenModal(device)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><Edit2 size={18} /></Button>
                    <Button variant="ghost" onClick={() => setStockModal(device)} className="p-2 text-primary hover:bg-primary/10"><PackagePlus size={18} /></Button>
                  </td>
                </tr>
              ))}
              {filteredAndSortedDevices.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No devices found.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDevice ? "Edit Device" : "Add New Device"} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Brand" required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
            <Input label="Model" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            
            <Input label="IMEI 1 (Optional)" value={formData.imei1} onChange={e => setFormData({...formData, imei1: e.target.value})} />
            <Input label="IMEI 2 (Optional)" value={formData.imei2} onChange={e => setFormData({...formData, imei2: e.target.value})} />
            
            <Input label="Color" required value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
            <Input label="RAM/Storage" required placeholder="e.g. 8GB/128GB" value={formData.storage} onChange={e => setFormData({...formData, storage: e.target.value})} />
            
            <Input type="number" label="Stock Quantity" required min={0} value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} disabled={!!editingDevice} />
            <Input label="Barcode (Optional)" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
            
            <Input type="number" label={`Purchase Price (${currencySymbol})`} required min={0} value={formData.purchasePrice || ''} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
            <Input type="number" label={`Selling Unit Price (${currencySymbol})`} required min={0} value={formData.unitPrice || ''} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Device'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!stockModal} onClose={() => setStockModal(null)} title="Add Stock">
        <form onSubmit={handleAddStock} className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <p className="font-medium text-gray-900 dark:text-white">{stockModal?.brand} {stockModal?.model}</p>
            <p className="text-sm text-gray-500">Current Stock: {stockModal?.stock}</p>
          </div>
          <Input type="number" label="Quantity to Add" required min={1} value={stockAddAmount || ''} onChange={e => setStockAddAmount(Number(e.target.value))} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setStockModal(null)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || stockAddAmount <= 0}>{isSubmitting ? 'Updating...' : 'Update Stock'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
