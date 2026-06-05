'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, X, Upload, Camera } from 'lucide-react';
import { equipmentAPI, clientsAPI, categoriesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Equipment {
  id: number;
  client_id: number;
  client?: { id: number; name: string };
  category_id?: number;
  type_name: string;
  brand?: string;
  model: string;
  serial_number: string;
  description?: string;
  purchase_date?: string;
  manufacturer_warranty?: string;
  service_location: string;
  status: string;
  arrival_date: string;
  created_at: string;
}

interface Client {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    category_id: '',
    type_name: '',
    brand: '',
    model: '',
    serial_number: '',
    description: '',
    purchase_date: '',
    manufacturer_warranty: '',
    service_location: 'local',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eqRes, clientsRes, catsRes] = await Promise.all([
        equipmentAPI.getAll(0, 100, undefined, undefined, undefined, search || undefined),
        clientsAPI.getAll(),
        categoriesAPI.getAll('equipment'),
      ]);
      setEquipment(eqRes.data);
      setClients(clientsRes.data);
      setCategories(catsRes.data);
    } catch (error) {
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      if (editingEquipment) {
        await equipmentAPI.update(editingEquipment.id, data);
        toast.success('Equipo actualizado');
      } else {
        await equipmentAPI.create(data);
        toast.success('Equipo registrado');
      }
      setShowModal(false);
      resetForm();
      loadData();
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

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({
      client_id: eq.client_id.toString(),
      category_id: eq.category_id?.toString() || '',
      type_name: eq.type_name,
      brand: eq.brand || '',
      model: eq.model,
      serial_number: eq.serial_number,
      description: eq.description || '',
      purchase_date: eq.purchase_date || '',
      manufacturer_warranty: eq.manufacturer_warranty || '',
      service_location: eq.service_location,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    try {
      await equipmentAPI.delete(id);
      toast.success('Equipo eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingEquipment(null);
    setFormData({
      client_id: '',
      category_id: '',
      type_name: '',
      brand: '',
      model: '',
      serial_number: '',
      description: '',
      purchase_date: '',
      manufacturer_warranty: '',
      service_location: 'local',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/20 text-warningDark',
      in_progress: 'bg-primary/20 text-primaryDark',
      completed: 'bg-success/20 text-successDark',
      delivered: 'bg-secondary/20 text-secondaryDark',
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Equipos</h1>
          <p className="text-gray-500">Gestiona los equipos de tus clientes</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Nuevo Equipo
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por serie, modelo o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="input-field pl-10"
            />
          </div>
          <button onClick={loadData} className="btn-outline">Buscar</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500">No hay equipos registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((eq) => (
              <div key={eq.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{eq.type_name}</h3>
                    <p className="text-sm text-gray-500">{eq.brand} {eq.model}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(eq.status)}`}>
                    {eq.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p><span className="font-medium">Serie:</span> {eq.serial_number}</p>
                  <p><span className="font-medium">Cliente:</span> {eq.client?.name || 'N/A'}</p>
                  <p><span className="font-medium">Lugar:</span> {eq.service_location === 'local' ? 'En local' : 'En sitio'}</p>
                  <p><span className="font-medium">Llegada:</span> {formatDate(eq.arrival_date)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(eq)} className="flex-1 btn-outline text-sm py-1">
                    <Edit size={16} className="inline mr-1" /> Editar
                  </button>
                  <button onClick={() => handleDelete(eq.id)} className="px-3 py-1 text-danger hover:bg-danger/10 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingEquipment ? 'Editar Equipo' : 'Registrar Equipo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <input
                    type="text"
                    value={formData.type_name}
                    onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                    className="input-field"
                    placeholder="Laptop, Celular..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Serie *</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Compra</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lugar Servicio</label>
                  <select
                    value={formData.service_location}
                    onChange={(e) => setFormData({ ...formData, service_location: e.target.value })}
                    className="input-field"
                  >
                    <option value="local">En local</option>
                    <option value="sitio">En sitio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garantía Fabricante</label>
                <input
                  type="text"
                  value={formData.manufacturer_warranty}
                  onChange={(e) => setFormData({ ...formData, manufacturer_warranty: e.target.value })}
                  className="input-field"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingEquipment ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
