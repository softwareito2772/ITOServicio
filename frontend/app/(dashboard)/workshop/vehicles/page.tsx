'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Search, Edit, Trash2, X, Car, Camera } from 'lucide-react';
import { workshopAPI, clientsAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Vehicle {
  id: number;
  client_id: number;
  client?: any;
  plate_number: string;
  color?: string;
  vehicle_type: string;
  brand?: string;
  model: string;
  year?: number;
  mileage: number;
  assigned_to?: string;
  brought_by?: string;
  brought_by_phone?: string;
  image_url?: string;
  is_active: boolean;
}

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedán' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'suv', label: 'SUV' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'otro', label: 'Otro' },
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    client_id: '', plate_number: '', color: '', vehicle_type: 'sedan',
    brand: '', model: '', year: '', mileage: '0',
    assigned_to: '', brought_by: '', brought_by_phone: '', image_url: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, cRes] = await Promise.all([
        workshopAPI.getVehicles(search || undefined),
        clientsAPI.getAll(),
      ]);
      setVehicles(vRes.data);
      setClients(cRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.plate_number || !formData.model) {
      toast.error('Completa los campos obligatorios'); return;
    }
    const payload = { ...formData, client_id: parseInt(formData.client_id), year: formData.year ? parseInt(formData.year) : null, mileage: parseInt(formData.mileage) || 0 };
    try {
      if (editingVehicle) {
        await workshopAPI.updateVehicle(editingVehicle.id, payload);
        toast.success('Vehículo actualizado');
      } else {
        await workshopAPI.createVehicle(payload);
        toast.success('Vehículo registrado');
      }
      setShowModal(false); resetForm(); loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      client_id: v.client_id?.toString() || '',
      plate_number: v.plate_number, color: v.color || '',
      vehicle_type: v.vehicle_type, brand: v.brand || '',
      model: v.model, year: v.year?.toString() || '',
      mileage: v.mileage?.toString() || '0',
      assigned_to: v.assigned_to || '', brought_by: v.brought_by || '',
      brought_by_phone: v.brought_by_phone || '', image_url: v.image_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar este vehículo?')) return;
    try { await workshopAPI.deleteVehicle(id); toast.success('Vehículo desactivado'); loadData(); }
    catch { toast.error('Error al eliminar'); }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setFormData({ client_id: '', plate_number: '', color: '', vehicle_type: 'sedan', brand: '', model: '', year: '', mileage: '0', assigned_to: '', brought_by: '', brought_by_phone: '', image_url: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setFormData({ ...formData, image_url: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Flota de Vehículos</h1>
          <p className="text-gray-500">Registro de vehículos del taller</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Nuevo Vehículo
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por placa, marca o modelo..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <Car size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay vehículos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Placa</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Vehículo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Cliente</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Km</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Acciones</th>
              </tr></thead>
              <tbody>{vehicles.map(v => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setShowDetail(v)}>
                  <td className="py-3 px-4 font-mono font-bold text-primary">{v.plate_number}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium">{v.brand} {v.model}</p>
                    <p className="text-xs text-gray-500">{v.color} {v.year ? `- ${v.year}` : ''}</p>
                  </td>
                  <td className="py-3 px-4 text-sm">{v.client?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm hidden sm:table-cell capitalize">{v.vehicle_type}</td>
                  <td className="py-3 px-4 text-sm hidden sm:table-cell">{v.mileage?.toLocaleString()} km</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(v)} className="text-gray-400 hover:text-primary"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-lg max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold">Detalle del Vehículo</h2>
              <button onClick={() => setShowDetail(null)} className="p-1"><X size={24} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {showDetail.image_url && (
                <img src={showDetail.image_url} alt={`${showDetail.brand} ${showDetail.model}`} className="w-full h-48 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Placa</p><p className="font-mono font-bold text-lg text-primary">{showDetail.plate_number}</p></div>
                <div><p className="text-xs text-gray-500">Tipo</p><p className="font-medium capitalize">{showDetail.vehicle_type}</p></div>
                <div><p className="text-xs text-gray-500">Marca</p><p className="font-medium">{showDetail.brand || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Modelo</p><p className="font-medium">{showDetail.model}</p></div>
                <div><p className="text-xs text-gray-500">Color</p><p className="font-medium">{showDetail.color || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Año</p><p className="font-medium">{showDetail.year || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Odómetro</p><p className="font-medium">{showDetail.mileage?.toLocaleString()} km</p></div>
                <div><p className="text-xs text-gray-500">Cliente</p><p className="font-medium">{showDetail.client?.name || 'N/A'}</p></div>
              </div>
              {showDetail.assigned_to && <div><p className="text-xs text-gray-500">Asignado a</p><p className="font-medium">{showDetail.assigned_to}</p></div>}
              {showDetail.brought_by && <div><p className="text-xs text-gray-500">Traído por</p><p className="font-medium">{showDetail.brought_by} {showDetail.brought_by_phone ? `(${showDetail.brought_by_phone})` : ''}</p></div>}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold">{editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col items-center gap-2">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed flex items-center justify-center">
                    <Camera size={32} className="text-gray-400" />
                  </div>
                )}
                <label className="text-sm text-primary cursor-pointer hover:underline">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  Subir imagen
                </label>
                <p className="text-xs text-gray-400">Máx 2MB, JPG/PNG</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="input-field" required>
                    <option value="">Seleccionar cliente</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
                  <input type="text" value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value.toUpperCase()})} className="input-field font-mono" placeholder="ABC-123" required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="input-field" placeholder="Toyota" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                  <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="input-field" placeholder="Corolla" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="input-field" placeholder="2020" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="input-field" placeholder="Rojo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={formData.vehicle_type} onChange={e => setFormData({...formData, vehicle_type: e.target.value})} className="input-field">
                    {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Odómetro (km)</label>
                  <input type="number" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a (quién usa el vehículo)</label>
                <input type="text" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})} className="input-field" placeholder="Nombre de la persona" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Traído por (si no es el dueño)</label>
                  <input type="text" value={formData.brought_by} onChange={e => setFormData({...formData, brought_by: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.brought_by_phone} onChange={e => setFormData({...formData, brought_by_phone: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editingVehicle ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
