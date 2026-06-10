'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Calendar, DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function DailyReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadReport(); }, [selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await workshopAPI.getDailyReport(selectedDate);
      setReport(res.data);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/workshop" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reporte Diario</h1>
            <p className="text-gray-500">Resumen de actividad del taller</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input-field" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <CheckCircle size={24} className="mx-auto text-success mb-2" />
              <p className="text-2xl font-bold">{report.summary.total_worked}</p>
              <p className="text-xs text-gray-500">Entregados hoy</p>
            </div>
            <div className="card p-4 text-center">
              <DollarSign size={24} className mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-primary">{formatCurrency(report.summary.total_revenue)}</p>
              <p className="text-xs text-gray-500">Ingresos del día</p>
            </div>
            <div className="card p-4 text-center">
              <Clock size={24} className="mx-auto text-warning mb-2" />
              <p className="text-2xl font-bold text-warning">{report.summary.total_waiting}</p>
              <p className="text-xs text-gray-500">En espera</p>
            </div>
            <div className="card p-4 text-center">
              <AlertTriangle size={24} className="mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-purple-600">{report.summary.total_ready_not_picked}</p>
              <p className="text-xs text-gray-500">Listos sin retirar</p>
            </div>
          </div>

          {report.worked_today.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-4">Vehículos Entregados Hoy</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Placa</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Vehículo</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Cliente</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Mecánico</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Cobrado</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Días</th>
                  </tr></thead>
                  <tbody>{report.worked_today.map((o: any) => (
                    <tr key={o.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono font-bold text-primary">{o.plate}</td>
                      <td className="py-2 px-3">{o.vehicle}</td>
                      <td className="py-2 px-3">{o.client}</td>
                      <td className="py-2 px-3">{o.mechanic}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(o.total_cost)}</td>
                      <td className="py-2 px-3 text-center">{o.days_in_shop}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {report.waiting.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-4">En Espera / Sin Terminar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Placa</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Vehículo</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Cliente</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Mecánico</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Días</th>
                  </tr></thead>
                  <tbody>{report.waiting.map((o: any) => (
                    <tr key={o.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono font-bold text-primary">{o.plate}</td>
                      <td className="py-2 px-3">{o.vehicle}</td>
                      <td className="py-2 px-3">{o.client}</td>
                      <td className="py-2 px-3">{o.mechanic}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warningDark capitalize">{o.status}</span>
                      </td>
                      <td className="py-2 px-3 text-center">{o.days_in_shop}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {report.ready_not_picked.length > 0 && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-bold text-gray-800 mb-4">Listos Sin Retirar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Placa</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Vehículo</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Cliente</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Total</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-600">Días esperando</th>
                  </tr></thead>
                  <tbody>{report.ready_not_picked.map((o: any) => (
                    <tr key={o.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-mono font-bold text-primary">{o.plate}</td>
                      <td className="py-2 px-3">{o.vehicle}</td>
                      <td className="py-2 px-3">{o.client}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(o.total_cost)}</td>
                      <td className="py-2 px-3 text-center text-warning font-medium">{o.days_waiting} día{o.days_waiting !== 1 ? 's' : ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {report.worked_today.length === 0 && report.waiting.length === 0 && report.ready_not_picked.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-gray-500">No hay actividad para esta fecha</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
