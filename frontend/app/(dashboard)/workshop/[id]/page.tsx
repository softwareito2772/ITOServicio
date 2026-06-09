'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Save, CheckCircle, X, Download, Clock, Wrench, Car } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Proceso' },
  { value: 'waiting_parts', label: 'Esperando Piezas' },
  { value: 'completed', label: 'Listo' },
  { value: 'delivered', label: 'Entregado' },
];

const CHECKLIST_CATEGORIES: Record<string, string> = {
  motor: 'Motor', frenos: 'Frenos', llantas: 'Llantas', luces: 'Luces',
  suspension: 'Suspensión', electrico: 'Eléctrico', transmision: 'Transmisión',
  general: 'General', carga: 'Carga'
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => { loadOrder(); }, [id]);

  const loadOrder = async () => {
    try {
      const res = await workshopAPI.getOrder(parseInt(id));
      setOrder(res.data);
      setEditData({
        status: res.data.status,
        diagnosis: res.data.diagnosis || '',
        solution: res.data.solution || '',
        mechanic_observations: res.data.mechanic_observations || '',
        recommendations: res.data.recommendations || '',
        urgent_issues: res.data.urgent_issues || '',
        cost_labor: res.data.cost_labor?.toString() || '0',
        exit_km: res.data.exit_km?.toString() || '',
        picked_up_by: res.data.picked_up_by || '',
      });
    } catch { toast.error('Error al cargar orden'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      if (editData.status) payload.status = editData.status;
      if (editData.diagnosis !== undefined) payload.diagnosis = editData.diagnosis;
      if (editData.solution !== undefined) payload.solution = editData.solution;
      if (editData.mechanic_observations !== undefined) payload.mechanic_observations = editData.mechanic_observations;
      if (editData.recommendations !== undefined) payload.recommendations = editData.recommendations;
      if (editData.urgent_issues !== undefined) payload.urgent_issues = editData.urgent_issues;
      if (editData.cost_labor) payload.cost_labor = parseFloat(editData.cost_labor);
      if (editData.exit_km) payload.exit_km = parseInt(editData.exit_km);
      if (editData.picked_up_by) payload.picked_up_by = editData.picked_up_by;

      await workshopAPI.updateOrder(order.id, payload);
      toast.success('Orden actualizada');
      setEditMode(false);
      loadOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al actualizar');
    } finally { setSaving(false); }
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api`) : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/workshop/${order.id}/checklist-pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Error al generar PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-orden-${order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF descargado');
    } catch { toast.error('Error al generar PDF'); }
    finally { setGeneratingPDF(false); }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning/20 text-warningDark', in_progress: 'bg-primary/20 text-primaryDark',
      waiting_parts: 'bg-purple-100 text-purple-700', completed: 'bg-success/20 text-successDark',
      delivered: 'bg-secondary/20 text-secondaryDark',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente', in_progress: 'En Proceso', waiting_parts: 'Esperando Piezas',
      completed: 'Listo', delivered: 'Entregado',
    };
    return { color: colors[status] || colors.pending, label: labels[status] || status };
  };

  const getDaysInShop = () => {
    if (!order?.entry_datetime) return 0;
    const end = order.exit_datetime ? new Date(order.exit_datetime) : new Date();
    return Math.floor((end.getTime() - new Date(order.entry_datetime).getTime()) / 86400000);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!order) return <div className="text-center py-12"><p className="text-gray-500">Orden no encontrada</p></div>;

  const badge = getStatusBadge(order.status);
  const groupedChecklist = (order.checklist || []).reduce((acc: any, item: any) => {
    if (!acc[item.item_category]) acc[item.item_category] = [];
    acc[item.item_category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workshop" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Orden #{order.id} - {order.vehicle?.plate_number}
            </h1>
            <p className="text-gray-500">{order.vehicle?.brand} {order.vehicle?.model} - {order.client?.name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={generatePDF} disabled={generatingPDF} className="btn-outline flex items-center gap-2 text-sm">
            {generatingPDF ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            PDF Checklist
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>{badge.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {editMode ? (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-4">Editar Orden</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="input-field">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
                  <textarea value={editData.diagnosis} onChange={e => setEditData({...editData, diagnosis: e.target.value})} className="input-field" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solución aplicada</label>
                  <textarea value={editData.solution} onChange={e => setEditData({...editData, solution: e.target.value})} className="input-field" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones del mecánico</label>
                  <textarea value={editData.mechanic_observations} onChange={e => setEditData({...editData, mechanic_observations: e.target.value})} className="input-field" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recomendaciones</label>
                  <textarea value={editData.recommendations} onChange={e => setEditData({...editData, recommendations: e.target.value})} className="input-field" rows={3} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mano de obra ($)</label>
                    <input type="number" step="0.01" value={editData.cost_labor} onChange={e => setEditData({...editData, cost_labor: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Km al salir</label>
                    <input type="number" value={editData.exit_km} onChange={e => setEditData({...editData, exit_km: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditMode(false)} className="btn-outline flex-1">Cancelar</button>
                  <button onClick={handleUpdate} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="animate-spin" size={16} />} Guardar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800">Detalles del Servicio</h2>
                <button onClick={() => setEditMode(true)} className="text-sm text-primary hover:underline">Editar</button>
              </div>
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Tipo:</span> <span className="capitalize font-medium">{order.type}</span></p>
                {order.description && <p><span className="text-gray-500">Descripción:</span> {order.description}</p>}
                {order.diagnosis && <p><span className="text-gray-500">Diagnóstico:</span> {order.diagnosis}</p>}
                {order.solution && <p><span className="text-gray-500">Solución:</span> {order.solution}</p>}
                {order.mechanic_observations && <p><span className="text-gray-500">Observaciones:</span> {order.mechanic_observations}</p>}
                {order.recommendations && <p><span className="text-gray-500">Recomendaciones:</span> <span className="text-primary">{order.recommendations}</span></p>}
                {order.urgent_issues && <p><span className="text-gray-500">Urgente:</span> <span className="text-danger">{order.urgent_issues}</span></p>}
                {order.customer_notes && <p><span className="text-gray-500">Notas del cliente:</span> {order.customer_notes}</p>}
              </div>
            </div>
          )}

          {Object.keys(groupedChecklist).length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-4">Checklist de Ingreso</h2>
              <div className="space-y-4">
                {Object.entries(groupedChecklist).map(([cat, items]: [string, any]) => (
                  <div key={cat}>
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm capitalize">{CHECKLIST_CATEGORIES[cat] || cat}</h3>
                    <div className="space-y-1">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm p-1">
                          <span className={`w-2 h-2 rounded-full ${item.status === 'ok' ? 'bg-success' : item.status === 'reemplazar' ? 'bg-danger' : 'bg-warning'}`} />
                          <span className="flex-1">{item.item_name}</span>
                          <span className="text-xs text-gray-500 capitalize">{item.status}</span>
                          {item.notes && <span className="text-xs text-gray-400">({item.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-4 sm:p-6">
            <h2 className="font-bold text-gray-800 mb-4">Vehículo</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Placa:</span> <strong className="font-mono">{order.vehicle?.plate_number}</strong></p>
              <p><span className="text-gray-500">Marca:</span> {order.vehicle?.brand} {order.vehicle?.model}</p>
              <p><span className="text-gray-500">Color:</span> {order.vehicle?.color}</p>
              <p><span className="text-gray-500">Tipo:</span> <span className="capitalize">{order.vehicle?.vehicle_type}</span></p>
              <p><span className="text-gray-500">Año:</span> {order.vehicle?.year}</p>
              <p><span className="text-gray-500">Cliente:</span> <strong>{order.client?.name}</strong></p>
              {order.vehicle?.assigned_to && <p><span className="text-gray-500">Asignado a:</span> {order.vehicle.assigned_to}</p>}
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="font-bold text-gray-800 mb-4">Personal</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Mecánico:</span> <strong>{order.mechanic_name || 'N/A'}</strong></p>
              {order.assistant_names && <p><span className="text-gray-500">Ayudantes:</span> {order.assistant_names}</p>}
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="font-bold text-gray-800 mb-4">Fechas y Tiempo</h2>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Clock size={14} /> Entrada: {order.entry_datetime ? formatDate(order.entry_datetime.split('T')[0]) : 'N/A'}</p>
              {order.exit_datetime && <p className="flex items-center gap-2"><CheckCircle size={14} /> Salida: {formatDate(order.exit_datetime.split('T')[0])}</p>}
              <p><span className="text-gray-500">Km entrada:</span> {order.entry_km?.toLocaleString() || 'N/A'} km</p>
              {order.exit_km && <p><span className="text-gray-500">Km salida:</span> {order.exit_km.toLocaleString()} km</p>}
              <p className="font-medium"><span className="text-gray-500">Días en taller:</span> {getDaysInShop()} día{getDaysInShop() !== 1 ? 's' : ''}</p>
              {order.picked_up_by && <p><span className="text-gray-500">Retirado por:</span> {order.picked_up_by}</p>}
              {order.picked_up_datetime && <p><span className="text-gray-500">Fecha retiro:</span> {formatDate(order.picked_up_datetime.split('T')[0])}</p>}
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <h2 className="font-bold text-gray-800 mb-4">Costos</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Mano de obra:</span><span>{formatCurrency(order.cost_labor)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Piezas:</span><span>{formatCurrency(order.cost_parts)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span className="text-primary">{formatCurrency(order.total_cost)}</span></div>
            </div>
            {order.next_maintenance_date && (
              <div className="mt-4 p-3 bg-success/10 rounded-lg text-sm">
                <p className="font-medium text-successDark">Próximo mantenimiento:</p>
                <p>{formatDate(order.next_maintenance_date)} {order.next_maintenance_km ? `/ ${order.next_maintenance_km.toLocaleString()} km` : ''}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
