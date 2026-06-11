'use client';

import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, Loader2, Trash2, X, CheckCircle } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ZONES = [
  { id: 'front_bumper', label: 'Defensa delantera', x: 30, y: 70, w: 100, h: 18 },
  { id: 'hood', label: 'Capó', x: 35, y: 48, w: 90, h: 22 },
  { id: 'windshield', label: 'Parabrisas', x: 50, y: 28, w: 60, h: 20 },
  { id: 'roof', label: 'Techo', x: 40, y: 12, w: 80, h: 16 },
  { id: 'left_front_door', label: 'Puerta del. izquierda', x: 5, y: 42, w: 30, h: 30 },
  { id: 'right_front_door', label: 'Puerta del. derecha', x: 125, y: 42, w: 30, h: 30 },
  { id: 'left_rear_fender', label: 'Cubertera tras. izq.', x: 5, y: 65, w: 30, h: 18 },
  { id: 'right_rear_fender', label: 'Cubertera tras. der.', x: 125, y: 65, w: 30, h: 18 },
  { id: 'left_mirror', label: 'Espejo izquierdo', x: 0, y: 38, w: 12, h: 10 },
  { id: 'right_mirror', label: 'Espejo derecho', x: 148, y: 38, w: 12, h: 10 },
  { id: 'rear_bumper', label: 'Defensa trasera', x: 30, y: 88, w: 100, h: 14 },
  { id: 'trunk', label: 'Maletero', x: 35, y: 82, w: 90, h: 12 },
  { id: 'left_headlight', label: 'Faros izquierdos', x: 12, y: 60, w: 22, h: 14 },
  { id: 'right_headlight', label: 'Faros derechos', x: 126, y: 60, w: 22, h: 14 },
  { id: 'left_taillight', label: 'Luces tras. izq.', x: 12, y: 85, w: 22, h: 10 },
  { id: 'right_taillight', label: 'Luces tras. der.', x: 126, y: 85, w: 22, h: 10 },
  { id: 'left_front_tire', label: 'Llanta del. izq.', x: 18, y: 72, w: 16, h: 14 },
  { id: 'right_front_tire', label: 'Llanta del. der.', x: 126, y: 72, w: 16, h: 14 },
  { id: 'left_rear_tire', label: 'Llanta tras. izq.', x: 18, y: 86, w: 16, h: 14 },
  { id: 'right_rear_tire', label: 'Llanta tras. der.', x: 126, y: 86, w: 16, h: 14 },
];

const DAMAGE_TYPES = [
  { value: 'golpe', label: 'Golpe', color: '#ef4444' },
  { value: 'rayon', label: 'Rayón', color: '#f59e0b' },
  { value: 'abolladura', label: 'Abolladura', color: '#8b5cf6' },
  { value: 'luz_rota', label: 'Luz rota', color: '#ec4899' },
  { value: 'fisura', label: 'Fisura', color: '#06b6d4' },
  { value: 'desgaste', label: 'Desgaste', color: '#6b7280' },
  { value: 'otro', label: 'Otro', color: '#10b981' },
];

const SEVERITY_OPTIONS = [
  { value: 'leve', label: 'Leve', color: 'bg-warning/20 text-warningDark' },
  { value: 'moderado', label: 'Moderado', color: 'bg-orange-100 text-orange-700' },
  { value: 'severo', label: 'Severo', color: 'bg-danger/20 text-danger' },
];

function InspectionContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const [order, setOrder] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ damage_type: 'golpe', severity: 'leve', notes: '', inspected_by: '' });

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [orderRes, inspRes] = await Promise.all([
        workshopAPI.getOrder(parseInt(id)),
        workshopAPI.getInspections(parseInt(id)),
      ]);
      setOrder(orderRes.data);
      setInspections(inspRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const getZoneLabel = (zoneId: string) => ZONES.find(z => z.id === zoneId)?.label || zoneId;
  const getDamageColor = (type: string) => DAMAGE_TYPES.find(d => d.value === type)?.color || '#6b7280';
  const getZoneDamage = (zoneId: string) => inspections.find(i => i.zone === zoneId);

  const handleZoneClick = (zoneId: string) => {
    const existing = getZoneDamage(zoneId);
    setSelectedZone(zoneId);
    setFormData(existing
      ? { damage_type: existing.damage_type, severity: existing.severity, notes: existing.notes || '', inspected_by: existing.inspected_by || '' }
      : { damage_type: 'golpe', severity: 'leve', notes: '', inspected_by: '' }
    );
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selectedZone) return;
    setSaving(true);
    try {
      const existing = getZoneDamage(selectedZone);
      if (existing) await workshopAPI.deleteInspection(existing.id);
      await workshopAPI.createInspection({
        order_id: parseInt(id),
        vehicle_id: order.vehicle_id,
        zone: selectedZone,
        ...formData,
      });
      toast.success('Zona guardada');
      setShowForm(false);
      setSelectedZone(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (inspectionId: number) => {
    if (!confirm('¿Eliminar esta inspección?')) return;
    try {
      await workshopAPI.deleteInspection(inspectionId);
      toast.success('Eliminada');
      loadData();
    } catch { toast.error('Error al eliminar'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!order) return <div className="text-center py-12"><p className="text-gray-500">Orden no encontrada</p></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href={`/workshop/${id}`} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inspección Visual</h1>
          <p className="text-gray-500">Orden #{order.id} - {order.vehicle?.plate_number} {order.vehicle?.brand} {order.vehicle?.model}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-gray-800 mb-4">Diagrama del Vehículo</h2>
          <p className="text-xs text-gray-500 mb-3">Haz clic en una zona para marcar daños</p>
          <div className="relative bg-gray-50 rounded-lg p-4 flex justify-center">
            <svg viewBox="0 0 160 110" className="w-full max-w-md" style={{ height: 'auto' }}>
              <rect x="5" y="8" width="150" height="95" rx="18" ry="18" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
              <rect x="20" y="22" width="120" height="55" rx="10" ry="10" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
              <rect x="30" y="28" width="45" height="28" rx="4" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.5" />
              <rect x="85" y="28" width="45" height="28" rx="4" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="0.5" />
              <circle cx="30" cy="92" r="9" fill="#374151" stroke="#1f2937" strokeWidth="1" />
              <circle cx="30" cy="92" r="4.5" fill="#6b7280" />
              <circle cx="130" cy="92" r="9" fill="#374151" stroke="#1f2937" strokeWidth="1" />
              <circle cx="130" cy="92" r="4.5" fill="#6b7280" />
              <rect x="10" y="62" width="14" height="7" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
              <rect x="136" y="62" width="14" height="7" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
              <rect x="10" y="85" width="14" height="6" rx="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.5" />
              <rect x="136" y="85" width="14" height="6" rx="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.5" />
              {ZONES.map(zone => {
                const damage = getZoneDamage(zone.id);
                return (
                  <rect
                    key={zone.id}
                    x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                    fill={damage ? getDamageColor(damage.damage_type) + '40' : 'transparent'}
                    stroke={damage ? getDamageColor(damage.damage_type) : 'transparent'}
                    strokeWidth={damage ? 2 : 0}
                    className="cursor-pointer hover:opacity-70 transition"
                    rx="4"
                    onClick={() => handleZoneClick(zone.id)}
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {DAMAGE_TYPES.map(d => (
              <div key={d.value} className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {showForm && (
            <div className="card p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">{getZoneLabel(selectedZone || '')}</h3>
                <button onClick={() => { setShowForm(false); setSelectedZone(null); }}><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de daño</label>
                  <select value={formData.damage_type} onChange={e => setFormData({...formData, damage_type: e.target.value})} className="input-field">
                    {DAMAGE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severidad</label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map(s => (
                      <button key={s.value} type="button" onClick={() => setFormData({...formData, severity: s.value})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${formData.severity === s.value ? s.color + ' border-current' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field" rows={2} placeholder="Detalle del daño..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspeccionado por</label>
                  <input type="text" value={formData.inspected_by} onChange={e => setFormData({...formData, inspected_by: e.target.value})} className="input-field" placeholder="Nombre" />
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} Guardar
                </button>
              </div>
            </div>
          )}

          <div className="card p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-4">Daños Registrados ({inspections.length})</h3>
            {inspections.length === 0 ? (
              <p className="text-sm text-gray-500">Sin daños registrados. Haz clic en el diagrama.</p>
            ) : (
              <div className="space-y-2">
                {inspections.map((insp: any) => (
                  <div key={insp.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getDamageColor(insp.damage_type) }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getZoneLabel(insp.zone)}</p>
                      <p className="text-xs text-gray-500 capitalize">{insp.damage_type.replace('_', ' ')} - {insp.severity}</p>
                      {insp.notes && <p className="text-xs text-gray-400">{insp.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(insp.id)} className="text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href={`/workshop/${id}`} className="btn-primary w-full text-center">Volver a la Orden</Link>
        </div>
      </div>
    </div>
  );
}

export default function InspectionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
      <InspectionContent />
    </Suspense>
  );
}
