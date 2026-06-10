'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewOrderPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const [formData, setFormData] = useState({
    vehicle_id: '', client_id: '', type: 'mantenimiento',
    mechanic_name: '', assistant_names: [] as string[],
    description: '', entry_km: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, mRes] = await Promise.all([
        workshopAPI.getVehicles(), workshopAPI.getMechanics(),
      ]);
      setVehicles(vRes.data); setMechanics(mRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setFormData(prev => ({ ...prev, vehicle_id: vehicleId }));
    if (!vehicleId) { setSelectedVehicle(null); return; }
    const vehicle = vehicles.find((v: any) => v.id === parseInt(vehicleId));
    setSelectedVehicle(vehicle);
    if (vehicle) {
      setFormData(prev => ({ ...prev, client_id: vehicle.client_id?.toString() || '', entry_km: vehicle.mileage?.toString() || '' }));
    }
  };

  const toggleAssistant = (name: string) => {
    setFormData(prev => {
      const current = prev.assistant_names;
      const next = current.includes(name) ? current.filter(n => n !== name) : [...current, name];
      return { ...prev, assistant_names: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id) { toast.error('Selecciona un vehículo'); return; }
    if (!formData.mechanic_name) { toast.error('Selecciona un mecánico'); return; }

    setSaving(true);
    try {
      const payload = {
        vehicle_id: parseInt(formData.vehicle_id),
        client_id: parseInt(formData.client_id || selectedVehicle?.client_id),
        type: formData.type,
        mechanic_name: formData.mechanic_name,
        assistant_names: formData.assistant_names.join(', '),
        description: formData.description,
        entry_km: formData.entry_km ? parseInt(formData.entry_km) : null,
      };
      await workshopAPI.createOrder(payload);
      toast.success('Orden creada');
      router.push('/workshop');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al crear orden');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href="/workshop" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva Orden de Trabajo</h1>
          <p className="text-gray-500">Datos generales del servicio</p>
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
              <p><span className="text-gray-500">Cliente:</span> <strong>{selectedVehicle.client?.name}</strong></p>
            </div>
          )}
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Personal Asignado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mecánico *</label>
              <select value={formData.mechanic_name} onChange={e => setFormData({...formData, mechanic_name: e.target.value})} className="input-field" required>
                <option value="">Seleccionar personal</option>
                {mechanics.map((m: any) => (
                  <option key={m.id} value={m.name}>{m.name} ({m.role === 'mecanico' ? 'Mecánico' : 'Ayudante'}){m.specialty ? ` - ${m.specialty}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odómetro al ingresar (km)</label>
              <input type="number" value={formData.entry_km} onChange={e => setFormData({...formData, entry_km: e.target.value})} className="input-field" />
            </div>
          </div>
          {mechanics.filter((m: any) => m.role === 'ayudante').length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ayudantes</label>
              <div className="flex flex-wrap gap-2">
                {mechanics.filter((m: any) => m.role === 'ayudante').map((m: any) => (
                  <button key={m.id} type="button" onClick={() => toggleAssistant(m.name)}
                    className={`px-3 py-1 rounded-full text-sm border transition ${formData.assistant_names.includes(m.name) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Descripción del Problema</h2>
          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={3} placeholder="Describe el motivo por el cual trae el vehículo..." />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/workshop" className="btn-outline flex-1 text-center">Cancelar</Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Crear Orden
          </button>
        </div>
      </form>
    </div>
  );
}
