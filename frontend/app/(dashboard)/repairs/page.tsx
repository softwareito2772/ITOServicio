'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Loader2, X, MapPin, Upload, AlertTriangle } from 'lucide-react';
import { repairsAPI, equipmentAPI, arrivalStatusesAPI, warrantiesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Repair { id: number; equipment: any; equipment_id?: number; arrival_condition: string; arrival_condition_other?: string; diagnosis?: string; solution?: string; parts_used?: string; total_cost: number; service_location: string; start_date: string; end_date?: string; status: string; warranty?: any; images: any[]; created_at: string; }
interface Equipment { id: number; client: { name: string }; type_name: string; brand: string; model: string; }
interface ArrivalStatus { id: number; name: string; description?: string; }

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/20 text-warningDark' },
  { value: 'in_progress', label: 'En Reparacion', color: 'bg-primary/20 text-primaryDark' },
  { value: 'completed', label: 'Listo', color: 'bg-success/20 text-successDark' },
  { value: 'delivered', label: 'Entregado', color: 'bg-secondary/20 text-secondaryDark' },
];

const WARRANTY_OPTIONS = [
  { label: '1 mes', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 a\u00f1o', months: 12 },
  { label: '2 a\u00f1os', months: 24 },
  { label: '5 a\u00f1os', months: 60 },
  { label: '7 a\u00f1os', months: 84 },
  { label: '10 a\u00f1os', months: 120 },
];

export default function RepairsPage() {
  const [data, setData] = useState<Repair[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [arrivalStatuses, setArrivalStatuses] = useState<ArrivalStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Repair | null>(null);
  const [arrivalImages, setArrivalImages] = useState<File[]>([]);
  const [arrivalPreviews, setArrivalPreviews] = useState<string[]>([]);
  const [departureImages, setDepartureImages] = useState<File[]>([]);
  const [departurePreviews, setDeparturePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    equipment_id: '',
    arrival_condition: '',
    arrival_condition_other: '',
    diagnosis: '',
    solution: '',
    parts_used: '',
    total_cost: '0',
    service_location: 'local',
    status: 'pending',
    end_date: '',
    warranty_months: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rRes, eqRes, stRes] = await Promise.all([
        repairsAPI.getAll(),
        equipmentAPI.getAll(),
        arrivalStatusesAPI.getAll(),
      ]);
      setData(rRes.data); setEquipment(eqRes.data); setArrivalStatuses(stRes.data);
    } catch (error) { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleArrivalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setArrivalImages([...arrivalImages, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setArrivalPreviews([...arrivalPreviews, ...previews]);
  };

  const handleDepartureImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDepartureImages([...departureImages, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setDeparturePreviews([...departurePreviews, ...previews]);
  };

  const removeArrivalImage = (index: number) => {
    const newImages = arrivalImages.filter((_, i) => i !== index);
    const newPreviews = arrivalPreviews.filter((_, i) => i !== index);
    setArrivalImages(newImages);
    setArrivalPreviews(newPreviews);
  };

  const removeDepartureImage = (index: number) => {
    const newImages = departureImages.filter((_, i) => i !== index);
    const newPreviews = departurePreviews.filter((_, i) => i !== index);
    setDepartureImages(newImages);
    setDeparturePreviews(newPreviews);
  };

  const fetchAPI = async (url: string, method: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api`) : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');
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
    if (!fd.arrival_condition) { toast.error('Selecciona estado al llegar'); return; }

    const payload = new FormData();
    payload.append('equipment_id', fd.equipment_id);
    payload.append('arrival_condition', fd.arrival_condition);
    payload.append('service_location', fd.service_location || 'local');
    payload.append('status', fd.status || 'pending');
    payload.append('total_cost', fd.total_cost || '0');
    if (fd.diagnosis) payload.append('diagnosis', fd.diagnosis);
    if (fd.solution) payload.append('solution', fd.solution);
    if (fd.parts_used) payload.append('parts_used', fd.parts_used);
    if (fd.end_date) payload.append('end_date', fd.end_date);
    if (fd.arrival_condition_other) payload.append('arrival_condition_other', fd.arrival_condition_other);
    if (fd.warranty_months) payload.append('warranty_months', fd.warranty_months);
    arrivalImages.forEach(img => payload.append('arrival_images', img));
    departureImages.forEach(img => payload.append('departure_images', img));

    try {
      if (itemId) {
        await fetchAPI(`/repairs/${itemId}`, 'PUT', payload);
        toast.success('Reparacion actualizada');
      } else {
        await fetchAPI('/repairs/', 'POST', payload);
        toast.success('Reparacion registrada');
      }
      setShowModal(false); resetForm(); loadData();
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

  const handleEdit = (item: Repair) => {
    setEditingItem(item);
    setFormData({
      equipment_id: item.equipment_id?.toString() || '',
      arrival_condition: item.arrival_condition,
      arrival_condition_other: item.arrival_condition_other || '',
      diagnosis: item.diagnosis || '',
      solution: item.solution || '',
      parts_used: item.parts_used || '',
      total_cost: item.total_cost?.toString() || '0',
      service_location: item.service_location,
      status: item.status,
      end_date: item.end_date || '',
      warranty_months: '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ equipment_id: '', arrival_condition: '', arrival_condition_other: '', diagnosis: '', solution: '', parts_used: '', total_cost: '0', service_location: 'local', status: 'pending', end_date: '', warranty_months: '' });
    setArrivalImages([]); setArrivalPreviews([]);
    setDepartureImages([]); setDeparturePreviews([]);
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
    return option;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800">Reparaciones</h1><p className="text-gray-500">Control de reparaciones</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={20} /> Nueva</button>
      </div>

      <div className="card">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
         : data.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No hay reparaciones</p></div>
         : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map(r => {
              const badge = getStatusBadge(r.status);
              return (
                <div key={r.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{r.equipment?.brand} {r.equipment?.model}</h3>
                      <p className="text-sm text-gray-500">{r.equipment?.type_name} - {r.equipment?.client?.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <AlertTriangle size={12} />
                    <span>Estado al llegar: {r.arrival_condition}</span>
                  </div>
                  {r.diagnosis && <p className="text-sm text-gray-600 mb-2">Diagnostico: {r.diagnosis}</p>}
                  {r.solution && <p className="text-sm text-gray-600 mb-2">Solucion: {r.solution}</p>}
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {r.service_location === 'local' ? 'Local' : 'Sitio'}</span>
                    <span className="font-semibold text-primary">{formatCurrency(r.total_cost)}</span>
                  </div>
                  {r.end_date && <p className="text-xs text-gray-500 mb-2">Entrega: {formatDate(r.end_date)}</p>}
                  {r.images?.length > 0 && (
                    <div className="mb-3">
                      {(() => {
                        const before = r.images.filter((i: any) => i.image_type === 'before');
                        const after = r.images.filter((i: any) => i.image_type === 'after');
                        return (
                          <>
                            {before.length > 0 && (
                              <div className="mb-1">
                                <span className="text-xs text-gray-400">Antes: </span>
                                <div className="flex gap-1 mt-1">
                                  {before.slice(0, 3).map((img: any, i: number) => (
                                    <img key={i} src={img.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {after.length > 0 && (
                              <div>
                                <span className="text-xs text-gray-400">Despues: </span>
                                <div className="flex gap-1 mt-1">
                                  {after.slice(0, 3).map((img: any, i: number) => (
                                    <img key={i} src={img.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {r.warranty && <span className="inline-block px-2 py-1 bg-accent/20 text-accentDark rounded text-xs mb-3">Garantia: {r.warranty.warranty_type}</span>}
                  <button onClick={() => handleEdit(r)} className="w-full btn-outline text-sm">Editar / Completar</button>
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
              <h2 className="text-xl font-semibold text-gray-800">{editingItem ? 'Editar Reparacion' : 'Nueva Reparacion'}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipo *</label>
                <select value={formData.equipment_id} onChange={e => setFormData({...formData, equipment_id: e.target.value})} className="input-field" required>
                  <option value="">Seleccionar equipo</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model} - {eq.client?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado al Llegar *</label>
                <select value={formData.arrival_condition} onChange={e => setFormData({...formData, arrival_condition: e.target.value})} className="input-field" required>
                  <option value="">Seleccionar estado</option>
                  {arrivalStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              {formData.arrival_condition === 'Otros' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especificar condicion</label>
                  <input type="text" value={formData.arrival_condition_other} onChange={e => setFormData({...formData, arrival_condition_other: e.target.value})} className="input-field" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostico</label>
                <textarea value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} className="input-field" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Solucion aplicada</label>
                <textarea value={formData.solution} onChange={e => setFormData({...formData, solution: e.target.value})} className="input-field" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partes/Repuestos usados</label>
                <textarea value={formData.parts_used} onChange={e => setFormData({...formData, parts_used: e.target.value})} className="input-field" rows={2} placeholder="Ej: Pantalla nueva, bateria换了等" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Total (MXN)</label>
                  <input type="number" step="0.01" value={formData.total_cost} onChange={e => setFormData({...formData, total_cost: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                  <select value={formData.service_location} onChange={e => setFormData({...formData, service_location: e.target.value})} className="input-field">
                    <option value="local">En local</option>
                    <option value="sitio">En sitio</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-field">
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Entrega</label>
                  <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asignar garantia:</label>
                <div className="flex flex-wrap gap-2">
                  {WARRANTY_OPTIONS.map(opt => (
                    <button type="button" key={opt.label} onClick={() => setFormData({...formData, warranty_months: opt.months.toString()})} className={`px-3 py-1 rounded-lg text-sm ${formData.warranty_months === opt.months.toString() ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antes (al llegar)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input type="file" multiple accept="image/*" onChange={handleArrivalImageSelect} className="hidden" id="repair-arrival-input" />
                    <label htmlFor="repair-arrival-input" className="cursor-pointer flex flex-col items-center">
                      <Upload className="text-gray-400 mb-2" size={28} />
                      <span className="text-xs text-gray-500">Seleccionar fotos</span>
                    </label>
                  </div>
                  {arrivalPreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {arrivalPreviews.map((preview, i) => (
                        <div key={i} className="relative">
                          <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
                          <button type="button" onClick={() => removeArrivalImage(i)} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Despues (al terminar)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input type="file" multiple accept="image/*" onChange={handleDepartureImageSelect} className="hidden" id="repair-departure-input" />
                    <label htmlFor="repair-departure-input" className="cursor-pointer flex flex-col items-center">
                      <Upload className="text-gray-400 mb-2" size={28} />
                      <span className="text-xs text-gray-500">Seleccionar fotos</span>
                    </label>
                  </div>
                  {departurePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {departurePreviews.map((preview, i) => (
                        <div key={i} className="relative">
                          <img src={preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
                          <button type="button" onClick={() => removeDepartureImage(i)} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editingItem ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}