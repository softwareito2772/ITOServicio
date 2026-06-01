'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock, Wrench, Hammer, Package } from 'lucide-react';
import { warrantiesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Warranty {
  id: number;
  equipment: any;
  repair: any;
  maintenance: any;
  warranty_type: string;
  start_date: string;
  end_date: string;
  status: string;
  notes?: string;
}

export default function WarrantiesPage() {
  const [data, setData] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      const response = await warrantiesAPI.getAll(0, 100, filter);
      setData(response.data);
    } catch (error) { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const getStatusBadge = (warranty: Warranty) => {
    const today = new Date();
    const end = new Date(warranty.end_date);
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { bg: 'bg-danger/20', text: 'text-dangerDark', icon: AlertTriangle, label: 'Vencida' };
    if (daysLeft <= 30) return { bg: 'bg-warning/20', text: 'text-warningDark', icon: Clock, label: `${daysLeft} días` };
    return { bg: 'bg-success/20', text: 'text-successDark', icon: CheckCircle, label: 'Activa' };
  };

  const getSource = (w: Warranty) => {
    if (w.repair) return { icon: Hammer, label: 'Reparación', color: 'text-secondary' };
    if (w.maintenance) return { icon: Wrench, label: 'Mantenimiento', color: 'text-warning' };
    return { icon: Package, label: 'Producto', color: 'text-success' };
  };

  const activeCount = data.filter(w => new Date(w.end_date) >= new Date() && w.status === 'active').length;
  const expiringCount = data.filter(w => { const d = new Date(w.end_date); const days = Math.ceil((d.getTime() - Date.now()) / 86400000); return days >= 0 && days <= 30 && w.status === 'active'; }).length;
  const expiredCount = data.filter(w => new Date(w.end_date) < new Date()).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Garantías</h1>
        <p className="text-gray-500">Control de garantías</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Activas</p>
          <p className="text-2xl font-bold text-success mt-1">{activeCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Por Vencer</p>
          <p className="text-2xl font-bold text-warning mt-1">{expiringCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Vencidas</p>
          <p className="text-2xl font-bold text-danger mt-1">{expiredCount}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['active', 'expiring', 'expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'active' ? 'Activas' : f === 'expiring' ? 'Por Vencer' : 'Vencidas'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
         : data.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No hay garantías</p></div>
         : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Equipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Origen</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Inicio</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Fin</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Estado</th>
              </tr></thead>
              <tbody>{data.map(w => {
                const badge = getStatusBadge(w);
                const source = getSource(w);
                const SrcIcon = source.icon;
                return (
                  <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{w.equipment?.brand} {w.equipment?.model}</td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1 text-sm ${source.color}`}>
                        <SrcIcon size={14} /> {source.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">{w.warranty_type}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(w.start_date)}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(w.end_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        <badge.icon size={12} className="inline mr-1" />{badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
