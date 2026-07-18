'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Gauge, AlertTriangle, CheckCircle, Clock, Search, Car, Calendar, ChevronDown, FileText } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Vehicle {
  id: number;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type: string;
  mileage: number;
  client?: any;
}

interface Schedule {
  id: number;
  vehicle_id: number;
  last_maintenance_km: number;
  last_maintenance_date: string | null;
  next_maintenance_km: number;
  next_maintenance_date: string | null;
  km_status: string;
  oil_status: string;
  vehicle?: Vehicle;
}

const STATUS_COLORS: Record<string, string> = {
  verde: 'bg-green-100 text-green-700 border-green-300',
  amarillo: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  rojo: 'bg-red-100 text-red-700 border-red-300',
};

const STATUS_ICONS: Record<string, any> = {
  verde: CheckCircle,
  amarillo: Clock,
  rojo: AlertTriangle,
};

export default function OdometerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [summary, setSummary] = useState({ verde: 0, amarillo: 0, rojo: 0, total: 0 });
  const [search, setSearch] = useState('');

  const [readingForm, setReadingForm] = useState({ vehicle_id: 0, reading_km: 0, reading_date: new Date().toISOString().split('T')[0], notes: '' });
  const [maintForm, setMaintForm] = useState({ vehicle_id: 0, last_maintenance_km: 0, last_maintenance_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [sRes, vRes, sumRes] = await Promise.all([
        workshopAPI.getMaintenanceSchedule(),
        workshopAPI.getVehicles(),
        workshopAPI.getMaintenanceSummary(),
      ]);
      setSchedules(sRes.data);
      setVehicles(vRes.data);
      setSummary(sumRes.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  const worstStatus = (s: Schedule) => {
    if (s.km_status === 'rojo' || s.oil_status === 'rojo') return 'rojo';
    if (s.km_status === 'amarillo' || s.oil_status === 'amarillo') return 'amarillo';
    return 'verde';
  };

  const filteredSchedules = schedules.filter(s => {
    if (filter !== 'all' && worstStatus(s) !== filter) return false;
    if (search) {
      const v = s.vehicle;
      const term = search.toLowerCase();
      if (v && !`${v.plate_number} ${v.brand} ${v.model}`.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const filteredVehicles = vehicles.filter(v => {
    if (!vehicleSearch) return true;
    const term = vehicleSearch.toLowerCase();
    return `${v.plate_number} ${v.brand} ${v.model}`.toLowerCase().includes(term);
  });

  const openReadingModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setReadingForm({ vehicle_id: vehicle.id, reading_km: vehicle.mileage || 0, reading_date: new Date().toISOString().split('T')[0], notes: '' });
      setSelectedVehicle(vehicle);
      setVehicleSearch(`${vehicle.plate_number} - ${vehicle.brand} ${vehicle.model}`);
    } else {
      setReadingForm({ vehicle_id: 0, reading_km: 0, reading_date: new Date().toISOString().split('T')[0], notes: '' });
      setSelectedVehicle(null);
      setVehicleSearch('');
    }
    setShowReadingModal(true);
  };

  const openMaintModal = (schedule?: Schedule) => {
    if (schedule) {
      setMaintForm({
        vehicle_id: schedule.vehicle_id,
        last_maintenance_km: schedule.vehicle?.mileage || 0,
        last_maintenance_date: new Date().toISOString().split('T')[0],
      });
      setSelectedVehicle(schedule.vehicle || null);
    } else {
      setMaintForm({ vehicle_id: 0, last_maintenance_km: 0, last_maintenance_date: new Date().toISOString().split('T')[0] });
      setSelectedVehicle(null);
      setVehicleSearch('');
    }
    setShowMaintModal(true);
  };

  const handleCreateReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingForm.vehicle_id) { toast.error('Selecciona un vehículo'); return; }
    setSaving(true);
    try {
      await workshopAPI.createOdometerReading(readingForm);
      toast.success('Lectura registrada');
      setShowReadingModal(false);
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleCreateMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintForm.vehicle_id) { toast.error('Selecciona un vehículo'); return; }
    setSaving(true);
    try {
      await workshopAPI.createMaintenanceSchedule(maintForm);
      toast.success('Mantenimiento registrado - semáforo en verde');
      setShowMaintModal(false);
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Odómetro</h1>
          <p className="text-gray-500">Control de kilometraje y mantenimiento preventivo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openMaintModal()} className="btn-outline flex items-center gap-2">
            <Calendar size={18} /> Registrar Mantenimiento
          </button>
          <button onClick={() => openReadingModal()} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Nueva Lectura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500">Total Flota</p>
          <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-green-500">
          <p className="text-sm text-gray-500">🟢 Al día</p>
          <p className="text-2xl font-bold text-green-600">{summary.verde}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">🟡 Próximos</p>
          <p className="text-2xl font-bold text-yellow-600">{summary.amarillo}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-red-500">
          <p className="text-sm text-gray-500">🔴 Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{summary.rojo}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por placa, marca o modelo..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'verde', label: '🟢 Verde' },
            { key: 'amarillo', label: '🟡 Amarillo' },
            { key: 'rojo', label: '🔴 Rojo' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === f.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedules.map(s => {
          const worst = worstStatus(s);
          const StatusIcon = STATUS_ICONS[worst];
          const v = s.vehicle;
          return (
            <div key={s.id} className={`card p-4 border-2 ${worst === 'rojo' ? 'border-red-300' : worst === 'amarillo' ? 'border-yellow-300' : 'border-green-200'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Car size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{v?.plate_number}</h3>
                    <p className="text-xs text-gray-500">{v?.brand} {v?.model}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[worst]}`}>
                  <StatusIcon size={12} className="inline mr-1" />{worst.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Gauge size={12} /> Kilometraje</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_COLORS[s.km_status]}`}>
                    {s.km_status === 'rojo' ? `PASÓ ${Math.abs(s.next_maintenance_km - (v?.mileage || 0)).toLocaleString()} km` :
                     s.km_status === 'amarillo' ? `Faltan ${((s.next_maintenance_km || 0) - (v?.mileage || 0)).toLocaleString()} km` :
                     `${((s.next_maintenance_km || 0) - (v?.mileage || 0)).toLocaleString()} km libres`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> Aceite</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_COLORS[s.oil_status]}`}>
                    {s.last_maintenance_date ? `${Math.floor((Date.now() - new Date(s.last_maintenance_date).getTime()) / 86400000 / 30)} meses` : 'Sin registro'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1 mb-3">
                <p>Último: {s.last_maintenance_km?.toLocaleString()} km ({s.last_maintenance_date || 'N/A'})</p>
                <p>Próximo: {s.next_maintenance_km?.toLocaleString()} km</p>
                {v?.client && <p>Responsable: {v.client.name} - {v.client.phone}</p>}
              </div>

              <div className="flex gap-2">
                <button onClick={() => openReadingModal(v)} className="flex-1 text-xs py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 font-medium">
                  Registrar Km
                </button>
                <button onClick={() => { setMaintForm({ vehicle_id: s.vehicle_id, last_maintenance_km: v?.mileage || 0, last_maintenance_date: new Date().toISOString().split('T')[0] }); setSelectedVehicle(v || null); setShowMaintModal(true); }}
                  className="flex-1 text-xs py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium">
                  Mantenimiento
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSchedules.length === 0 && (
        <div className="text-center py-12">
          <Gauge size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{schedules.length === 0 ? 'No hay vehículos registrados en el programa' : 'No hay vehículos con este filtro'}</p>
        </div>
      )}

      {showReadingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">Registrar Lectura de Odómetro</h2>
              <button onClick={() => setShowReadingModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateReading} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo *</label>
                <input type="text" placeholder="Buscar por placa..." value={vehicleSearch}
                  onChange={e => { setVehicleSearch(e.target.value); if (!e.target.value) { setReadingForm({ ...readingForm, vehicle_id: 0 }); setSelectedVehicle(null); } }}
                  className="input-field" />
                {vehicleSearch && !selectedVehicle && (
                  <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg">
                    {filteredVehicles.map(v => (
                      <button key={v.id} type="button" onClick={() => {
                        setReadingForm({ ...readingForm, vehicle_id: v.id, reading_km: v.mileage || 0 });
                        setSelectedVehicle(v);
                        setVehicleSearch(`${v.plate_number} - ${v.brand} ${v.model}`);
                      }} className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-0">
                        {v.plate_number} - {v.brand} {v.model} ({v.mileage?.toLocaleString()} km)
                      </button>
                    ))}
                    {filteredVehicles.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No encontrado</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje Actual *</label>
                <input type="number" value={readingForm.reading_km || ''}
                  onChange={e => setReadingForm({ ...readingForm, reading_km: parseInt(e.target.value) || 0 })}
                  className="input-field" required min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={readingForm.reading_date}
                  onChange={e => setReadingForm({ ...readingForm, reading_date: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={readingForm.notes} onChange={e => setReadingForm({ ...readingForm, notes: e.target.value })}
                  className="input-field" rows={2} placeholder="Observaciones..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowReadingModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={16} />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaintModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">Registrar Mantenimiento</h2>
              <button onClick={() => setShowMaintModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateMaint} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo *</label>
                <input type="text" placeholder="Buscar por placa..." value={vehicleSearch}
                  onChange={e => { setVehicleSearch(e.target.value); if (!e.target.value) { setMaintForm({ ...maintForm, vehicle_id: 0 }); setSelectedVehicle(null); } }}
                  className="input-field" />
                {vehicleSearch && !selectedVehicle && (
                  <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg">
                    {filteredVehicles.map(v => (
                      <button key={v.id} type="button" onClick={() => {
                        setMaintForm({ ...maintForm, vehicle_id: v.id, last_maintenance_km: v.mileage || 0 });
                        setSelectedVehicle(v);
                        setVehicleSearch(`${v.plate_number} - ${v.brand} ${v.model}`);
                      }} className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-0">
                        {v.plate_number} - {v.brand} {v.model}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Km del Mantenimiento *</label>
                <input type="number" value={maintForm.last_maintenance_km || ''}
                  onChange={e => setMaintForm({ ...maintForm, last_maintenance_km: parseInt(e.target.value) || 0 })}
                  className="input-field" required min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Mantenimiento *</label>
                <input type="date" value={maintForm.last_maintenance_date}
                  onChange={e => setMaintForm({ ...maintForm, last_maintenance_date: e.target.value })}
                  className="input-field" required />
              </div>
              <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                Al registrar, el semáforo se resetea a 🟢. Próximo mantenimiento: +5,000 km o +3 meses.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMaintModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="animate-spin" size={16} />} Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
