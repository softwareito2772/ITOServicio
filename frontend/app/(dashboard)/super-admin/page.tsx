'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Building2, X, Edit, Check } from 'lucide-react';
import { companiesAPI } from '@/lib/api';
import { toast } from 'sonner';

const AVAILABLE_MODULES = [
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

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', slug: '', email_domain: '', description: '',
    primary_color: '#7C9CBF', secondary_color: '#B4C7E7', logo_url: '',
    modules: [] as string[],
    admin_email: '', admin_password: '', admin_name: '',
  });
  const [editModules, setEditModules] = useState<string[]>([]);

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    try {
      const res = await companiesAPI.getAll();
      setCompanies(res.data);
    } catch {
      toast.error('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (mod: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(mod)
        ? prev.modules.filter(m => m !== mod)
        : [...prev.modules, mod]
    }));
  };

  const toggleEditModule = (mod: string) => {
    setEditModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.admin_email || !formData.admin_password || !formData.admin_name) {
      toast.error('Completa los datos del administrador');
      return;
    }
    setSaving(true);
    try {
      await companiesAPI.create(formData);
      toast.success('Empresa creada correctamente');
      setShowCreateModal(false);
      resetForm();
      loadCompanies();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al crear empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleEditModules = async () => {
    setSaving(true);
    try {
      await companiesAPI.updateModules(editingCompany.id, editModules);
      toast.success(`Módulos de ${editingCompany.name} actualizados`);
      setEditingCompany(null);
      loadCompanies();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const openEditModules = (company: any) => {
    setEditingCompany(company);
    setEditModules(company.modules || []);
  };

  const resetForm = () => {
    setFormData({
      name: '', slug: '', email_domain: '', description: '',
      primary_color: '#7C9CBF', secondary_color: '#B4C7E7', logo_url: '',
      modules: [], admin_email: '', admin_password: '', admin_name: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Super Admin</h1>
          <p className="text-gray-500">Gestión de empresas y módulos</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Nueva Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => (
          <div key={company.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: company.primary_color }}>
                  <Building2 size={24} className="text-white" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-800">{company.name}</h3>
                <p className="text-xs text-gray-500">{company.email_domain ? `@${company.email_domain}` : 'Sin dominio'}</p>
              </div>
            </div>
            {company.description && (
              <p className="text-sm text-gray-600 mb-3">{company.description}</p>
            )}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded" style={{ background: company.primary_color }} />
              <div className="w-4 h-4 rounded" style={{ background: company.secondary_color }} />
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {company.modules?.length > 0 ? company.modules.map((mod: string) => (
                <span key={mod} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {MODULE_LABELS[mod] || mod}
                </span>
              )) : (
                <span className="text-xs text-gray-400">Sin módulos</span>
              )}
            </div>
            <button
              onClick={() => openEditModules(company)}
              className="w-full btn-outline flex items-center justify-center gap-2 text-sm py-2"
            >
              <Edit size={16} />
              Editar Módulos
            </button>
          </div>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No hay empresas creadas</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Nueva Empresa</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="input-field" placeholder="mi-empresa" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dominio de email</label>
                <input type="text" value={formData.email_domain} onChange={e => setFormData({...formData, email_domain: e.target.value})} className="input-field" placeholder="miempresa.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={3} placeholder="Describe qué hace la empresa..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input type="text" value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} className="input-field" placeholder="https://ejemplo.com/logo.png" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color primario</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} className="w-10 h-10 rounded border" />
                    <input type="text" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} className="input-field flex-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color secundario</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} className="w-10 h-10 rounded border" />
                    <input type="text" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} className="input-field flex-1" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Módulos</label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_MODULES.map(mod => (
                    <button key={mod} type="button" onClick={() => toggleModule(mod)}
                      className={`p-2 rounded-lg text-sm border transition-all ${
                        formData.modules.includes(mod)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary'
                      }`}>
                      {MODULE_LABELS[mod]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-bold text-gray-800 mb-3">Administrador de la empresa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input type="text" value={formData.admin_name} onChange={e => setFormData({...formData, admin_name: e.target.value})} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={formData.admin_email} onChange={e => setFormData({...formData, admin_email: e.target.value})} className="input-field" required />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input type="password" value={formData.admin_password} onChange={e => setFormData({...formData, admin_password: e.target.value})} className="input-field" required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  Crear Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Módulos de {editingCompany.name}</h2>
                <p className="text-sm text-gray-500">Activa o desactiva módulos para esta empresa</p>
              </div>
              <button onClick={() => setEditingCompany(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_MODULES.map(mod => {
                  const active = editModules.includes(mod);
                  return (
                    <button key={mod} type="button" onClick={() => toggleEditModule(mod)}
                      className={`flex items-center gap-2 p-3 rounded-lg text-sm border transition-all ${
                        active
                          ? 'bg-primary/10 border-primary text-primaryDark'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {active ? <Check size={16} /> : <div className="w-4 h-4 rounded border border-gray-300" />}
                      {MODULE_LABELS[mod]}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingCompany(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleEditModules} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  Guardar Módulos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
