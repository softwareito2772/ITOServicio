'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  Monitor,
  Package,
  Warehouse,
  ShoppingCart,
  Wrench,
  Hammer,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  AlertTriangle,
  Clock,
  Building2,
} from 'lucide-react';
import { dashboardAPI } from '@/lib/api';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Equipos', href: '/equipment', icon: Monitor },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Inventario', href: '/inventory', icon: Warehouse },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Mantenimiento', href: '/maintenance', icon: Wrench },
  { name: 'Reparaciones', href: '/repairs', icon: Hammer },
  { name: 'Garantías', href: '/warranties', icon: Shield },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

const THEME_KEY = 'ito-theme';

const themes = [
  { value: 'theme-light', label: 'Claro', icon: Sun },
  { value: 'theme-dark', label: 'Oscuro', icon: Moon },
  { value: 'theme-silver', label: 'Silver', icon: Palette },
];

function getTheme(): string {
  if (typeof window !== 'undefined') {
    const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
    if (userId) {
      return localStorage.getItem(`${THEME_KEY}-${userId}`) || 'theme-light';
    }
  }
  return 'theme-light';
}

function setTheme(theme: string) {
  const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
  if (userId) localStorage.setItem(`${THEME_KEY}-${userId}`, theme);
  document.documentElement.className = theme;
}

interface Notification {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  link: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('theme-light');
  const [companyName, setCompanyName] = useState('ITO Servicios');
  const [companyLogo, setCompanyLogo] = useState('/logo.png');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
    } else {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
      }
    }
    setTheme(getTheme());
    setCurrentTheme(getTheme());

    const companyStr = localStorage.getItem('company');
    if (companyStr) {
      const company = JSON.parse(companyStr);
      if (company.name) setCompanyName(company.name);
      if (company.logo_url) setCompanyLogo(company.logo_url);
      if (company.primary_color) {
        document.documentElement.style.setProperty('--primary', company.primary_color);
      }
      if (company.secondary_color) {
        document.documentElement.style.setProperty('--secondary', company.secondary_color);
      }
    }
  }, [router]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await dashboardAPI.getStats();
      const s = res.data;
      const list: Notification[] = [];
      if (s.low_stock_products > 0) list.push({ id: 'stock', type: 'warning', message: `${s.low_stock_products} producto(s) con stock bajo`, link: '/products' });
      if (s.pending_maintenance > 0) list.push({ id: 'mnt', type: 'info', message: `${s.pending_maintenance} mantenimiento(s) pendiente(s)`, link: '/maintenance' });
      if (s.pending_repairs > 0) list.push({ id: 'rep', type: 'info', message: `${s.pending_repairs} reparacion(es) pendiente(s)`, link: '/repairs' });
      if (s.inactive_clients_6_months > 0) list.push({ id: 'cli', type: 'danger', message: `${s.inactive_clients_6_months} cliente(s) inactivo(s) +6 meses`, link: '/clients' });
      if (s.active_warranties > 0) list.push({ id: 'warr', type: 'info', message: `${s.active_warranties} garantia(s) activa(s)`, link: '/warranties' });
      setNotifications(list);
      setDismissed(prev => {
        const next = new Set(prev);
        if (s.low_stock_products === 0) next.delete('stock');
        return next;
      });
    } catch { /* ignore */ }
  };

  const dismissNotification = (id: string) => {
    if (id === 'stock') return;
    setDismissed(prev => new Set(prev).add(id));
  };

  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id));

  const handleThemeChange = (theme: string) => {
    setTheme(theme);
    setCurrentTheme(theme);
    setThemeMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--secondary');
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Image src={companyLogo} alt="Logo" width={36} height={36} className="rounded-lg" />
              <span className="font-bold text-gray-800">{companyName}</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            {user?.role === 'super_admin' && (
              <Link
                href="/super-admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  pathname === '/super-admin'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Building2 size={20} />
                <span className="font-medium">Super Admin</span>
              </Link>
            )}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={20} />
                {visibleNotifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-xs text-white flex items-center justify-center">
                    {visibleNotifications.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200">
                    <p className="font-semibold text-gray-800 text-sm">Notificaciones</p>
                  </div>
                  {visibleNotifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">Sin novedades</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {visibleNotifications.map(n => (
                        <Link
                          key={n.id}
                          href={n.link}
                          onClick={() => { dismissNotification(n.id); setNotificationsOpen(false); }}
                          className={`flex items-start gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${n.type === 'warning' ? 'bg-warning/10' : n.type === 'danger' ? 'bg-danger/10' : ''}`}
                        >
                          <div className={`mt-0.5 ${n.type === 'warning' ? 'text-warning' : n.type === 'danger' ? 'text-danger' : 'text-primary'}`}>
                            {n.type === 'info' ? <Clock size={18} /> : <AlertTriangle size={18} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Hacer clic para ver</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Cambiar tema"
              >
                {currentTheme === 'theme-dark' ? <Moon size={20} /> : currentTheme === 'theme-silver' ? <Palette size={20} /> : <Sun size={20} />}
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {themes.map(t => {
                    const Icon = t.icon;
                    const isActive = currentTheme === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => handleThemeChange(t.value)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                          isActive ? 'text-primary font-semibold' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={16} />
                        {t.label}
                        {isActive && <span className="ml-auto">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-gray-700 font-medium">
                  {user?.name || 'Usuario'}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>
                  {user?.role === 'admin' && (
                      <Link
                      href="/settings#users"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Gestionar usuarios
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
