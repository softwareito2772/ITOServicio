'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Search, Trash2, Edit, Package, AlertTriangle } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const CATEGORIES = ['Repuesto', 'Herramienta', 'Consumible', 'Lubricante', 'Filtro', 'Neumático', 'Otro'];

export default function WorkshopInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', sku: '', category: 'Repuesto', current_stock: 0, min_stock: 5, unit_cost: 0, unit_price: 0, supplier: '' });

  useEffect(() => { loadData(); }, [search, categoryFilter, lowStockOnly]);

  const loadData = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        workshopAPI.getInventory({ search, category: categoryFilter, low_stock: lowStockOnly }),
        workshopAPI.getInventoryStats(),
      ]);
      setItems(itemsRes.data);
      setStats(statsRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    try {
      if (editingItem) {
        await workshopAPI.updateInventoryItem(editingItem.id, formData);
        toast.success('Actualizado');
      } else {
        await workshopAPI.createInventoryItem(formData);
        toast.success('Creado');
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', sku: '', category: 'Repuesto', current_stock: 0, min_stock: 5, unit_cost: 0, unit_price: 0, supplier: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally { setSaving(false); }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '', sku: item.sku || '', category: item.category || 'Repuesto', current_stock: item.current_stock, min_stock: item.min_stock, unit_cost: item.unit_cost, unit_price: item.unit_price, supplier: item.supplier || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este item?')) return;
    try { await workshopAPI.deleteInventoryItem(id); toast.success('Eliminado'); loadData(); }
    catch { toast.error('Error al eliminar'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario del Taller</h1>
          <p className="text-gray-500">{items.length} items registrados</p>
        </div>
        <button onClick={() => { setEditingItem(null); setFormData({ name: '', description: '', sku: '', category: 'Repuesto', current_stock: 0, min_stock: 5, unit_cost: 0, unit_price: 0, supplier: '' }); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Item
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total_items}</p>
            <p className="text-xs text-gray-500">Total Items</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-danger">{stats.low_stock_count}</p>
            <p className="text-xs text-gray-500">Stock Bajo</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-success">{formatCurrency(stats.total_value)}</p>
            <p className="text-xs text-gray-500">Valor Total</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-gray-700">{Object.keys(stats.categories).length}</p>
            <p className="text-xs text-gray-500">Categorías</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field sm:w-48">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setLowStockOnly(!lowStockOnly)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${lowStockOnly ? 'bg-danger/10 text-danger border border-danger/30' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
          <AlertTriangle size={16} /> Stock Bajo
        </button>
      </div>

      {showForm && (
        <div className="card p-4 sm:p-6">
          <h3 className="font-bold text-gray-800 mb-4">{editingItem ? 'Editar Item' : 'Nuevo Item'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
              <input type="number" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
              <input type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: parseInt(e.target.value) || 5})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario</label>
              <input type="number" step="0.01" value={formData.unit_cost} onChange={e => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
              <input type="number" step="0.01" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})} className="input-field" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Package size={16} />} {editingItem ? 'Actualizar' : 'Crear'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="btn-outline">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={`card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${item.current_stock <= item.min_stock ? 'border-l-4 border-danger' : ''}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">{item.name}</p>
                {item.current_stock <= item.min_stock && <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full">Stock Bajo</span>}
              </div>
              <p className="text-sm text-gray-500">{item.category} {item.sku && `· SKU: ${item.sku}`} {item.supplier && `· ${item.supplier}`}</p>
              <div className="flex gap-4 text-xs text-gray-400 mt-1">
                <span>Stock: <b className="text-gray-700">{item.current_stock}</b> (mín: {item.min_stock})</span>
                <span>Costo: {formatCurrency(item.unit_cost)}</span>
                <span>Precio: {formatCurrency(item.unit_price)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(item)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-gray-100 rounded-lg text-danger"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-500 py-8">No hay items en el inventario</p>}
      </div>
    </div>
  );
}
