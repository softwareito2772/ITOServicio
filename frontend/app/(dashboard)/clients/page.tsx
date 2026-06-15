'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, X, User, Building2 } from 'lucide-react';
import { clientsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Client {
  id: number;
  client_type: string;
  name: string;
  last_name?: string;
  cedula?: string;
  phone: string;
  email?: string;
  address?: string;
  company_name?: string;
  ruc?: string;
  dv?: string;
  province?: string;
  district?: string;
  corregimiento?: string;
  notes?: string;
  created_at: string;
}

const emptyForm = {
  client_type: 'natural',
  name: '',
  last_name: '',
  cedula: '',
  phone: '',
  email: '',
  address: '',
  company_name: '',
  ruc: '',
  dv: '',
  province: '',
  district: '',
  corregimiento: '',
  notes: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll(0, 100, search || undefined);
      setClients(response.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, formData);
        toast.success('Cliente actualizado');
      } else {
        await clientsAPI.create(formData);
        toast.success('Cliente creado');
      }
      setShowModal(false);
      resetForm();
      loadClients();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail.forEach((d: any) => toast.error(`${d.loc?.slice(-1)}: ${d.msg}`));
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error al guardar');
      }
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_type: client.client_type || 'natural',
      name: client.name,
      last_name: client.last_name || '',
      cedula: client.cedula || '',
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      company_name: client.company_name || '',
      ruc: client.ruc || '',
      dv: client.dv || '',
      province: client.province || '',
      district: client.district || '',
      corregimiento: client.corregimiento || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await clientsAPI.delete(id);
      toast.success('Cliente eliminado');
      loadClients();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({ ...emptyForm });
  };

  const getClientDisplay = (client: Client) => {
    if (client.client_type === 'contribuyente') {
      return client.company_name || client.name;
    }
    return `${client.name} ${client.last_name || ''}`.trim();
  };

  const getDocDisplay = (client: Client) => {
    if (client.client_type === 'contribuyente') {
      return client.ruc ? `RUC: ${client.ruc}` : '-';
    }
    return client.cedula ? `Céd: ${client.cedula}` : '-';
  };

  const getAddressDisplay = (client: Client) => {
    if (client.client_type === 'contribuyente') {
      const parts = [client.province, client.district, client.corregimiento].filter(Boolean);
      return parts.length ? parts.join(', ') : (client.address || '-');
    }
    return client.address || '-';
  };

  const isNatural = formData.client_type === 'natural';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-500">Gestiona tus clientes</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadClients()}
              className="input-field pl-10"
            />
          </div>
          <button onClick={loadClients} className="btn-outline">Buscar</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay clientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Nombre / Empresa</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Documento</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Teléfono</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Dirección</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.client_type === 'contribuyente'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {client.client_type === 'contribuyente' ? <Building2 size={12} /> : <User size={12} />}
                        {client.client_type === 'contribuyente' ? 'Contrib.' : 'Natural'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{getClientDisplay(client)}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{getDocDisplay(client)}</td>
                    <td className="py-3 px-4 text-gray-600">{client.phone}</td>
                    <td className="py-3 px-4 text-gray-600">{client.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{getAddressDisplay(client)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">

              {!editingClient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cliente *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...emptyForm, client_type: 'natural' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        isNatural
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <User size={20} />
                      <span className="font-medium">Natural</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...emptyForm, client_type: 'contribuyente' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        !isNatural
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Building2 size={20} />
                      <span className="font-medium">Contribuyente</span>
                    </button>
                  </div>
                </div>
              )}

              {editingClient && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">Tipo:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isNatural ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isNatural ? <User size={12} /> : <Building2 size={12} />}
                    {isNatural ? 'Natural' : 'Contribuyente'}
                  </span>
                </div>
              )}

              {isNatural ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                      <input
                        type="text"
                        value={formData.cedula}
                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                        className="input-field"
                        placeholder="8-123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input-field"
                      rows={2}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value, name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
                      <input
                        type="text"
                        value={formData.ruc}
                        onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                        className="input-field"
                        required
                        placeholder="15-123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">DV *</label>
                      <input
                        type="text"
                        value={formData.dv}
                        onChange={(e) => setFormData({ ...formData, dv: e.target.value })}
                        className="input-field"
                        required
                        maxLength={2}
                        placeholder="01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                      <input
                        type="text"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Distrito</label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Corregimiento</label>
                      <input
                        type="text"
                        value={formData.corregimiento}
                        onChange={(e) => setFormData({ ...formData, corregimiento: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingClient ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
