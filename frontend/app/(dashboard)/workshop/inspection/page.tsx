'use client';

import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, Loader2, Trash2, X, CheckCircle } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ZONES = [
  { id: 'hood', label: 'Capó', x: 60, y: 12, w: 80, h: 30 },
  { id: 'front_bumper', label: 'Defensa delantera', x: 50, y: 2, w: 100, h: 14 },
  { id: 'left_headlight', label: 'Faros izquierdos', x: 40, y: 10, w: 25, h: 12 },
  { id: 'right_headlight', label: 'Faros derechos', x: 135, y: 10, w: 25, h: 12 },
  { id: 'windshield', label: 'Parabrisas', x: 65, y: 42, w: 70, h: 18 },
  { id: 'roof', label: 'Techo', x: 55, y: 60, w: 90, h: 35 },
  { id: 'left_mirror', label: 'Espejo izquierdo', x: 35, y: 52, w: 18, h: 8 },
  { id: 'right_mirror', label: 'Espejo derecho', x: 147, y: 52, w: 18, h: 8 },
  { id: 'left_front_door', label: 'Puerta del. izquierda', x: 30, y: 48, w: 32, h: 35 },
  { id: 'right_front_door', label: 'Puerta del. derecha', x: 138, y: 48, w: 32, h: 35 },
  { id: 'left_rear_door', label: 'Puerta tras. izquierda', x: 30, y: 82, w: 32, h: 30 },
  { id: 'right_rear_door', label: 'Puerta tras. derecha', x: 138, y: 82, w: 32, h: 30 },
  { id: 'rear_window', label: 'Vidrio trasero', x: 65, y: 95, w: 70, h: 14 },
  { id: 'trunk', label: 'Maletero', x: 55, y: 108, w: 90, h: 22 },
  { id: 'rear_bumper', label: 'Defensa trasera', x: 50, y: 128, w: 100, h: 14 },
  { id: 'left_taillight', label: 'Luces tras. izq.', x: 42, y: 110, w: 20, h: 10 },
  { id: 'right_taillight', label: 'Luces tras. der.', x: 138, y: 110, w: 20, h: 10 },
  { id: 'left_front_tire', label: 'Llanta del. izq.', x: 25, y: 30, w: 16, h: 22 },
  { id: 'right_front_tire', label: 'Llanta del. der.', x: 159, y: 30, w: 16, h: 22 },
  { id: 'left_rear_tire', label: 'Llanta tras. izq.', x: 25, y: 98, w: 16, h: 22 },
  { id: 'right_rear_tire', label: 'Llanta tras. der.', x: 159, y: 98, w: 16, h: 22 },
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
            <svg viewBox="0 0 200 145" className="w-full max-w-md" style={{ height: 'auto' }}>
              <defs>
                <linearGradient id="carBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d1d5db" />
                  <stop offset="100%" stopColor="#9ca3af" />
                </linearGradient>
                <linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.15" />
                </filter>
              </defs>
              <g filter="url(#shadow)">
                <path d="M40,145 L40,130 Q40,125 45,125 L155,125 Q160,125 160,130 L160,145 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.8" />
                <rect x="42" y="128" width="116" height="16" rx="3" fill="#ef4444" opacity="0.8" />
                <rect x="42" y="129" width="116" height="6" rx="2" fill="#fca5a5" />
                <path d="M30,115 L170,115 Q175,115 175,120 L175,128 L25,128 L25,120 Q25,115 30,115 Z" fill="#4b5563" stroke="#374151" strokeWidth="0.5" />
                <path d="M50,25 Q50,10 65,8 L135,8 Q150,10 150,25 L150,40 Q150,42 148,42 L52,42 Q50,42 50,40 Z" fill="url(#carBody)" stroke="#6b7280" strokeWidth="0.8" />
                <path d="M55,18 Q55,12 62,11 L138,11 Q145,12 145,18 L145,35 Q145,37 143,37 L57,37 Q55,37 55,35 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.3" rx="2" />
                <path d="M45,42 L155,42 Q165,42 168,48 L170,60 Q172,65 172,70 L172,105 Q172,110 168,112 L32,112 Q28,110 28,105 L28,70 Q28,65 30,60 L32,48 Q35,42 45,42 Z" fill="url(#carBody)" stroke="#6b7280" strokeWidth="0.8" />
                <path d="M55,44 L145,44 Q148,44 149,46 L150,58 Q150,60 148,60 L52,60 Q50,60 50,58 L51,46 Q52,44 55,44 Z" fill="url(#glass)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                <line x1="100" y1="44" x2="100" y2="60" stroke="#9ca3af" strokeWidth="0.5" />
                <path d="M50,62 L150,62 Q152,62 152,64 L152,100 Q152,103 150,103 L50,103 Q48,103 48,100 L48,64 Q48,62 50,62 Z" fill="#94a3b8" stroke="#6b7280" strokeWidth="0.5" rx="8" />
                <path d="M55,65 L145,65 Q148,65 148,68 L148,97 Q148,100 145,100 L55,100 Q52,100 52,97 L52,68 Q52,65 55,65 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.3" rx="5" />
                <path d="M20,30 Q20,20 28,18 L40,18 Q48,18 50,25 L52,40 Q52,42 50,42 L28,42 Q22,42 20,38 Z" fill="url(#carBody)" stroke="#6b7280" strokeWidth="0.5" />
                <path d="M180,30 Q180,20 172,18 L160,18 Q152,18 150,25 L148,40 Q148,42 150,42 L172,42 Q178,42 180,38 Z" fill="url(#carBody)" stroke="#6b7280" strokeWidth="0.5" />
                <rect x="22" y="22" width="24" height="14" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
                <rect x="154" y="22" width="24" height="14" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
                <ellipse cx="32" cy="30" rx="5" ry="4" fill="#fef9c3" opacity="0.6" />
                <ellipse cx="168" cy="30" rx="5" ry="4" fill="#fef9c3" opacity="0.6" />
                <rect x="20" y="112" width="24" height="12" rx="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.4" />
                <rect x="156" y="112" width="24" height="12" rx="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.4" />
                <ellipse cx="32" cy="35" rx="12" ry="12" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                <ellipse cx="32" cy="35" rx="7" ry="7" fill="#374151" />
                <ellipse cx="32" cy="35" rx="3" ry="3" fill="#6b7280" />
                <ellipse cx="168" cy="35" rx="12" ry="12" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                <ellipse cx="168" cy="35" rx="7" ry="7" fill="#374151" />
                <ellipse cx="168" cy="35" rx="3" ry="3" fill="#6b7280" />
                <ellipse cx="32" cy="110" rx="12" ry="12" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                <ellipse cx="32" cy="110" rx="7" ry="7" fill="#374151" />
                <ellipse cx="32" cy="110" rx="3" ry="3" fill="#6b7280" />
                <ellipse cx="168" cy="110" rx="12" ry="12" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                <ellipse cx="168" cy="110" rx="7" ry="7" fill="#374151" />
                <ellipse cx="168" cy="110" rx="3" ry="3" fill="#6b7280" />
                <line x1="48" y1="55" x2="48" y2="95" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="152" y1="55" x2="152" y2="95" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="100" y1="44" x2="100" y2="60" stroke="#9ca3af" strokeWidth="0.3" />
                <line x1="55" y1="82" x2="145" y2="82" stroke="#9ca3af" strokeWidth="0.3" />
              </g>
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
