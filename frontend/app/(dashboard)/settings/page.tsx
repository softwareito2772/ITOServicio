'use client';

import { useEffect, useState } from 'react';
import { Loader2, User, Trash2, Plus, Edit, Shield, Sun, Moon, Palette, Check, Building2 } from 'lucide-react';
import { authAPI, usersAPI, companiesAPI } from '@/lib/api';
import { toast } from 'sonner';

const ALL_MODULES = [
  'ventas', 'mantenimiento', 'reparaciones', 'equipos',
  'productos', 'clientes', 'garantias', 'reportes', 'inventario'
];

const MODULE_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  mantenimiento: 'Mantenimiento',
  reparaciones: 'Reparaciones',
  equipos: 'Equipos/Vehículos',
  productos: 'Productos',
  clientes: 'Clientes',
  garantias: 'Garantías',
  reportes: 'Reportes',
  inventario: 'Inventario',
};

interface UserData { id?: number; name: string; email: string; role: string; company_id?: number; }
interface AllUser { id: number; name: string; email: string; role: string; is_active: boolean; created_at: string; }

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<AllUser | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [currentTheme, setCurrentTheme] = useState('theme-light');
  const [companyData, setCompanyData] = useState({
    name: '', logo_url: '', primary_color: '#7C9CBF', secondary_color: '#B4C7E7',
    description: '', email_domain: '',
  });
  const [companyModules, setCompanyModules] = useState<string[]>([]);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => { setCurrentTheme(document.documentElement.className || 'theme-light'); }, []);
  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (window.location.hash === '#users') {
      setTimeout(() => document.getElementById('users')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
    if (window.location.hash === '#company') {
      setTimeout(() => document.getElementById('company')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, [loading]);

  const loadData = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        setIsAdmin(u.role === 'admin');
        if (u.role === 'admin') {
          const res = await usersAPI.getAll();
          setAllUsers(res.data);
          if (u.company_id) {
            loadCompanySettings(u.company_id);
          }
        }
      }
    } catch (error) { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authAPI.updateMe(formData);
      toast.success('Perfil actualizado');
      const res = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error');
      }
    }
  };

  const loadCompanySettings = async (companyId: number) => {
    try {
      const res = await companiesAPI.getById(companyId);
      const c = res.data;
      setCompanyData({
        name: c.name || '',
        logo_url: c.logo_url || '',
        primary_color: c.primary_color || '#7C9CBF',
        secondary_color: c.secondary_color || '#B4C7E7',
        description: c.description || '',
        email_domain: c.email_domain || '',
      });
      setCompanyModules(c.modules || []);
    } catch {}
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await companiesAPI.updateMySettings(companyData);
      const companyStr = localStorage.getItem('company');
      if (companyStr) {
        const c = JSON.parse(companyStr);
        c.name = companyData.name;
        c.logo_url = companyData.logo_url;
        c.primary_color = companyData.primary_color;
        c.secondary_color = companyData.secondary_color;
        localStorage.setItem('company', JSON.stringify(c));
        document.documentElement.style.setProperty('--primary', companyData.primary_color);
        document.documentElement.style.setProperty('--secondary', companyData.secondary_color);
      }
      toast.success('Empresa actualizada');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally { setSavingCompany(false); }
  };

  const handleSaveModules = async () => {
    setSavingCompany(true);
    try {
      await companiesAPI.updateMyModules(companyModules);
      const companyStr = localStorage.getItem('company');
      if (companyStr) {
        const c = JSON.parse(companyStr);
        c.modules = companyModules;
        localStorage.setItem('company', JSON.stringify(c));
      }
      toast.success('Módulos actualizados');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally { setSavingCompany(false); }
  };

  const toggleModule = (mod: string) => {
    setCompanyModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editUser) {
        await usersAPI.update(editUser.id, formData);
        toast.success('Usuario actualizado');
      } else {
        await usersAPI.create(formData);
        toast.success('Usuario creado');
      }
      setShowUserModal(false); resetForm(); loadData();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error');
      }
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('Usuario eliminado');
      loadData();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error');
      }
    }
  };

  const resetForm = () => { setEditUser(null); setFormData({ name: '', email: '', password: '', role: 'user' }); };
  const openEditUser = (u: AllUser) => { setEditUser(u); setFormData({ name: u.name, email: u.email, password: '', role: u.role }); setShowUserModal(true); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div><h1 className="text-2xl font-bold text-gray-800">Configuración</h1><p className="text-gray-500">Gestiona tu cuenta, empresa y usuarios</p></div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Palette size={20} /> Tema</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'theme-light', label: 'Claro', icon: Sun },
            { value: 'theme-dark', label: 'Oscuro', icon: Moon },
            { value: 'theme-silver', label: 'Silver', icon: Palette },
          ].map(t => {
            const Icon = t.icon;
            const active = currentTheme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => {
                  const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
                  if (userId) localStorage.setItem(`ito-theme-${userId}`, t.value);
                  document.documentElement.className = t.value;
                  setCurrentTheme(t.value);
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  active ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon size={20} className={active ? 'text-primary' : 'text-gray-500'} />
                <span className={`font-medium ${active ? 'text-primary' : 'text-gray-700'}`}>{t.label}</span>
                {active && <Check size={16} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><User size={20} /> Mi Perfil</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-field" placeholder="Dejar vacío para no cambiar" />
          </div>
          <button type="submit" className="btn-primary">Guardar Cambios</button>
        </form>
      </div>

      {isAdmin && (
        <div id="company" className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Building2 size={20} /> Mi Empresa</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
              <input type="text" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={companyData.description} onChange={e => setCompanyData({...companyData, description: e.target.value})} className="input-field" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input type="text" value={companyData.logo_url} onChange={e => setCompanyData({...companyData, logo_url: e.target.value})} className="input-field" placeholder="https://ejemplo.com/logo.png" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dominio de email</label>
              <input type="text" value={companyData.email_domain} onChange={e => setCompanyData({...companyData, email_domain: e.target.value})} className="input-field" placeholder="miempresa.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color primario</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={companyData.primary_color} onChange={e => setCompanyData({...companyData, primary_color: e.target.value})} className="w-10 h-10 rounded border" />
                  <input type="text" value={companyData.primary_color} onChange={e => setCompanyData({...companyData, primary_color: e.target.value})} className="input-field flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color secundario</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={companyData.secondary_color} onChange={e => setCompanyData({...companyData, secondary_color: e.target.value})} className="w-10 h-10 rounded border" />
                  <input type="text" value={companyData.secondary_color} onChange={e => setCompanyData({...companyData, secondary_color: e.target.value})} className="input-field flex-1" />
                </div>
              </div>
            </div>
            <button onClick={handleSaveCompany} disabled={savingCompany} className="btn-primary flex items-center gap-2">
              {savingCompany && <Loader2 className="animate-spin" size={16} />}
              Guardar Empresa
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Módulos habilitados</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {ALL_MODULES.map(mod => (
                <button key={mod} type="button" onClick={() => toggleModule(mod)}
                  className={`p-2 rounded-lg text-sm border transition-all ${
                    companyModules.includes(mod)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary'
                  }`}>
                  {MODULE_LABELS[mod]}
                </button>
              ))}
            </div>
            <button onClick={handleSaveModules} disabled={savingCompany} className="btn-primary flex items-center gap-2">
              {savingCompany && <Loader2 className="animate-spin" size={16} />}
              Guardar Módulos
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div id="users" className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Shield size={20} /> Gestión de Usuarios</h2>
            <button onClick={() => { resetForm(); setShowUserModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> Nuevo Usuario</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Nombre</th><th className="text-left py-3 px-4">Email</th><th className="text-left py-3 px-4">Rol</th><th className="text-left py-3 px-4">Estado</th><th className="text-right py-3 px-4">Acciones</th>
              </tr></thead>
              <tbody>{allUsers.map(u => (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{u.name}</td><td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-primary/20 text-primaryDark' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-success/20 text-successDark' : 'bg-danger/20 text-dangerDark'}`}>{u.is_active ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="py-3 px-4"><div className="flex justify-end gap-2">
                    <button onClick={() => openEditUser(u)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit size={18} /></button>
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-danger hover:bg-danger/10 rounded-lg"><Trash2 size={18} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200"><h2 className="text-xl font-semibold">{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2></div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" required /></div>
              {!editUser && <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-field" required /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Rol</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-field"><option value="user">Usuario</option><option value="admin">Administrador</option></select></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowUserModal(false)} className="btn-outline flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">{editUser ? 'Actualizar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
