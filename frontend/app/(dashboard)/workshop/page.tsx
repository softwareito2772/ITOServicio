'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Clock, Wrench, CheckCircle, Package, Car, AlertTriangle, Calendar, DollarSign, BarChart3, Gauge } from 'lucide-react';
import Link from 'next/link';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';

interface WorkshopOrder {
  id: number;
  vehicle?: any;
  client?: any;
  technician?: any;
  type: string;
  description?: string;
  status: string;
  entry_km?: number;
  entry_datetime?: string;
  estimated_completion?: string;
  total_cost: number;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/20 text-warningDark', icon: Clock },
  { value: 'in_progress', label: 'En Proceso', color: 'bg-primary/20 text-primaryDark', icon: Wrench },
  { value: 'waiting_parts', label: 'Esperando Piezas', color: 'bg-purple-100 text-purple-700', icon: Package },
  { value: 'completed', label: 'Listo', color: 'bg-success/20 text-successDark', icon: CheckCircle },
  { value: 'delivered', label: 'Entregado', color: 'bg-secondary/20 text-secondaryDark', icon: Car },
];

export default function WorkshopPage() {
  const [orders, setOrders] = useState<WorkshopOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [oRes, sRes] = await Promise.all([
        workshopAPI.getOrders(),
        workshopAPI.getStats(),
      ]);
      setOrders(oRes.data);
      setStats(sRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return ['pending', 'in_progress', 'waiting_parts'].includes(o.status);
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  const getStatusBadge = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  const getDaysInShop = (entry?: string) => {
    if (!entry) return 0;
    const diff = Math.floor((Date.now() - new Date(entry).getTime()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Taller</h1>
          <p className="text-gray-500">Control de órdenes de trabajo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workshop/vehicles" className="btn-outline flex items-center gap-2">
            <Car size={18} /> Flota
          </Link>
          <Link href="/workshop/mechanics" className="btn-outline flex items-center gap-2">
            <Wrench size={18} /> Personal
          </Link>
          <Link href="/workshop/report" className="btn-outline flex items-center gap-2">
            <BarChart3 size={18} /> Reporte
          </Link>
          <Link href="/workshop/odometro" className="btn-outline flex items-center gap-2">
            <Gauge size={18} /> Odómetro
          </Link>
          <Link href="/workshop/alertas" className="btn-outline flex items-center gap-2">
            <AlertTriangle size={18} /> Alertas
          </Link>
          <Link href="/workshop/new" className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Nueva Orden
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Órdenes Activas</p>
            <p className="text-2xl font-bold text-primary">{stats.active_orders}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Completadas Hoy</p>
            <p className="text-2xl font-bold text-success">{stats.completed_today}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Tiempo Promedio</p>
            <p className="text-2xl font-bold text-warningDark">{stats.avg_days_in_shop} días</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Ingresos del Mes</p>
            <p className="text-2xl font-bold text-accentDark">{formatCurrency(stats.total_revenue)}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'active', label: 'Activas' },
          { key: 'completed', label: 'Listas' },
          { key: 'delivered', label: 'Entregadas' },
          { key: 'all', label: 'Todas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Car size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay órdenes {filter === 'active' ? 'activas' : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => {
              const badge = getStatusBadge(order.status);
              const days = getDaysInShop(order.entry_datetime);
              const Icon = badge.icon;
              return (
                <Link key={order.id} href={`/workshop/${order.id}`}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow block">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{order.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                          <Icon size={12} className="inline mr-1" />{badge.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-800 truncate">
                        {order.vehicle?.plate_number} - {order.vehicle?.brand} {order.vehicle?.model}
                      </h3>
                      <p className="text-sm text-gray-500">{order.client?.name}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    <p className="flex items-center gap-1">
                      <Wrench size={12} />
                      <span className="capitalize">{order.type}</span>
                    </p>
                    {order.entry_km && <p className="flex items-center gap-1"><Car size={12} /> {order.entry_km.toLocaleString()} km</p>}
                    {order.entry_datetime && (
                      <p className="flex items-center gap-1">
                        <Clock size={12} />
                        {days} día{days !== 1 ? 's' : ''} en taller
                      </p>
                    )}
                    {order.total_cost > 0 && (
                      <p className="flex items-center gap-1 font-medium"><DollarSign size={12} /> {formatCurrency(order.total_cost)}</p>
                    )}
                  </div>

                  {days >= 3 && order.status !== 'delivered' && (
                    <div className="flex items-center gap-1 text-xs text-warningDark bg-warning/10 rounded-lg px-2 py-1">
                      <AlertTriangle size={12} /> {days} días en taller
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
