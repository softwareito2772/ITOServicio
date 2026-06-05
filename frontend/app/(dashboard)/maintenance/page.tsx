'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Loader2, X, Upload, MapPin, Calendar, DollarSign, Package, Edit3, Save } from 'lucide-react';
import { maintenanceAPI, equipmentAPI, usersAPI, categoriesAPI, clientsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Maintenance { id: number; equipment_id: number; equipment: any; technician: any; description: string; technician_notes?: string; service_location: string; start_date: string; end_date?: string; next_maintenance_date?: string; cost: number; status: string; images: any[]; created_at: string; }
interface Equipment { id: number; client_id: number; client: { id: number; name: string; phone: string; email?: string; address?: string }; category_id?: number; category?: { id: number; name: string; type: string }; type_name: string; brand: string; model: string; serial_number: string; description?: string; status: string; }
interface User { id: number; name: string; }
interface Category { id: number; name: string; type: string; }

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/20 text-warningDark' },
  { value: 'in_progress', label: 'En Proceso', color: 'bg-primary/20 text-primaryDark' },
  { value: 'waiting_parts', label: 'Esperando Piezas', color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: 'Completado', color: 'bg-success/20 text-successDark' },
  { value: 'delivered', label: 'Entregado', color: 'bg-secondary/20 text-secondaryDark' },
];

const NEXT_MAINTENANCE_OPTIONS = [
  { label: '1 mes', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 año', days: 365 },
];

const WARRANTY_OPTIONS = [
  { label: '1 mes', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
  { label: '2 años', months: 24 },
  { label: '5 años', months: 60 },
  { label: '7 años', months: 84 },
  { label: '10 años', months: 120 },
];

export default function MaintenancePage() {
  const [data, setData] = useState<Maintenance[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Maintenance | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ equipment_id: number; category_id: string } | null>(null);

  const [arrivalImages, setArrivalImages] = useState<File[]>([]);
  const [arrivalPreviews, setArrivalPreviews] = useState<string[]>([]);
  const [departureImages, setDepartureImages] = useState<File[]>([]);
  const [departurePreviews, setDeparturePreviews] = useState<string[]>([]);
  const arrivalInputRef = useRef<HTMLInputElement>(null);
  const departureInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    equipment_id: '',
    description: '',
    technician_notes: '',
    service_location: 'local',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    next_maintenance_date: '',
    cost: '',
    status: 'pending',
    warranty_months: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [mRes, eqRes, techRes, catRes] = await Promise.all([
        maintenanceAPI.getAll(),
        equipmentAPI.getAll(),
        usersAPI.getAll(),
        categoriesAPI.getAll(),
      ]);
      setData(mRes.data);
      setEquipment(eqRes.data);
      setTechnicians(techRes.data);
      setCategories(catRes.data);
    } catch (error) { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleImageSelect = (files: FileList | null, type: 'arrival' | 'departure') => {
    if (!files) return;
    const fileArray = Array.from(files);
    const previews = fileArray.map(file => URL.createObjectURL(file));
    if (type === 'arrival') {
      setArrivalImages([...arrivalImages, ...fileArray]);
      setArrivalPreviews([...arrivalPreviews, ...previews]);
    } else {
      setDepartureImages([...departureImages, ...fileArray]);
      setDeparturePreviews([...departurePreviews, ...previews]);
    }
  };

  const removeImage = (index: number, type: 'arrival' | 'departure') => {
    if (type === 'arrival') {
      setArrivalImages(arrivalImages.filter((_, i) => i !== index));
      setArrivalPreviews(arrivalPreviews.filter((_, i) => i !== index));
    } else {
      setDepartureImages(departureImages.filter((_, i) => i !== index));
      setDeparturePreviews(departurePreviews.filter((_, i) => i !== index));
    }
  };

  const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api`) : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');
  const fetchAPI = async (url: string, method: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data, status: res.status } };
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = {...formData};
    const itemId = editingItem?.id;

    if (!fd.equipment_id) { toast.error('Selecciona un equipo'); return; }
    if (!fd.description) { toast.error('Escribe una descripción'); return; }

    const payload = new FormData();
    payload.append('equipment_id', String(fd.equipment_id));
    payload.append('description', fd.description);
    if (fd.service_location) payload.append('service_location', fd.service_location);
    if (fd.start_date) payload.append('start_date', fd.start_date);
    if (fd.end_date) payload.append('end_date', fd.end_date);
    if (fd.next_maintenance_date) payload.append('next_maintenance_date', fd.next_maintenance_date);
    if (fd.status) payload.append('status', fd.status);
    if (fd.cost) payload.append('cost', fd.cost);
    if (fd.technician_notes) payload.append('technician_notes', fd.technician_notes);
    if (fd.warranty_months) payload.append('warranty_months', fd.warranty_months);
    arrivalImages.forEach(img => payload.append('arrival_images', img));
    departureImages.forEach(img => payload.append('departure_images', img));

    try {
      if (itemId) {
        await fetchAPI(`/maintenance/${itemId}`, 'PUT', payload);
        toast.success('Mantenimiento actualizado');
      } else {
        await fetchAPI('/maintenance/', 'POST', payload);
        toast.success('Mantenimiento registrado');
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

  const handleEdit = (item: Maintenance) => {
    setEditingItem(item);
    setFormData({
      equipment_id: item.equipment_id?.toString() || '',
      description: item.description,
      technician_notes: item.technician_notes || '',
      service_location: item.service_location,
      start_date: item.start_date || new Date().toISOString().split('T')[0],
      end_date: item.end_date || '',
      next_maintenance_date: item.next_maintenance_date || '',
      cost: item.cost?.toString() || '',
      status: item.status,
      warranty_months: '',
    });
    setShowModal(true);
  };

  const setNextMaintenance = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFormData(prev => ({ ...prev, next_maintenance_date: date.toISOString().split('T')[0] }));
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      equipment_id: '', description: '', technician_notes: '',
      service_location: 'local', start_date: new Date().toISOString().split('T')[0],
      end_date: '', next_maintenance_date: '', cost: '', status: 'pending', warranty_months: '',
    });
    setArrivalImages([]);
    setArrivalPreviews([]);
    setDepartureImages([]);
    setDeparturePreviews([]);
  };

  const handleUpdateCategory = async (equipmentId: number) => {
    if (!editingCategory) return;
    try {
      await equipmentAPI.update(equipmentId, { category_id: parseInt(editingCategory.category_id) || null });
      toast.success('Categoría actualizada');
      setEditingCategory(null);
      loadData();
    } catch { toast.error('Error al actualizar categoría'); }
  };

  const getStatusBadge = (status: string) => {
    return STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  };

  const filterImages = (images: any[], type: string) =>
    images?.filter(i => i.image_type === type) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mantenimiento</h1>
          <p className="text-gray-500">Registro y control de mantenimientos</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Nuevo Mantenimiento
        </button>
      </div>

      <div className="card">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
         : data.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No hay mantenimientos registrados</p></div>
         : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map(m => {
              const badge = getStatusBadge(m.status);
              const arrivalImagesList = filterImages(m.images, 'before');
              const departureImagesList = filterImages(m.images, 'after');
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{m.equipment?.brand} {m.equipment?.model}</h3>
                      <p className="text-sm text-gray-500 truncate">{m.equipment?.type_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${badge.color}`}>{badge.label}</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Cliente</p>
                    <p className="text-sm font-medium text-gray-800">{m.equipment?.client?.name}</p>
                    <p className="text-xs text-gray-500">{m.equipment?.client?.phone}</p>
                    {m.equipment?.category && (
                      <span className="inline-block mt-1 text-xs bg-primary/10 text-primaryDark px-2 py-0.5 rounded-full">
                        {m.equipment.category.name}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{m.description}</p>

                  <div className="space-y-1 text-xs text-gray-500 mb-2">
                    <p className="flex items-center gap-1"><MapPin size={12} /> {m.service_location === 'local' ? 'En local' : 'En sitio'}</p>
                    <p className="flex items-center gap-1"><Calendar size={12} /> Registro: {formatDate(m.start_date)}</p>
                    {m.end_date && <p className="flex items-center gap-1"><Calendar size={12} /> Fin: {formatDate(m.end_date)}</p>}
                    {m.next_maintenance_date && <p className="flex items-center gap-1 text-success"><Calendar size={12} /> Próximo: {formatDate(m.next_maintenance_date)}</p>}
                    {m.cost > 0 && <p className="flex items-center gap-1 font-medium"><DollarSign size={12} /> Costo: ${m.cost.toFixed(2)}</p>}
                  </div>

                  {(arrivalImagesList.length > 0 || departureImagesList.length > 0) && (
                    <div className="mb-3">
                      {arrivalImagesList.length > 0 && (
                        <div className="mb-1">
                          <p className="text-xs text-gray-400 mb-1">Llegada ({arrivalImagesList.length})</p>
                          <div className="flex gap-1">
                            {arrivalImagesList.slice(0, 3).map((img: any, i: number) => (
                              <img key={i} src={img.image_url} alt="" className="w-10 h-10 object-cover rounded-lg cursor-pointer" onClick={() => window.open(img.image_url)} />
                            ))}
                            {arrivalImagesList.length > 3 && <span className="text-xs text-gray-400 self-end">+{arrivalImagesList.length - 3}</span>}
                          </div>
                        </div>
                      )}
                      {departureImagesList.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Salida ({departureImagesList.length})</p>
                          <div className="flex gap-1">
                            {departureImagesList.slice(0, 3).map((img: any, i: number) => (
                              <img key={i} src={img.image_url} alt="" className="w-10 h-10 object-cover rounded-lg cursor-pointer" onClick={() => window.open(img.image_url)} />
                            ))}
                            {departureImagesList.length > 3 && <span className="text-xs text-gray-400 self-end">+{departureImagesList.length - 3}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(m)} className="flex-1 btn-outline text-sm flex items-center justify-center gap-1">
                      <Edit3 size={14} /> Editar
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : m.id)} className="btn-outline text-sm px-3">
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                      <p><span className="text-gray-500">Técnico:</span> {m.technician?.name || 'No asignado'}</p>
                      {m.technician_notes && <p><span className="text-gray-500">Notas:</span> {m.technician_notes}</p>}
                      <p><span className="text-gray-500">Serial:</span> {m.equipment?.serial_number}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Categoría:</span>
                        {editingCategory?.equipment_id === m.equipment_id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <select
                              value={editingCategory.category_id}
                              onChange={e => setEditingCategory({ ...editingCategory, category_id: e.target.value })}
                              className="input-field text-xs py-1 flex-1"
                            >
                              <option value="">Sin categoría</option>
                              {categories.filter(c => c.type === 'equipment' || c.type === 'service').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <button onClick={() => handleUpdateCategory(m.equipment_id)} className="text-success"><Save size={16} /></button>
                            <button onClick={() => setEditingCategory(null)} className="text-gray-400"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{m.equipment?.category?.name || 'Sin categoría'}</span>
                            <button onClick={() => setEditingCategory({ equipment_id: m.equipment_id, category_id: m.equipment?.category_id?.toString() || '' })} className="text-gray-400 hover:text-primary">
                              <Edit3 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingItem ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipo *</label>
                <select value={formData.equipment_id} onChange={e => setFormData({...formData, equipment_id: e.target.value})} className="input-field" required>
                  <option value="">Seleccionar equipo</option>
                  {equipment.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.brand} {eq.model} - {eq.client?.name} ({eq.serial_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Registro *</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del servicio *</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={3} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Técnico</label>
                <textarea value={formData.technician_notes} onChange={e => setFormData({...formData, technician_notes: e.target.value})} className="input-field" rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                  <select value={formData.service_location} onChange={e => setFormData({...formData, service_location: e.target.value})} className="input-field">
                    <option value="local">En local</option>
                    <option value="sitio">En sitio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-field">
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo del Mantenimiento ($)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="number" step="0.01" min="0" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="input-field pl-8" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Mantenimiento</label>
                  <input type="date" value={formData.next_maintenance_date} onChange={e => setFormData({...formData, next_maintenance_date: e.target.value})} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Programar próximo mantenimiento:</label>
                <div className="flex gap-2 flex-wrap">
                  {NEXT_MAINTENANCE_OPTIONS.map(opt => (
                    <button type="button" key={opt.label} onClick={() => setNextMaintenance(opt.days)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asignar garantía:</label>
                <div className="flex flex-wrap gap-2">
                  {WARRANTY_OPTIONS.map(opt => (
                    <button type="button" key={opt.label} onClick={() => setFormData({...formData, warranty_months: opt.months.toString()})} className={`px-3 py-1 rounded-lg text-sm ${formData.warranty_months === opt.months.toString() ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  Fotos de Llegada (antes)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input type="file" multiple accept="image/*" onChange={e => handleImageSelect(e.target.files, 'arrival')} ref={arrivalInputRef} className="hidden" id="arrival-images-input" />
                  <label htmlFor="arrival-images-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-gray-400 mb-2" size={28} />
                    <span className="text-sm text-gray-500">Subir fotos del equipo al llegar</span>
                  </label>
                </div>
                {arrivalPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {arrivalPreviews.map((preview, i) => (
                      <div key={i} className="relative">
                        <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-blue-200" />
                        <button type="button" onClick={() => removeImage(i, 'arrival')} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  Fotos de Salida (después)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input type="file" multiple accept="image/*" onChange={e => handleImageSelect(e.target.files, 'departure')} ref={departureInputRef} className="hidden" id="departure-images-input" />
                  <label htmlFor="departure-images-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="text-gray-400 mb-2" size={28} />
                    <span className="text-sm text-gray-500">Subir fotos del equipo al salir</span>
                  </label>
                </div>
                {departurePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {departurePreviews.map((preview, i) => (
                      <div key={i} className="relative">
                        <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-green-200" />
                        <button type="button" onClick={() => removeImage(i, 'departure')} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
  </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">
                  {editingItem ? 'Actualizar' : 'Registrar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}