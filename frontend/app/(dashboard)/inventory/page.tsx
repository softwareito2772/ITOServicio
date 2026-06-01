'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowDownToLine, ArrowUpFromLine, Package, History } from 'lucide-react';
import { inventoryAPI, productsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Movement {
  id: number;
  product_id: number;
  quantity: number;
  movement_type: string;
  reason?: string;
  created_at: string;
  product?: { id: number; name: string };
}

interface Product {
  id: number;
  name: string;
  stock: number;
  stock_min: number;
}

export default function InventoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ product_id: '', quantity: '1', movement_type: 'entrada', reason: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [movRes, prodsRes] = await Promise.all([
        inventoryAPI.getMovements(0, 100),
        productsAPI.getAll(),
      ]);
      setMovements(movRes.data);
      setProducts(prodsRes.data);
    } catch (error) {
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryAPI.createMovement({
        product_id: parseInt(formData.product_id),
        quantity: parseInt(formData.quantity),
        movement_type: formData.movement_type,
        reason: formData.reason || undefined,
      });
      toast.success('Movimiento registrado');
      setShowModal(false);
      setFormData({ product_id: '', quantity: '1', movement_type: 'entrada', reason: '' });
      loadData();
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="text-gray-500">Control de repuestos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <ArrowDownToLine size={20} /> Registrar Movimiento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <History size={20} /> Historial de Movimientos
          </h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="text-gray-500">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Producto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Tipo</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Cantidad</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-500">{formatDate(m.created_at)}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">{m.product?.name || `Producto #${m.product_id}`}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.movement_type === 'entrada' ? 'bg-success/20 text-successDark' : 'bg-danger/20 text-dangerDark'}`}>
                          {m.movement_type === 'entrada' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{m.quantity}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{m.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} /> Stock Actual
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {products.map((p) => (
              <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800">{p.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-2xl font-bold text-primary">{p.stock}</span>
                  <span className={`text-xs ${p.stock <= 1 ? 'text-dangerDark' : p.stock <= p.stock_min ? 'text-warningDark' : 'text-gray-500'}`}>
                    Mín: {p.stock_min}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Registrar Movimiento</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
                <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} className="input-field" required>
                  <option value="">Seleccionar producto</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento *</label>
                <select value={formData.movement_type} onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })} className="input-field">
                  <option value="entrada">Entrada (Compra de repuestos)</option>
                  <option value="salida">Salida (Uso en reparación)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
                <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="input-field" rows={2} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
