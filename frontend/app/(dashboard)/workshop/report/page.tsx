'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Calendar, DollarSign, Clock, CheckCircle, AlertTriangle, Package, FileText } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function DailyReportPage() {
  const [report, setReport] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadReport(); }, [selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportRes, invRes, invcRes] = await Promise.all([
        workshopAPI.getDailyReport(selectedDate),
        workshopAPI.getInventoryStats(),
        workshopAPI.getInvoiceStats(),
      ]);
      setReport(reportRes.data);
      setInventoryStats(invRes.data);
      setInvoiceStats(invcRes.data);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workshop" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reporte del Taller</h1>
            <p className="text-gray-500">{selectedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input-field" />
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-success">{formatCurrency(report.worked_revenue)}</p>
              <p className="text-xs text-gray-500">Ingresos Hoy</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-primary">{report.worked_today?.length || 0}</p>
              <p className="text-xs text-gray-500">Órdenes Entregadas</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-warning">{report.waiting_count}</p>
              <p className="text-xs text-gray-500">En Espera</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-danger">{report.ready_not_picked?.length || 0}</p>
              <p className="text-xs text-gray-500">Listas sin Recoger</p>
            </div>
          </div>

          {report.worked_today?.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-3">Órdenes Entregadas Hoy</h2>
              <div className="space-y-2">
                {report.worked_today.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-success/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Orden #{item.id}</p>
                      <p className="text-xs text-gray-500">{item.vehicle}</p>
                    </div>
                    <p className="font-bold text-success">{formatCurrency(item.total_cost)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.ready_not_picked?.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-3">Listas sin Recoger</h2>
              <div className="space-y-2">
                {report.ready_not_picked.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-warning/10 rounded-lg">
                    <p className="text-sm font-medium">Orden #{item.id} - {item.vehicle}</p>
                    <span className="text-xs bg-warning/20 text-warningDark px-2 py-0.5 rounded-full">Esperando</span>
                  </div>
                ))}
              </div>
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
