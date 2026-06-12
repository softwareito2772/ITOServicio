'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Calendar, DollarSign, Clock, CheckCircle, AlertTriangle, Package, FileText, Filter } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

const DATE_PRESETS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: 'Esta semana', value: 'this_week' },
  { label: 'Este mes', value: 'this_month' },
  { label: 'Este año', value: 'this_year' },
  { label: 'Personalizado', value: 'custom' },
];

function getDateRange(preset: string): { start_date: string; end_date: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { start_date: fmt(today), end_date: fmt(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start_date: fmt(y), end_date: fmt(y) };
    }
    case 'this_week': {
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start_date: fmt(monday), end_date: fmt(sunday) };
    }
    case 'this_month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start_date: fmt(first), end_date: fmt(last) };
    }
    case 'this_year': {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31);
      return { start_date: fmt(first), end_date: fmt(last) };
    }
    default:
      return { start_date: fmt(today), end_date: fmt(today) };
  }
}

export default function DailyReportPage() {
  const [report, setReport] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadReport(); }, [datePreset, customStart, customEnd]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: { start_date: string; end_date: string } = datePreset === 'custom'
        ? { start_date: customStart, end_date: customEnd }
        : getDateRange(datePreset);

      const [reportRes, invRes, invcRes] = await Promise.all([
        workshopAPI.getDailyReport(params),
        workshopAPI.getInventoryStats(),
        workshopAPI.getInvoiceStats(),
      ]);
      setReport(reportRes.data);
      setInventoryStats(invRes.data);
      setInvoiceStats(invcRes.data);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  };

  const getDateLabel = () => {
    if (datePreset === 'custom') return `${customStart} al ${customEnd}`;
    const range = getDateRange(datePreset);
    if (range.start_date === range.end_date) return range.start_date;
    return `${range.start_date} al ${range.end_date}`;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workshop" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reporte del Taller</h1>
            <p className="text-gray-500 text-sm">{getDateLabel()}</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Período:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map(p => (
              <button key={p.value} onClick={() => setDatePreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  datePreset === p.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 ml-0 sm:ml-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input-field text-sm" />
              <span className="text-gray-400">a</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input-field text-sm" />
            </div>
          )}
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-success">{formatCurrency(report.total_revenue || 0)}</p>
              <p className="text-xs text-gray-500">Ingresos Entregadas</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-primary">{report.total_worked || 0}</p>
              <p className="text-xs text-gray-500">Órdenes Atendidas</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-warning">{report.waiting_count || 0}</p>
              <p className="text-xs text-gray-500">En Espera</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-danger">{report.ready_not_picked?.length || 0}</p>
              <p className="text-xs text-gray-500">Listas sin Recoger</p>
            </div>
          </div>

          {report.worked_today?.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-3">Órdenes Entregadas ({report.worked_today.length})</h2>
              <div className="space-y-2">
                {report.worked_today.map((item: any) => (
                  <Link key={item.id} href={`/workshop/${item.id}`}
                    className="flex items-center justify-between p-3 bg-success/5 rounded-lg hover:bg-success/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Orden #{item.id} — {item.client}</p>
                      <p className="text-xs text-gray-500">{item.vehicle} ({item.plate}) — {item.mechanic}</p>
                      <p className="text-xs text-gray-400">{item.exit_date} — {item.days_in_shop} días</p>
                    </div>
                    <p className="font-bold text-success">{formatCurrency(item.total_cost)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {report.completed_not_delivered?.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-3">Completadas — Pendientes de Entrega ({report.completed_not_delivered.length})</h2>
              <div className="space-y-2">
                {report.completed_not_delivered.map((item: any) => (
                  <Link key={item.id} href={`/workshop/${item.id}`}
                    className="flex items-center justify-between p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Orden #{item.id} — {item.client}</p>
                      <p className="text-xs text-gray-500">{item.vehicle} ({item.plate}) — {item.mechanic}</p>
                      <p className="text-xs text-gray-400">Salida: {item.exit_date} — {item.days_in_shop} días</p>
                    </div>
                    <p className="font-bold text-primary">{formatCurrency(item.total_cost)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {report.waiting?.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-3">En Espera ({report.waiting.length})</h2>
              <div className="space-y-2">
                {report.waiting.map((item: any) => (
                  <Link key={item.id} href={`/workshop/${item.id}`}
                    className="flex items-center justify-between p-3 bg-warning/5 rounded-lg hover:bg-warning/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Orden #{item.id} — {item.client}</p>
                      <p className="text-xs text-gray-500">{item.vehicle} ({item.plate}) — {item.type}</p>
                      <p className="text-xs text-gray-400">Entrada: {item.entry_date}</p>
                    </div>
                    <span className="text-xs bg-warning/20 text-warningDark px-2 py-1 rounded-full capitalize">{item.status === 'pending' ? 'Pendiente' : item.status === 'in_progress' ? 'En Progreso' : 'Esperando Repuesto'}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {report.ready_not_picked?.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-3">Listas sin Recoger ({report.ready_not_picked.length})</h2>
              <div className="space-y-2">
                {report.ready_not_picked.map((item: any) => (
                  <Link key={item.id} href={`/workshop/${item.id}`}
                    className="flex items-center justify-between p-3 bg-danger/5 rounded-lg hover:bg-danger/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium">Orden #{item.id} — {item.client}</p>
                      <p className="text-xs text-gray-500">{item.vehicle} ({item.plate})</p>
                      <p className="text-xs text-gray-400">Salida: {item.exit_date}</p>
                    </div>
                    <span className="text-xs bg-danger/20 text-danger px-2 py-1 rounded-full">Por Recoger</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!report.worked_today?.length && !report.completed_not_delivered?.length && !report.waiting?.length && !report.ready_not_picked?.length && (
            <div className="card p-8 text-center">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No hay actividad en el período seleccionado.</p>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {inventoryStats && (
          <div className="card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package size={20} className="text-primary" />
              <h2 className="font-bold text-gray-800">Inventario</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Items:</span><span className="font-medium">{inventoryStats.total_items}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Stock Bajo:</span><span className="font-medium text-danger">{inventoryStats.low_stock_count}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Valor Total:</span><span className="font-medium">{formatCurrency(inventoryStats.total_value)}</span></div>
              {Object.keys(inventoryStats.categories).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-gray-500 mb-1">Categorías:</p>
                  {Object.entries(inventoryStats.categories).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between text-xs"><span>{cat}</span><span>{count as number}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {invoiceStats && (
          <div className="card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-primary" />
              <h2 className="font-bold text-gray-800">Facturación</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Facturado:</span><span className="font-medium">{invoiceStats.total_invoiced}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monto Total:</span><span className="font-medium">{formatCurrency(invoiceStats.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Cobrado:</span><span className="font-medium text-success">{formatCurrency(invoiceStats.total_paid_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pendiente:</span><span className="font-medium text-danger">{formatCurrency(invoiceStats.pending_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pagadas:</span><span className="font-medium">{invoiceStats.total_paid}/{invoiceStats.total_invoiced}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
