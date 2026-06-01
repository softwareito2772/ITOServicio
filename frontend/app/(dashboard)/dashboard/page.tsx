'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  Monitor,
  Package,
  DollarSign,
  Wrench,
  Hammer,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  total_clients: number;
  total_equipment: number;
  total_products: number;
  low_stock_products: number;
  total_sales: number;
  sales_this_month: number;
  total_maintenance_cost: number;
  total_repair_cost: number;
  maintenance_cost_this_month: number;
  repair_cost_this_month: number;
  total_combined_this_month: number;
  pending_maintenance: number;
  pending_repairs: number;
  active_warranties: number;
  inactive_clients_6_months: number;
}

interface RecentActivity {
  equipment: any[];
  maintenance: any[];
  repairs: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentActivity(),
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Image src="/logo.png" alt="ITO" width={64} height={64} className="rounded-xl" />
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Clientes',
      value: stats?.total_clients || 0,
      icon: Users,
      color: 'bg-primary',
      href: '/clients',
    },
    {
      title: 'Equipos',
      value: stats?.total_equipment || 0,
      icon: Monitor,
      color: 'bg-secondary',
      href: '/equipment',
    },
    {
      title: 'Productos',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'bg-accent',
      href: '/products',
    },
    {
      title: 'Ventas Totales',
      value: formatCurrency(stats?.total_sales || 0),
      icon: DollarSign,
      color: 'bg-success',
      href: '/sales',
    },
    {
      title: 'Mantenimiento Total',
      value: formatCurrency(stats?.total_maintenance_cost || 0),
      icon: Wrench,
      color: 'bg-warning',
      href: '/maintenance',
    },
    {
      title: 'Reparaciones Total',
      value: formatCurrency(stats?.total_repair_cost || 0),
      icon: Hammer,
      color: 'bg-warningDark',
      href: '/repairs',
    },
    {
      title: 'Total del Mes',
      value: formatCurrency(stats?.total_combined_this_month || 0),
      icon: TrendingUp,
      color: 'bg-successDark',
      href: '/sales',
    },
    {
      title: 'Garantías Activas',
      value: stats?.active_warranties || 0,
      icon: AlertTriangle,
      color: 'bg-primaryDark',
      href: '/warranties',
    },
  ];

  const alertCards = [
    {
      title: 'Stock Bajo',
      value: stats?.low_stock_products || 0,
      description: 'Productos con inventario bajo',
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/20',
      href: '/products?lowStock=true',
    },
    {
      title: 'Clientes Inactivos',
      value: stats?.inactive_clients_6_months || 0,
      description: 'Sin registro en +6 meses',
      icon: Clock,
      color: 'text-danger',
      bgColor: 'bg-danger/20',
      href: '/clients?inactive=true',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Resumen de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link
            key={stat.title}
            href={stat.href}
            className={`card hover:shadow-md transition-shadow animate-slideIn stagger-${index + 1}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {alertCards.some(a => a.value > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Alertas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {alertCards
              .filter(alert => alert.value > 0)
              .map((alert) => (
                <Link
                  key={alert.title}
                  href={alert.href}
                  className={`${alert.bgColor} p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`${alert.bgColor} p-3 rounded-xl`}>
                      <alert.icon className={alert.color} size={24} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{alert.value}</p>
                      <p className="text-sm text-gray-500">{alert.title}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{alert.description}</p>
                </Link>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Equipos Recientes</h2>
          {activity?.equipment && activity.equipment.length > 0 ? (
            <div className="space-y-3">
              {activity.equipment.slice(0, 5).map((eq: any) => (
                <div
                  key={eq.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{eq.type}</p>
                    <p className="text-sm text-gray-500">
                      {eq.model} - {eq.client}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      eq.status === 'pending'
                        ? 'bg-warning/20 text-warningDark'
                        : eq.status === 'in_progress'
                        ? 'bg-primary/20 text-primaryDark'
                        : eq.status === 'completed'
                        ? 'bg-success/20 text-successDark'
                        : 'bg-secondary/20 text-secondaryDark'
                    }`}
                  >
                    {eq.status}
                  </span>
                </div>
              ))}
              <Link
                href="/equipment"
                className="block text-center text-primary hover:underline text-sm mt-4"
              >
                Ver todos los equipos
              </Link>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay equipos registrados</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {activity?.maintenance && activity.maintenance.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Mantenimientos</h3>
                {activity.maintenance.slice(0, 3).map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2"
                  >
                    <p className="text-sm text-gray-700">{m.equipment}</p>
                    <span className="text-xs text-gray-500">{m.status}</span>
                  </div>
                ))}
              </div>
            )}
            {activity?.repairs && activity.repairs.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Reparaciones</h3>
                {activity.repairs.slice(0, 3).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2"
                  >
                    <p className="text-sm text-gray-700">{r.equipment}</p>
                    <span className="text-xs text-gray-500">{r.status}</span>
                  </div>
                ))}
              </div>
            )}
            {(!activity?.maintenance?.length && !activity?.repairs?.length) && (
              <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/maintenance" className="card hover:shadow-md transition-shadow text-center">
          <Wrench className="mx-auto mb-2 text-primary" size={32} />
          <h3 className="font-semibold text-gray-800">Nuevo Mantenimiento</h3>
          <p className="text-sm text-gray-500">Registrar servicio</p>
        </Link>
        <Link href="/repairs" className="card hover:shadow-md transition-shadow text-center">
          <Hammer className="mx-auto mb-2 text-secondary" size={32} />
          <h3 className="font-semibold text-gray-800">Nueva Reparación</h3>
          <p className="text-sm text-gray-500">Registrar reparación</p>
        </Link>
        <Link href="/sales" className="card hover:shadow-md transition-shadow text-center">
          <DollarSign className="mx-auto mb-2 text-success" size={32} />
          <h3 className="font-semibold text-gray-800">Nueva Venta</h3>
          <p className="text-sm text-gray-500">Registrar venta</p>
        </Link>
      </div>
    </div>
  );
}
