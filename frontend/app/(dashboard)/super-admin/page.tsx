'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Building2, X, Edit, Check, Ban, CheckCircle } from 'lucide-react';
import { companiesAPI } from '@/lib/api';
import { toast } from 'sonner';

const AVAILABLE_MODULES = [
  'ventas', 'mantenimiento', 'reparaciones', 'equipos',
  'productos', 'clientes', 'garantias', 'reportes', 'inventario',
  'taller'
];

const MODULE_LABELS: Record<string, string> = {
  ventas: 'Ventas', mantenimiento: 'Mantenimiento', reparaciones: 'Reparaciones',
  equipos: 'Equipos/Vehículos', productos: 'Productos', clientes: 'Clientes',
  garantias: 'Garantías', reportes: 'Reportes', inventario: 'Inventario', taller: 'Taller',
};

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [editTab, setEditTab] = useState<'modules' | 'details'>('modules');
  const [formData, setFormData] = useState({
    name: '', slug: '', email_domain: '', description: '',
    primary_color: '#7C9CBF', secondary_color: '#B4C7E7', logo_url: '',
    modules: [] as string[],
    admin_email: '', admin_password: '', admin_name: '',
  });
  const [editForm, setEditForm] = useState({
    name: '', slug: '', email_domain: '', description: '',
    primary_color: '#7C9CBF', secondary_color: '#B4C7E7', logo_url: '',
  });

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    try {
      const res = await companiesAPI.getAll();
      setCompanies(res.data);
    } catch { toast.error('Error al cargar empresas'); }
    finally { setLoading(false); }
  };

  const toggleModule = (mod: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(mod) ? prev.modules.filter(m => m !== mod) : [...prev.modules, mod]
    }));
  };

  const toggleEditModule = (mod: string) => {
    setEditModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.admin_email || !formData.admin_password || !formData.admin_name) {
      toast.error('Completa los datos del administrador');
      return;
    }
    setSaving(true);
    try {
      let logoUrl = formData.logo_url;
      if (logoFile) {
        setUploading(true);
        const uploadRes = await companiesAPI.uploadLogo(logoFile);
        logoUrl = uploadRes.data.url;
        setUploading(false);
      }
      await companiesAPI.create({ ...formData, logo_url: logoUrl });
      toast.success('Empresa creada correctamente');
      setShowCreateModal(false);
      resetForm();
      loadCompanies();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al crear empresa'); }
    finally { setSaving(false); }
  };

  const handleEditModules = async () => {
    setSaving(true);
    try {
      await companiesAPI.updateModules(editCompany.id, editModules);
      toast.success(`Módulos de ${editCompany.name} actualizados`);
      setEditCompany(null);
      loadCompanies();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al actualizar'); }
    finally { setSaving(false); }
  };

  const handleEditDetails = async () => {
    setSaving(true);
    try {
      let logoUrl = editForm.logo_url;
      if (logoFile) {
        setUploading(true);
        const uploadRes = await companiesAPI.uploadLogo(logoFile);
        logoUrl = uploadRes.data.url;
        setUploading(false);
      }
      await companiesAPI.update(editCompany.id, { ...editForm, logo_url: logoUrl });
      toast.success(`Datos de ${editForm.name} actualizados`);
      setEditCompany(null);
      loadCompanies();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al actualizar'); }
    finally { setSaving(false); }
  };

  const handleToggleSuspend = async (company: any) => {
    const action = company.is_suspended ? 'reactivar' : 'suspender';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} empresa "${company.name}"? Los usuarios no podrán acceder.`)) return;
    setSaving(true);
    try {
      const res = await companiesAPI.toggleSuspend(company.id);
      toast.success(res.data.message);
      loadCompanies();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const openEditCompany = (company: any) => {
    setEditCompany(company);
    setEditModules(company.modules || []);
    setEditForm({
      name: company.name || '',
      slug: company.slug || '',
      email_domain: company.email_domain || '',
      description: company.description || '',
      primary_color: company.primary_color || '#7C9CBF',
      secondary_color: company.secondary_color || '#B4C7E7',
      logo_url: company.logo_url || '',
    });
    setEditTab('details');
    setLogoFile(null);
    setLogoPreview('');
  };

  const resetForm = () => {
    setFormData({
      name: '', slug: '', email_domain: '', description: '',
      primary_color: '#7C9CBF', secondary_color: '#B4C7E7', logo_url: '',
      modules: [], admin_email: '', admin_password: '', admin_name: '',
    });
    setLogoFile(null);
    setLogoPreview('');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Super Admin</h1>
          <p className="text-gray-500">Gestión de empresas y módulos</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Nueva Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => (
          <div key={company.id} className={`card ${company.is_suspended ? 'border-2 border-danger opacity-75' : ''}`}>
            {company.is_suspended && (
              <div className="bg-danger/10 text-danger text-xs font-bold px-3 py-1 rounded-t-lg -mt-4 -mx-4 mb-3 flex items-center gap-1">
                <Ban size={12} /> SUSPENDIDA
              </div>
            )}
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
            {company.description && <p className="text-sm text-gray-600 mb-3">{company.description}</p>}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded" style={{ background: company.primary_color }} />
              <div className="w-4 h-4 rounded" style={{ background: company.secondary_color }} />
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {company.modules?.length > 0 ? company.modules.map((mod: string) => (
                <span key={mod} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{MODULE_LABELS[mod] || mod}</span>
              )) : <span className="text-xs text-gray-400">Sin módulos</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEditCompany(company)} className="flex-1 btn-outline flex items-center justify-center gap-1 text-sm py-2">
                <Edit size={14} /> Editar
              </button>
              <button onClick={() => handleToggleSuspend(company)} disabled={saving}
                className={`flex-1 flex items-center justify-center gap-1 text-sm py-2 rounded-lg border font-medium transition-colors ${
                  company.is_suspended
                    ? 'border-success text-success hover:bg-success/10'
                    : 'border-danger text-danger hover:bg-danger/10'
                }`}>
                {company.is_suspended ? <><CheckCircle size={14} /> Reactivar</> : <><Ban size={14} /> Suspender</>}
              </button>
            </div>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">Nueva Empresa</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  {(logoPreview || formData.logo_url) && <img src={logoPreview || formData.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />}
                  <div className="flex-1">
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }}
                      className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer" />
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG o WebP. Max 2MB.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_MODULES.map(mod => (
                    <button key={mod} type="button" onClick={() => toggleModule(mod)}
                      className={`p-2 rounded-lg text-sm border transition-all ${formData.modules.includes(mod) ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary'}`}>
                      {MODULE_LABELS[mod]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-bold text-gray-800 mb-3">Administrador de la empresa</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <button type="submit" disabled={saving || uploading} className="btn-primary flex items-center gap-2">
                  {(saving || uploading) && <Loader2 className="animate-spin" size={16} />}
                  {uploading ? 'Subiendo logo...' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Editar: {editCompany.name}</h2>
                <p className="text-sm text-gray-500">Modifica datos o módulos de la empresa</p>
              </div>
              <button onClick={() => setEditCompany(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex border-b border-gray-200">
              <button onClick={() => setEditTab('details')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${editTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                Datos de la Empresa
              </button>
              <button onClick={() => setEditTab('modules')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${editTab === 'modules' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                Módulos
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editTab === 'details' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                      <input type="text" value={editForm.slug} onChange={e => setEditForm({...editForm, slug: e.target.value})} className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dominio de email</label>
                    <input type="text" value={editForm.email_domain} onChange={e => setEditForm({...editForm, email_domain: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="input-field" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                    <div className="flex items-center gap-4">
                      {(logoPreview || editForm.logo_url) && <img src={logoPreview || editForm.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />}
                      <div className="flex-1">
                        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); } }}
                          className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color primario</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editForm.primary_color} onChange={e => setEditForm({...editForm, primary_color: e.target.value})} className="w-10 h-10 rounded border" />
                        <input type="text" value={editForm.primary_color} onChange={e => setEditForm({...editForm, primary_color: e.target.value})} className="input-field flex-1" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color secundario</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editForm.secondary_color} onChange={e => setEditForm({...editForm, secondary_color: e.target.value})} className="w-10 h-10 rounded border" />
                        <input type="text" value={editForm.secondary_color} onChange={e => setEditForm({...editForm, secondary_color: e.target.value})} className="input-field flex-1" />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {editTab === 'modules' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_MODULES.map(mod => {
                    const active = editModules.includes(mod);
                    return (
                      <button key={mod} type="button" onClick={() => toggleEditModule(mod)}
                        className={`flex items-center gap-2 p-3 rounded-lg text-sm border transition-all ${active ? 'bg-primary/10 border-primary text-primaryDark' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {active ? <Check size={16} /> : <div className="w-4 h-4 rounded border border-gray-300" />}
                        {MODULE_LABELS[mod]}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 mt-4">
                <button onClick={() => setEditCompany(null)} className="btn-secondary">Cancelar</button>
                <button onClick={editTab === 'details' ? handleEditDetails : handleEditModules} disabled={saving}
                  className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  {editTab === 'details' ? 'Guardar Datos' : 'Guardar Módulos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
