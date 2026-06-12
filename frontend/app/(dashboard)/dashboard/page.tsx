'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Monitor, Package, DollarSign, Wrench, Hammer,
  AlertTriangle, TrendingUp, Clock, Car, CheckCircle, BarChart3,
} from 'lucide-react';
import { dashboardAPI, companiesAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<string[]>([]);

  useEffect(() => {
    loadModules();
    loadData();
  }, []);

  const loadModules = async () => {
    try {
      const res = await companiesAPI.getMyCompany();
      const mods = res.data.modules || [];
      setModules(mods);
      const companyStr = localStorage.getItem('company');
      if (companyStr) {
        const company = JSON.parse(companyStr);
        company.modules = mods;
        localStorage.setItem('company', JSON.stringify(company));
      }
    } catch {
      const companyStr = localStorage.getItem('company');
      if (companyStr) {
        const company = JSON.parse(companyStr);
        if (company.modules) setModules(company.modules);
      }
    }
  };

  const loadData = async () => {
    try {
      const res = await dashboardAPI.getStats();
      setStats(res.data);
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

  const hasModule = (mod: string) => modules.includes(mod);
  const ws = stats?.workshop;
  const statCards: any[] = [];

  if (hasModule('taller') && ws) {
    statCards.push(
      { title: 'Órdenes Activas', value: ws.active_orders || 0, icon: Car, color: 'bg-primary', href: '/workshop' },
      { title: 'Listas para Entregar', value: ws.pending_pickup || 0, icon: CheckCircle, color: 'bg-success', href: '/workshop' },
      { title: 'Completadas Hoy', value: ws.completed_today || 0, icon: TrendingUp, color: 'bg-secondary', href: '/workshop/report' },
      { title: 'Ingresos Totales', value: formatCurrency(ws.total_revenue || 0), icon: DollarSign, color: 'bg-successDark', href: '/workshop/report' },
    );
  }

  if (hasModule('clientes')) statCards.push({ title: 'Clientes', value: stats?.total_clients || 0, icon: Users, color: 'bg-primary', href: '/clients' });
  if (hasModule('equipos')) statCards.push({ title: 'Equipos', value: stats?.total_equipment || 0, icon: Monitor, color: 'bg-secondary', href: '/equipment' });
  if (hasModule('productos')) statCards.push({ title: 'Productos', value: stats?.total_products || 0, icon: Package, color: 'bg-accent', href: '/products' });
  if (hasModule('ventas')) statCards.push({ title: 'Ventas Totales', value: formatCurrency(stats?.total_sales || 0), icon: DollarSign, color: 'bg-success', href: '/sales' });
  if (hasModule('mantenimiento')) statCards.push({ title: 'Mantenimiento', value: formatCurrency(stats?.total_maintenance_cost || 0), icon: Wrench, color: 'bg-warning', href: '/maintenance' });
  if (hasModule('reparaciones')) statCards.push({ title: 'Reparaciones', value: formatCurrency(stats?.total_repair_cost || 0), icon: Hammer, color: 'bg-warningDark', href: '/repairs' });
  if (hasModule('garantias')) statCards.push({ title: 'Garantías Activas', value: stats?.active_warranties || 0, icon: AlertTriangle, color: 'bg-primaryDark', href: '/warranties' });

  if (hasModule('ventas') || hasModule('mantenimiento') || hasModule('reparaciones')) {
    statCards.push({ title: 'Total del Mes', value: formatCurrency(stats?.total_combined_this_month || 0), icon: TrendingUp, color: 'bg-successDark', href: '/sales' });
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Resumen de tu negocio</p>
      </div>

      {statCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Link key={stat.title} href={stat.href}
              className={`card hover:shadow-md transition-shadow animate-slideIn stagger-${index + 1}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={24} className="text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasModule('taller') && ws && (
        <div className="card p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Resumen del Taller</h2>
            <Link href="/workshop/report" className="text-sm text-primary hover:underline">Ver reporte</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{ws.active_orders}</p>
              <p className="text-xs text-gray-500">Activas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{ws.completed_today}</p>
              <p className="text-xs text-gray-500">Completadas hoy</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{ws.pending_pickup}</p>
              <p className="text-xs text-gray-500">Por retirar</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{ws.avg_days_in_shop}</p>
              <p className="text-xs text-gray-500">Promedio días</p>
            </div>
          </div>
          {ws.pending_invoices > 0 && (
            <div className="mt-3 p-3 bg-warning/10 rounded-lg text-center">
              <p className="text-sm text-warningDark">{ws.pending_invoices} facturas pendientes de cobro</p>
            </div>
          )}
          {ws.total_revenue > 0 && (
            <div className="mt-3 p-3 bg-success/10 rounded-lg text-center">
              <p className="text-sm text-successDark">Ingresos totales del taller: <strong>{formatCurrency(ws.total_revenue)}</strong></p>
            </div>
          )}
        </div>
      )}

      {(hasModule('clientes') || hasModule('equipos')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {stats?.low_stock_products > 0 && hasModule('productos') && (
            <Link href="/products?lowStock=true" className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-warning" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{stats.low_stock_products} productos con stock bajo</p>
                  <p className="text-sm text-gray-500">Revisar inventario</p>
                </div>
              </div>
            </Link>
          )}
          {stats?.inactive_clients_6_months > 0 && hasModule('clientes') && (
            <Link href="/clients?inactive=true" className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
                  <Clock size={20} className="text-danger" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{stats.inactive_clients_6_months} clientes inactivos</p>
                  <p className="text-sm text-gray-500">Sin actividad en +6 meses</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {statCards.length === 0 && (
        <div className="card p-8 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay módulos activos. Ve a Configuración para activar módulos.</p>
        </div>
      )}
    </div>
  );
}
