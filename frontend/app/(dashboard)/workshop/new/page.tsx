'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { workshopAPI, clientsAPI, productsAPI, usersAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface ChecklistItem {
  item_name: string;
  item_category: string;
  status: string;
  notes: string;
  needs_replacement: boolean;
}

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedán' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'suv', label: 'SUV' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'otro', label: 'Otro' },
];

const CHECKLIST_CATEGORIES: Record<string, string> = {
  motor: 'Motor', frenos: 'Frenos', llantas: 'Llantas', luces: 'Luces',
  suspension: 'Suspensión', electrico: 'Eléctrico', transmision: 'Transmisión',
  general: 'General', carga: 'Carga'
};

const STATUS_OPTIONS = ['ok', 'reemplazar', 'limpiar', 'ajustar', 'reparar', 'na'];

export default function NewOrderPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistComplete, setChecklistComplete] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '', client_id: '', type: 'mantenimiento', assistant_name: '',
    description: '', diagnosis: '', solution: '', entry_km: '',
    cost_labor: '0', mechanic_observations: '', recommendations: '',
    urgent_issues: '', customer_notes: '', next_maintenance_date: '', next_maintenance_km: '',
  });

  const [parts, setParts] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, cRes, tRes, pRes] = await Promise.all([
        workshopAPI.getVehicles(), clientsAPI.getAll(), usersAPI.getAll(), productsAPI.getAll(),
      ]);
      setVehicles(vRes.data); setClients(cRes.data); setTechnicians(tRes.data); setProducts(pRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleVehicleSelect = async (vehicleId: string) => {
    setFormData(prev => ({ ...prev, vehicle_id: vehicleId }));
    if (!vehicleId) { setSelectedVehicle(null); setChecklist([]); return; }
    const vehicle = vehicles.find((v: any) => v.id === parseInt(vehicleId));
    setSelectedVehicle(vehicle);
    if (vehicle) {
      setFormData(prev => ({ ...prev, client_id: vehicle.client_id?.toString() || '', entry_km: vehicle.mileage?.toString() || '' }));
      try {
        const res = await workshopAPI.getChecklistTemplate(vehicle.vehicle_type);
        const items = res.data.map((t: any) => ({
          item_name: t.item_name, item_category: t.item_category,
          status: 'ok', notes: '', needs_replacement: false,
        }));
        setChecklist(items);
        setChecklistComplete(false);
      } catch { toast.error('Error al cargar checklist'); }
    }
  };

  const updateChecklistItem = (index: number, field: string, value: any) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'status') {
      updated[index].needs_replacement = value === 'reemplazar';
    }
    setChecklist(updated);
    setChecklistComplete(updated.every(i => i.status !== ''));
  };

  const addPart = () => setParts([...parts, { product_id: '', quantity: 1, unit_cost: 0, unit_price: 0 }]);
  const removePart = (i: number) => setParts(parts.filter((_, idx) => idx !== i));
  const updatePart = (i: number, field: string, value: any) => {
    const updated = [...parts];
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'product_id') {
      const product = products.find((p: any) => p.id === parseInt(value));
      if (product) { updated[i].unit_cost = product.price * 0.6; updated[i].unit_price = product.price; }
    }
    setParts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id) { toast.error('Selecciona un vehículo'); return; }
    if (!checklistComplete) { toast.error('Debes completar todo el checklist'); return; }

    setSaving(true);
    try {
      const payload = {
        vehicle_id: parseInt(formData.vehicle_id),
        client_id: parseInt(formData.client_id || selectedVehicle?.client_id),
        type: formData.type,
        assistant_name: formData.assistant_name,
        description: formData.description,
        diagnosis: formData.diagnosis,
        solution: formData.solution,
        entry_km: formData.entry_km ? parseInt(formData.entry_km) : null,
        cost_labor: parseFloat(formData.cost_labor) || 0,
        mechanic_observations: formData.mechanic_observations,
        recommendations: formData.recommendations,
        urgent_issues: formData.urgent_issues,
        customer_notes: formData.customer_notes,
        next_maintenance_date: formData.next_maintenance_date || null,
        next_maintenance_km: formData.next_maintenance_km ? parseInt(formData.next_maintenance_km) : null,
        checklist: checklist.map(c => ({
          item_name: c.item_name, item_category: c.item_category,
          status: c.status, notes: c.notes, needs_replacement: c.needs_replacement,
        })),
        parts_used: parts.filter(p => p.product_id).map(p => ({
          product_id: parseInt(p.product_id), quantity: parseInt(p.quantity),
          unit_cost: parseFloat(p.unit_cost), unit_price: parseFloat(p.unit_price),
        })),
      };
      await workshopAPI.createOrder(payload);
      toast.success('Orden de trabajo creada');
      router.push('/workshop');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al crear orden');
    } finally { setSaving(false); }
  };

  const groupedChecklist = checklist.reduce((acc: any, item: ChecklistItem) => {
    if (!acc[item.item_category]) acc[item.item_category] = [];
    acc[item.item_category].push(item);
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href="/workshop" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva Orden de Trabajo</h1>
          <p className="text-gray-500">Completa el checklist y los datos del servicio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Datos del Vehículo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo *</label>
              <select value={formData.vehicle_id} onChange={e => handleVehicleSelect(e.target.value)} className="input-field" required>
                <option value="">Seleccionar vehículo</option>
                {vehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.plate_number} - {v.brand} {v.model} ({v.client?.name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de servicio *</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-field">
                <option value="mantenimiento">Mantenimiento</option>
                <option value="reparacion">Reparación</option>
              </select>
            </div>
          </div>
          {selectedVehicle && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <p><span className="text-gray-500">Placa:</span> <strong className="font-mono">{selectedVehicle.plate_number}</strong></p>
              <p><span className="text-gray-500">Marca:</span> {selectedVehicle.brand} {selectedVehicle.model}</p>
              <p><span className="text-gray-500">Color:</span> {selectedVehicle.color}</p>
              <p><span className="text-gray-500">Tipo:</span> <span className="capitalize">{selectedVehicle.vehicle_type}</span></p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odómetro al ingresar (km)</label>
              <input type="number" value={formData.entry_km} onChange={e => setFormData({...formData, entry_km: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asistente / Ayudante</label>
              <input type="text" value={formData.assistant_name} onChange={e => setFormData({...formData, assistant_name: e.target.value})} className="input-field" placeholder="Nombre del ayudante" />
            </div>
          </div>
        </div>

        {checklist.length > 0 && (
          <div className="card p-4 sm:p-6">
            <h2 className="font-bold text-gray-800 mb-4">Checklist de Ingreso ({checklist.length} puntos)</h2>
            {!checklistComplete && (
              <p className="text-sm text-danger mb-4">Debes completar todos los puntos del checklist para continuar</p>
            )}
            <div className="space-y-6">
              {Object.entries(groupedChecklist).map(([cat, items]: [string, any]) => (
                <div key={cat}>
                  <h3 className="font-semibold text-gray-700 mb-2 capitalize">{CHECKLIST_CATEGORIES[cat] || cat}</h3>
                  <div className="space-y-2">
                    {items.map((item: ChecklistItem) => {
                      const idx = checklist.indexOf(item);
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="flex-1 text-sm font-medium">{item.item_name}</span>
                          <select value={item.status} onChange={e => updateChecklistItem(idx, 'status', e.target.value)}
                            className="input-field text-xs py-1 w-full sm:w-40">
                            <option value="">Seleccionar</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                          <input type="text" placeholder="Notas" value={item.notes}
                            onChange={e => updateChecklistItem(idx, 'notes', e.target.value)}
                            className="input-field text-xs py-1 flex-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Descripción y Observaciones</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del servicio</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={2} placeholder="Describe el trabajo a realizar..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones del mecánico</label>
                <textarea value={formData.mechanic_observations} onChange={e => setFormData({...formData, mechanic_observations: e.target.value})} className="input-field" rows={3} placeholder="Lo que el mecánico encuentra en el vehículo..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recomendaciones</label>
                <textarea value={formData.recommendations} onChange={e => setFormData({...formData, recommendations: e.target.value})} className="input-field" rows={3} placeholder="Próximos servicios recomendados..." />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problemas urgentes</label>
                <textarea value={formData.urgent_issues} onChange={e => setFormData({...formData, urgent_issues: e.target.value})} className="input-field" rows={2} placeholder="Lo que necesita atención inmediata..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del cliente</label>
                <textarea value={formData.customer_notes} onChange={e => setFormData({...formData, customer_notes: e.target.value})} className="input-field" rows={2} placeholder="Qué pidió el cliente..." />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Costos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mano de obra ($)</label>
              <input type="number" step="0.01" min="0" value={formData.cost_labor} onChange={e => setFormData({...formData, cost_labor: e.target.value})} className="input-field" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Piezas / Repuestos</h3>
              <button type="button" onClick={addPart} className="text-sm text-primary hover:underline">+ Agregar pieza</button>
            </div>
            {parts.map((part, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                <select value={part.product_id} onChange={e => updatePart(i, 'product_id', e.target.value)} className="input-field text-xs py-1 flex-1">
                  <option value="">Seleccionar pieza</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
                </select>
                <input type="number" min="1" value={part.quantity} onChange={e => updatePart(i, 'quantity', e.target.value)} className="input-field text-xs py-1 w-20" placeholder="Cant" />
                <input type="number" step="0.01" min="0" value={part.unit_price} onChange={e => updatePart(i, 'unit_price', e.target.value)} className="input-field text-xs py-1 w-24" placeholder="Precio" />
                <button type="button" onClick={() => removePart(i)} className="text-danger text-xs">Quitar</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Próximo Mantenimiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha próximo mantenimiento</label>
              <input type="date" value={formData.next_maintenance_date} onChange={e => setFormData({...formData, next_maintenance_date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Km próximo mantenimiento</label>
              <input type="number" value={formData.next_maintenance_km} onChange={e => setFormData({...formData, next_maintenance_km: e.target.value})} className="input-field" placeholder="50000" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/workshop" className="btn-outline flex-1 text-center">Cancelar</Link>
          <button type="submit" disabled={saving || !checklistComplete} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 className="animate-spin" size={16} />}
            Crear Orden de Trabajo
          </button>
        </div>
      </form>
    </div>
  );
}
