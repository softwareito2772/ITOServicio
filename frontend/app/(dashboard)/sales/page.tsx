'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Loader2, X } from 'lucide-react';
import { salesAPI, clientsAPI, productsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SaleItem { product_id: number; quantity: number; unit_price: number; }
interface Sale { id: number; client: { id: number; name: string }; total: number; status: string; sale_date: string; items: any[]; created_at: string; }
interface Client { id: number; name: string; phone: string; }
interface Product { id: number; name: string; price: number; stock: number; }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([{ product_id: 0, quantity: 1, unit_price: 0 }]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [salesRes, clientsRes, prodsRes] = await Promise.all([
        salesAPI.getAll(), clientsAPI.getAll(), productsAPI.getAll(),
      ]);
      setSales(salesRes.data); setClients(clientsRes.data); setProducts(prodsRes.data);
    } catch (error) { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleAddItem = () => setItems([...items, { product_id: 0, quantity: 1, unit_price: 0 }]);

  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'product_id') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) newItems[index].unit_price = product.price;
    }
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.some(i => !i.product_id)) { toast.error('Completa todos los campos'); return; }
    try {
      await salesAPI.create({ client_id: parseInt(clientId), items: items.filter(i => i.product_id), notes: notes || undefined });
      toast.success('Venta registrada'); setShowModal(false); resetForm(); loadData();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error al guardar');
      }
    }
  };

  const resetForm = () => { setItems([{ product_id: 0, quantity: 1, unit_price: 0 }]); setClientId(''); setNotes(''); };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800">Ventas</h1><p className="text-gray-500">Registro de ventas</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={20} /> Nueva Venta</button>
      </div>

      <div className="card">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
         : sales.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No hay ventas registradas</p></div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Cliente</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Fecha</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Estado</th>
              </tr></thead>
              <tbody>{sales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">#{sale.id}</td>
                  <td className="py-3 px-4">{sale.client?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(sale.sale_date)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary">{formatCurrency(sale.total)}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${sale.status === 'completed' ? 'bg-success/20 text-successDark' : 'bg-warning/20 text-warningDark'}`}>{sale.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Nueva Venta</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className="input-field" required>
                  <option value="">Seleccionar cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Productos</label>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select value={item.product_id} onChange={e => handleItemChange(index, 'product_id', e.target.value)} className="input-field flex-1" required>
                      <option value="">Producto</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
                    </select>
                    <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="input-field w-20" />
                    <input type="number" step="0.01" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} className="input-field w-28" />
                    {items.length > 1 && <button type="button" onClick={() => handleRemoveItem(index)} className="text-danger">✕</button>}
                  </div>
                ))}
                <button type="button" onClick={handleAddItem} className="text-sm text-primary hover:underline">+ Agregar producto</button>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Registrar Venta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
