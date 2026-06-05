'use client';

import { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Loader2, Calendar } from 'lucide-react';
import { reportsAPI, clientsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Client { id: number; name: string; phone: string; email?: string; created_at: string; }

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => { loadClients(); }, []);
  useEffect(() => { loadReport(); }, [reportType]);

  const loadClients = async () => {
    try { const res = await clientsAPI.getAll(); setClients(res.data); }
    catch { toast.error('Error al cargar clientes'); }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'sales': response = await reportsAPI.getSales(startDate || undefined, endDate || undefined, selectedClient ? parseInt(selectedClient) : undefined); break;
        case 'inventory': response = await reportsAPI.getInventory(); break;
        case 'maintenance': response = await reportsAPI.getMaintenance(startDate || undefined, endDate || undefined); break;
        case 'repairs': response = await reportsAPI.getRepairs(startDate || undefined, endDate || undefined); break;
        case 'clients': response = await reportsAPI.getInactiveClients(6); break;
        default: response = await reportsAPI.getSales();
      }
      setReportData(response.data);
    } catch (error) { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  };

  const exportReport = () => {
    const url = reportsAPI.exportReport(reportType, startDate || undefined, endDate || undefined);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div><h1 className="text-2xl font-bold text-gray-800">Reportes</h1><p className="text-gray-500">Genera reportes y exporta datos</p></div>

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-6">
          {['sales', 'inventory', 'maintenance', 'repairs', 'clients'].map(type => (
            <button key={type} onClick={() => setReportType(type)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === type ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {type === 'sales' ? 'Ventas' : type === 'inventory' ? 'Inventario' : type === 'maintenance' ? 'Mantenimiento' : type === 'repairs' ? 'Reparaciones' : 'Clientes Inactivos'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
          </div>
          {reportType === 'sales' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="input-field">
                <option value="">Todos</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={loadReport} className="btn-outline flex items-center gap-2"><Calendar size={18} /> Generar</button>
            <button onClick={exportReport} className="btn-primary flex items-center gap-2"><Download size={18} /> Excel</button>
          </div>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
         : reportData ? (
          <div className="overflow-x-auto">
            {reportType === 'sales' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-primary/10 p-4 rounded-lg"><p className="text-sm text-gray-500">Total Ventas</p><p className="text-2xl font-bold text-primary">{formatCurrency(reportData.total || 0)}</p></div>
                  <div className="bg-success/10 p-4 rounded-lg"><p className="text-sm text-gray-500">Cantidad</p><p className="text-2xl font-bold text-success">{reportData.count || 0}</p></div>
                </div>
                <table className="w-full"><thead><tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">ID</th><th className="text-left py-3 px-4">Cliente</th><th className="text-right py-3 px-4">Total</th><th className="text-left py-3 px-4">Fecha</th><th className="text-left py-3 px-4">Estado</th>
                </tr></thead><tbody>{reportData.sales?.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-100"><td className="py-3 px-4">#{s.id}</td><td className="py-3 px-4">{s.client}</td><td className="py-3 px-4 text-right">{formatCurrency(s.total)}</td><td className="py-3 px-4">{formatDate(s.date)}</td><td className="py-3 px-4">{s.status}</td></tr>
                ))}</tbody></table>
              </>
            )}
            {reportType === 'inventory' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary/10 p-4 rounded-lg"><p className="text-sm text-gray-500">Total Productos</p><p className="text-2xl font-bold text-primary">{reportData.total_products || 0}</p></div>
                  <div className="bg-warning/10 p-4 rounded-lg"><p className="text-sm text-gray-500">Stock Bajo</p><p className="text-2xl font-bold text-warning">{reportData.low_stock_count || 0}</p></div>
                </div>
                <table className="w-full"><thead><tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Producto</th><th className="text-right py-3 px-4">Stock</th><th className="text-right py-3 px-4">Mínimo</th><th className="text-right py-3 px-4">Precio</th>
                </tr></thead><tbody>{reportData.products?.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100"><td className="py-3 px-4">{p.name}</td><td className={`py-3 px-4 text-right font-semibold ${p.stock <= 1 ? 'text-danger' : p.stock <= p.stock_min ? 'text-warning' : ''}`}>{p.stock}</td><td className="py-3 px-4 text-right">{p.stock_min}</td><td className="py-3 px-4 text-right">{formatCurrency(p.price)}</td></tr>
                ))}</tbody></table>
              </>
            )}
            {reportType === 'repairs' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary/10 p-4 rounded-lg"><p className="text-sm text-gray-500">Total Reparaciones</p><p className="text-2xl font-bold text-primary">{reportData.count || 0}</p></div>
                  <div className="bg-success/10 p-4 rounded-lg"><p className="text-sm text-gray-500">Ganancias</p><p className="text-2xl font-bold text-success">{formatCurrency(reportData.total_cost || 0)}</p></div>
                </div>
                <table className="w-full"><thead><tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Equipo</th><th className="text-left py-3 px-4">Cliente</th><th className="text-left py-3 px-4">Diagnóstico</th><th className="text-right py-3 px-4">Costo</th><th className="text-left py-3 px-4">Fecha</th>
                </tr></thead><tbody>{reportData.repairs?.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100"><td className="py-3 px-4">{r.equipment}</td><td className="py-3 px-4">{r.client}</td><td className="py-3 px-4">{r.diagnosis}</td><td className="py-3 px-4 text-right">{formatCurrency(r.total_cost)}</td><td className="py-3 px-4">{formatDate(r.start_date)}</td></tr>
                ))}</tbody></table>
              </>
            )}
            {reportType === 'clients' && (
              <div>
                <p className="mb-4 text-gray-600">Clientes sin actividad en los últimos 6 meses: <strong>{reportData.count || 0}</strong></p>
                <table className="w-full"><thead><tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Nombre</th><th className="text-left py-3 px-4">Teléfono</th><th className="text-left py-3 px-4">Email</th><th className="text-left py-3 px-4">Registrado</th>
                </tr></thead><tbody>{reportData.clients?.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-100"><td className="py-3 px-4">{c.name}</td><td className="py-3 px-4">{c.phone}</td><td className="py-3 px-4">{c.email || '-'}</td><td className="py-3 px-4">{formatDate(c.created_at)}</td></tr>
                ))}</tbody></table>
              </div>
            )}
            {reportType === 'maintenance' && (
              <table className="w-full"><thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Equipo</th><th className="text-left py-3 px-4">Cliente</th><th className="text-left py-3 px-4">Técnico</th><th className="text-left py-3 px-4">Descripción</th><th className="text-left py-3 px-4">Fecha</th><th className="text-left py-3 px-4">Estado</th>
              </tr></thead><tbody>{reportData.maintenance?.map((m: any) => (
                <tr key={m.id} className="border-b border-gray-100"><td className="py-3 px-4">{m.equipment}</td><td className="py-3 px-4">{m.client}</td><td className="py-3 px-4">{m.technician}</td><td className="py-3 px-4">{m.description}</td><td className="py-3 px-4">{formatDate(m.start_date)}</td><td className="py-3 px-4">{m.status}</td></tr>
              ))}</tbody></table>
            )}
          </div>
        ) : <div className="text-center py-12"><FileSpreadsheet className="mx-auto mb-4 text-gray-300" size={48} /><p className="text-gray-500">Selecciona un tipo de reporte</p></div>}
      </div>
    </div>
  );
}
