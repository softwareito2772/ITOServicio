'use client';

import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, Loader2, Trash2, X, CheckCircle } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const VIEWS = [
  { id: 'front', label: 'Frontal' },
  { id: 'rear', label: 'Trasera' },
  { id: 'left', label: 'Lateral Izq.' },
  { id: 'right', label: 'Lateral Der.' },
];

const ZONES_BY_VIEW: Record<string, { id: string; label: string; cx: number; cy: number; path: string }[]> = {
  front: [
    { id: 'front_bumper', label: 'Defensa delantera', cx: 150, cy: 320, path: 'M80,280 Q80,260 100,255 L200,255 Q220,260 220,280 L220,330 Q220,345 200,350 L100,350 Q80,345 80,330 Z' },
    { id: 'left_headlight', label: 'Faros izquierdos', cx: 95, cy: 240, path: 'M70,210 Q65,200 75,195 L115,195 Q125,200 125,210 L125,255 Q125,265 115,270 L75,270 Q65,265 65,255 Z' },
    { id: 'right_headlight', label: 'Faros derechos', cx: 205, cy: 240, path: 'M175,210 Q175,200 185,195 L225,195 Q235,200 235,210 L235,255 Q235,265 225,270 L185,270 Q175,265 175,255 Z' },
    { id: 'hood', label: 'Capó', cx: 150, cy: 170, path: 'M85,120 Q85,95 110,90 L190,90 Q215,95 215,120 L215,200 Q215,210 200,215 L100,215 Q85,210 85,200 Z' },
    { id: 'windshield', label: 'Parabrisas', cx: 150, cy: 65, path: 'M95,15 Q95,5 115,0 L185,0 Q205,5 205,15 L205,90 Q205,100 190,105 L110,105 Q95,100 95,90 Z' },
    { id: 'left_fender', label: 'Guardabrisas izq.', cx: 55, cy: 190, path: 'M40,130 Q38,120 45,115 L80,115 L80,270 L45,270 Q38,265 38,255 Z' },
    { id: 'right_fender', label: 'Guardabrisas der.', cx: 245, cy: 190, path: 'M220,115 L255,115 Q262,120 262,130 L262,255 Q262,265 255,270 L220,270 Z' },
  ],
  rear: [
    { id: 'rear_bumper', label: 'Defensa trasera', cx: 150, cy: 320, path: 'M80,280 Q80,260 100,255 L200,255 Q220,260 220,280 L220,330 Q220,345 200,350 L100,350 Q80,345 80,330 Z' },
    { id: 'left_taillight', label: 'Luces tras. izq.', cx: 90, cy: 235, path: 'M65,210 Q60,200 70,195 L110,195 Q120,200 120,210 L120,260 Q120,270 110,275 L70,275 Q60,270 60,260 Z' },
    { id: 'right_taillight', label: 'Luces tras. der.', cx: 210, cy: 235, path: 'M180,210 Q180,200 190,195 L230,195 Q240,200 240,210 L240,260 Q240,270 230,275 L190,275 Q180,270 180,260 Z' },
    { id: 'trunk', label: 'Maletero', cx: 150, cy: 150, path: 'M85,90 Q85,70 110,65 L190,65 Q215,70 215,90 L215,195 Q215,205 200,210 L100,210 Q85,205 85,195 Z' },
    { id: 'rear_window', label: 'Vidrio trasero', cx: 150, cy: 55, path: 'M100,10 Q100,0 120,0 L180,0 Q200,0 200,10 L200,75 Q200,85 185,88 L115,88 Q100,85 100,75 Z' },
    { id: 'left_rear_fender', label: 'Guarda tras. izq.', cx: 55, cy: 190, path: 'M40,130 Q38,120 45,115 L80,115 L80,270 L45,270 Q38,265 38,255 Z' },
    { id: 'right_rear_fender', label: 'Guarda tras. der.', cx: 245, cy: 190, path: 'M220,115 L255,115 Q262,120 262,130 L262,255 Q262,265 255,270 L220,270 Z' },
  ],
  left: [
    { id: 'left_front_bumper_side', label: 'Defensa del. izq.', cx: 40, cy: 260, path: 'M15,230 Q10,220 15,210 L50,200 Q60,195 65,200 L65,300 Q60,310 50,305 L15,295 Q10,285 15,275 Z' },
    { id: 'left_front_fender_side', label: 'Guardabarros del.', cx: 85, cy: 200, path: 'M65,140 L65,290 L120,290 Q130,285 130,275 L130,155 Q130,145 120,140 Z' },
    { id: 'left_front_door', label: 'Puerta delantera', cx: 165, cy: 210, path: 'M130,130 L130,290 L200,290 L200,130 Z' },
    { id: 'left_rear_door', label: 'Puerta trasera', cx: 250, cy: 210, path: 'M200,130 L200,290 L270,290 L270,130 Z' },
    { id: 'left_rear_fender_side', label: 'Guardabarros tras.', cx: 310, cy: 200, path: 'M270,140 L270,290 L325,290 Q335,285 335,275 L335,155 Q335,145 325,140 Z' },
    { id: 'left_rear_bumper_side', label: 'Defensa tras. izq.', cx: 355, cy: 260, path: 'M335,230 Q340,220 335,210 L300,200 Q290,195 285,200 L285,300 Q290,310 300,305 L335,295 Q340,285 335,275 Z' },
    { id: 'left_front_tire_side', label: 'Llanta delantera', cx: 85, cy: 310, path: 'M60,295 Q55,290 58,280 L58,280 Q55,270 60,265 L110,265 Q115,270 112,280 L112,280 Q115,290 110,295 Z' },
    { id: 'left_rear_tire_side', label: 'Llanta trasera', cx: 310, cy: 310, path: 'M285,295 Q280,290 283,280 L283,280 Q280,270 285,265 L335,265 Q340,270 337,280 L337,280 Q340,290 335,295 Z' },
    { id: 'left_mirror_side', label: 'Espejo izquierdo', cx: 120, cy: 140, path: 'M110,120 Q105,115 108,108 L135,108 Q138,115 133,120 L133,145 Q138,150 135,155 L108,155 Q105,150 110,145 Z' },
  ],
  right: [
    { id: 'right_front_bumper_side', label: 'Defensa del. der.', cx: 360, cy: 260, path: 'M385,230 Q390,220 385,210 L350,200 Q340,195 335,200 L335,300 Q340,310 350,305 L385,295 Q390,285 385,275 Z' },
    { id: 'right_front_fender_side', label: 'Guardabarros del.', cx: 315, cy: 200, path: 'M335,140 L335,290 L280,290 Q270,285 270,275 L270,155 Q270,145 280,140 Z' },
    { id: 'right_front_door', label: 'Puerta delantera', cx: 235, cy: 210, path: 'M270,130 L270,290 L200,290 L200,130 Z' },
    { id: 'right_rear_door', label: 'Puerta trasera', cx: 150, cy: 210, path: 'M200,130 L200,290 L130,290 L130,130 Z' },
    { id: 'right_rear_fender_side', label: 'Guardabarros tras.', cx: 90, cy: 200, path: 'M130,140 L130,290 L75,290 Q65,285 65,275 L65,155 Q65,145 75,140 Z' },
    { id: 'right_rear_bumper_side', label: 'Defensa tras. der.', cx: 45, cy: 260, path: 'M65,230 Q60,220 65,210 L100,200 Q110,195 115,200 L115,300 Q110,310 100,305 L65,295 Q60,285 65,275 Z' },
    { id: 'right_front_tire_side', label: 'Llanta delantera', cx: 315, cy: 310, path: 'M290,295 Q285,290 288,280 L288,280 Q285,270 290,265 L340,265 Q345,270 342,280 L342,280 Q345,290 340,295 Z' },
    { id: 'right_rear_tire_side', label: 'Llanta trasera', cx: 90, cy: 310, path: 'M65,295 Q60,290 63,280 L63,280 Q60,270 65,265 L115,265 Q120,270 117,280 L117,280 Q120,290 115,295 Z' },
    { id: 'right_mirror_side', label: 'Espejo derecho', cx: 280, cy: 140, path: 'M290,120 Q295,115 292,108 L265,108 Q262,115 267,120 L267,145 Q262,150 265,155 L292,155 Q295,150 290,145 Z' },
  ],
};

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
  const [activeView, setActiveView] = useState('front');
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

  const getZoneLabel = (zoneId: string) => {
    for (const view of Object.values(ZONES_BY_VIEW)) {
      const z = view.find(v => v.id === zoneId);
      if (z) return z.label;
    }
    return zoneId;
  };

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

  const currentZones = ZONES_BY_VIEW[activeView] || [];
  const viewInspections = inspections.filter(i => currentZones.some(z => z.id === i.zone));

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

      <div className="flex flex-wrap gap-2">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); setSelectedZone(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeView === v.id ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/50'}`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            <div className="relative bg-gray-50 rounded-lg p-4 flex justify-center">
              <svg viewBox="0 0 400 370" className="w-full max-w-lg" style={{ height: 'auto' }}>
                <defs>
                  <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e5e7eb" />
                    <stop offset="100%" stopColor="#d1d5db" />
                  </linearGradient>
                  <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#bfdbfe" />
                    <stop offset="100%" stopColor="#93c5fd" />
                  </linearGradient>
                  <filter id="carShadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                  </filter>
                </defs>

                {activeView === 'front' && (
                  <g filter="url(#carShadow)">
                    <path d="M70,340 L70,300 Q70,280 90,275 L210,275 Q230,280 230,300 L230,340 Q230,355 215,360 L85,360 Q70,355 70,340 Z" fill="#374151" stroke="#1f2937" strokeWidth="1" />
                    <rect x="75" y="305" width="150" height="30" rx="3" fill="#ef4444" opacity="0.8" />
                    <rect x="75" y="308" width="150" height="10" rx="2" fill="#fca5a5" />
                    <path d="M80,270 Q80,240 100,235 L200,235 Q220,240 220,270 L220,295 Q220,305 210,308 L90,308 Q80,305 80,295 Z" fill="#4b5563" stroke="#374151" strokeWidth="0.5" />
                    <path d="M90,200 Q90,170 110,165 L190,165 Q210,170 210,200 L210,240 Q210,248 200,250 L100,250 Q90,248 90,240 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="1" />
                    <path d="M100,180 Q100,170 115,168 L185,168 Q200,170 200,180 L200,210 Q200,215 190,218 L110,218 Q100,215 100,210 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.3" rx="3" />
                    <path d="M95,130 Q95,100 115,95 L185,95 Q205,100 205,130 L205,175 Q205,185 195,188 L105,188 Q95,185 95,175 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="1" />
                    <path d="M105,105 Q105,98 118,95 L182,95 Q195,98 195,105 L195,135 Q195,142 185,145 L115,145 Q105,142 105,135 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="5" />
                    <line x1="150" y1="95" x2="150" y2="145" stroke="#9ca3af" strokeWidth="0.5" />
                    <path d="M50,170 Q45,165 48,158 L75,158 Q80,165 75,170 L75,200 Q80,205 75,210 L48,210 Q45,205 50,200 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                    <path d="M225,158 L252,158 Q257,165 252,170 L252,200 Q257,205 252,210 L225,210 Q220,205 225,200 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="53" y="165" width="22" height="12" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
                    <rect x="225" y="165" width="22" height="12" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />
                    <ellipse cx="64" cy="172" rx="5" ry="3" fill="#fef9c3" opacity="0.6" />
                    <ellipse cx="236" cy="172" rx="5" ry="3" fill="#fef9c3" opacity="0.6" />
                    <ellipse cx="150" cy="330" rx="35" ry="8" fill="none" stroke="#9ca3af" strokeWidth="0.3" strokeDasharray="4,4" />
                  </g>
                )}

                {activeView === 'rear' && (
                  <g filter="url(#carShadow)">
                    <path d="M70,340 L70,300 Q70,280 90,275 L210,275 Q230,280 230,300 L230,340 Q230,355 215,360 L85,360 Q70,355 70,340 Z" fill="#374151" stroke="#1f2937" strokeWidth="1" />
                    <rect x="75" y="305" width="150" height="30" rx="3" fill="#ef4444" opacity="0.8" />
                    <rect x="75" y="318" width="150" height="10" rx="2" fill="#fca5a5" />
                    <path d="M80,270 Q80,240 100,235 L200,235 Q220,240 220,270 L220,295 Q220,305 210,308 L90,308 Q80,305 80,295 Z" fill="#4b5563" stroke="#374151" strokeWidth="0.5" />
                    <path d="M90,160 Q90,120 110,115 L190,115 Q210,120 210,160 L210,230 Q210,240 200,242 L100,242 Q90,240 90,230 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="1" />
                    <path d="M100,70 Q100,55 118,52 L182,52 Q200,55 200,70 L200,120 Q200,130 188,133 L112,133 Q100,130 100,120 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="5" />
                    <line x1="150" y1="52" x2="150" y2="133" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="68" y="165" width="22" height="14" rx="3" fill="#fecaca" stroke="#ef4444" strokeWidth="0.5" />
                    <rect x="210" y="165" width="22" height="14" rx="3" fill="#fecaca" stroke="#ef4444" strokeWidth="0.5" />
                    <path d="M50,170 Q45,165 48,158 L75,158 Q80,165 75,170 L75,200 Q80,205 75,210 L48,210 Q45,205 50,200 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                    <path d="M225,158 L252,158 Q257,165 252,170 L252,200 Q257,205 252,210 L225,210 Q220,205 225,200 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                    <ellipse cx="150" cy="330" rx="35" ry="8" fill="none" stroke="#9ca3af" strokeWidth="0.3" strokeDasharray="4,4" />
                  </g>
                )}

                {activeView === 'left' && (
                  <g filter="url(#carShadow)">
                    <path d="M30,310 L30,280 Q30,270 40,268 L60,265 Q70,262 75,265 L75,310 Q70,318 60,315 L40,312 Q30,315 30,310 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.8" />
                    <path d="M325,310 L325,280 Q325,270 315,268 L295,265 Q285,262 280,265 L280,310 Q285,318 295,315 L315,312 Q325,315 325,310 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.8" />
                    <ellipse cx="60" cy="310" rx="18" ry="18" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                    <ellipse cx="60" cy="310" rx="10" ry="10" fill="#374151" />
                    <ellipse cx="60" cy="310" rx="4" ry="4" fill="#6b7280" />
                    <ellipse cx="295" cy="310" rx="18" ry="18" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                    <ellipse cx="295" cy="310" rx="10" ry="10" fill="#374151" />
                    <ellipse cx="295" cy="310" rx="4" ry="4" fill="#6b7280" />
                    <path d="M55,130 L300,130 L300,270 L55,270 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="1" />
                    <path d="M75,145 L155,145 L155,255 L75,255 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                    <path d="M160,145 L240,145 L240,255 L160,255 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                    <path d="M245,145 L290,145 L290,255 L245,255 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                    <line x1="155" y1="145" x2="155" y2="255" stroke="#9ca3af" strokeWidth="0.8" />
                    <line x1="240" y1="145" x2="240" y2="255" stroke="#9ca3af" strokeWidth="0.8" />
                    <path d="M115,130 Q110,120 115,115 L155,115 Q160,120 155,130" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="45" y="160" width="12" height="8" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.3" />
                    <rect x="300" y="165" width="10" height="10" rx="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.3" />
                    <path d="M35,200 Q33,195 36,190 L52,190 Q55,195 52,200" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                  </g>
                )}

                {activeView === 'right' && (
                  <g filter="url(#carShadow)">
                    <path d="M370,310 L370,280 Q370,270 360,268 L340,265 Q330,262 325,265 L325,310 Q330,318 340,315 L360,312 Q370,315 370,310 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.8" />
                    <path d="M75,310 L75,280 Q75,270 85,268 L105,265 Q115,262 120,265 L120,310 Q115,318 105,315 L85,312 Q75,315 75,310 Z" fill="#374151" stroke="#1f2937" strokeWidth="0.8" />
                    <ellipse cx="345" cy="310" rx="18" ry="18" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                    <ellipse cx="345" cy="310" rx="10" ry="10" fill="#374151" />
                    <ellipse cx="345" cy="310" rx="4" ry="4" fill="#6b7280" />
                    <ellipse cx="100" cy="310" rx="18" ry="18" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
                    <ellipse cx="100" cy="310" rx="10" ry="10" fill="#374151" />
                    <ellipse cx="100" cy="310" rx="4" ry="4" fill="#6b7280" />
                    <path d="M345,130 L100,130 L100,270 L345,270 Z" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="1" />
                    <path d="M325,145 L245,145 L245,255 L325,255 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                    <path d="M240,145 L160,145 L160,255 L240,255 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                    <path d="M155,145 L110,145 L110,255 L155,255 Z" fill="url(#glassGrad)" stroke="#60a5fa" strokeWidth="0.5" rx="3" />
                    <line x1="245" y1="145" x2="245" y2="255" stroke="#9ca3af" strokeWidth="0.8" />
                    <line x1="160" y1="145" x2="160" y2="255" stroke="#9ca3af" strokeWidth="0.8" />
                    <path d="M285,130 Q290,120 285,115 L245,115 Q240,120 245,130" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="343" y="160" width="12" height="8" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.3" />
                    <rect x="90" y="165" width="10" height="10" rx="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.3" />
                    <path d="M365,200 Q367,195 364,190 L348,190 Q345,195 348,200" fill="url(#carBodyGrad)" stroke="#9ca3af" strokeWidth="0.5" />
                  </g>
                )}

                {currentZones.map(zone => {
                  const damage = getZoneDamage(zone.id);
                  return (
                    <g key={zone.id}>
                      <path
                        d={zone.path}
                        fill={damage ? getDamageColor(damage.damage_type) + '30' : 'transparent'}
                        stroke={damage ? getDamageColor(damage.damage_type) : 'transparent'}
                        strokeWidth={damage ? 2.5 : 0}
                        className="cursor-pointer hover:fill-primary/10 transition-all duration-200"
                        onClick={() => handleZoneClick(zone.id)}
                      />
                      {damage && (
                        <g className="cursor-pointer" onClick={() => handleZoneClick(zone.id)}>
                          <circle cx={zone.cx} cy={zone.cy} r="10" fill={getDamageColor(damage.damage_type)} stroke="white" strokeWidth="2.5" />
                          <circle cx={zone.cx} cy={zone.cy} r="3" fill="white" />
                        </g>
                      )}
                      {!damage && (
                        <circle
                          cx={zone.cx} cy={zone.cy} r="6"
                          fill="transparent"
                          stroke="transparent"
                          className="cursor-pointer hover:fill-primary/20 hover:stroke-primary/40 transition-all duration-200"
                          onClick={() => handleZoneClick(zone.id)}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {DAMAGE_TYPES.map(d => (
                <div key={d.value} className="flex items-center gap-1 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
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
            <h3 className="font-bold text-gray-800 mb-3">Vista: {VIEWS.find(v => v.id === activeView)?.label}</h3>
            <p className="text-xs text-gray-500 mb-3">Haz clic en una zona del diagrama para marcar daños</p>
            {viewInspections.length === 0 ? (
              <p className="text-sm text-gray-500">Sin daños en esta vista.</p>
            ) : (
              <div className="space-y-2">
                {viewInspections.map((insp: any) => (
                  <div key={insp.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getDamageColor(insp.damage_type) }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getZoneLabel(insp.zone)}</p>
                      <p className="text-xs text-gray-500 capitalize">{insp.damage_type.replace('_', ' ')} · {insp.severity}</p>
                      {insp.notes && <p className="text-xs text-gray-400">{insp.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(insp.id)} className="text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-3">Todos los daños ({inspections.length})</h3>
            {inspections.length === 0 ? (
              <p className="text-sm text-gray-500">Sin daños registrados.</p>
            ) : (
              <div className="space-y-2">
                {inspections.map((insp: any) => (
                  <div key={insp.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getDamageColor(insp.damage_type) }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getZoneLabel(insp.zone)}</p>
                      <p className="text-xs text-gray-500 capitalize">{insp.damage_type.replace('_', ' ')} · {insp.severity}</p>
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
