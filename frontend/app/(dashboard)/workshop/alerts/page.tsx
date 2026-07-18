'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Download, Gauge, Calendar, Phone, Car } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Alert {
  schedule_id: number;
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_type: string;
  client_name: string;
  client_phone: string;
  current_km: number;
  last_maintenance_km: number;
  last_maintenance_date: string | null;
  next_maintenance_km: number;
  next_maintenance_date: string | null;
  km_status: string;
  oil_status: string;
  km_faltantes: number;
  months_since_maintenance: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try {
      const res = await workshopAPI.getMaintenanceAlerts();
      setAlerts(res.data);
    } catch { toast.error('Error al cargar alertas'); }
    finally { setLoading(false); }
  };

  const urgentes = alerts.filter(a => a.km_status === 'rojo' || a.oil_status === 'rojo');
  const proximos = alerts.filter(a => (a.km_status === 'amarillo' || a.oil_status === 'amarillo') && a.km_status !== 'rojo' && a.oil_status !== 'rojo');

  const handleDownloadPDF = () => {
    const url = workshopAPI.getMaintenanceAlertsPDF();
    window.open(url, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Alertas de Mantenimiento</h1>
          <p className="text-gray-500">Vehículos que requieren atención</p>
        </div>
        <button onClick={handleDownloadPDF} className="btn-primary flex items-center gap-2">
          <Download size={18} /> Descargar PDF
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-l-4 border-red-500">
          <p className="text-sm text-gray-500">🔴 Urgentes</p>
          <p className="text-2xl font-bold text-red-600">{urgentes.length}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">🟡 Próximos</p>
          <p className="text-2xl font-bold text-yellow-600">{proximos.length}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-green-500">
          <p className="text-sm text-gray-500">🟢 Al día</p>
          <p className="text-2xl font-bold text-green-600">{alerts.length === 0 && !loading ? 'Todos' : 0}</p>
        </div>
      </div>

      {urgentes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle size={20} /> URGENTE - Mantenimiento Vencido
          </h2>
          <div className="space-y-3">
            {urgentes.map(a => (
              <div key={a.schedule_id} className="card border-2 border-red-300 p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Car size={18} className="text-red-600" />
                      <h3 className="font-bold text-gray-800">{a.vehicle_brand}</h3>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-mono">{a.vehicle_plate}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {a.km_status === 'rojo' && (
                        <div className="flex items-center gap-2 text-red-600">
                          <Gauge size={14} />
                          <span>Pasó {Math.abs(a.km_faltantes).toLocaleString()} km del mantenimiento</span>
                        </div>
                      )}
                      {a.oil_status === 'rojo' && (
                        <div className="flex items-center gap-2 text-red-600">
                          <Calendar size={14} />
                          <span>Aceite vencido: {a.months_since_maintenance} meses sin cambio</span>
                        </div>
                      )}
                      <div className="text-gray-500">
                        Último: {a.last_maintenance_km?.toLocaleString()} km ({a.last_maintenance_date || 'N/A'})
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-medium text-gray-800">{a.client_name}</p>
                    <p className="text-xs text-gray-500 mb-2">Responsable del vehículo</p>
                    <a href={`tel:${a.client_phone}`} className="inline-flex items-center gap-1 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                      <Phone size={14} /> {a.client_phone}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {proximos.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-yellow-600 mb-3 flex items-center gap-2">
            <AlertTriangle size={20} /> Próximos - Requieren Atención
          </h2>
          <div className="space-y-3">
            {proximos.map(a => (
              <div key={a.schedule_id} className="card border-2 border-yellow-300 p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Car size={18} className="text-yellow-600" />
                      <h3 className="font-bold text-gray-800">{a.vehicle_brand}</h3>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-mono">{a.vehicle_plate}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {a.km_status === 'amarillo' && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Gauge size={14} />
                          <span>Faltan {a.km_faltantes.toLocaleString()} km</span>
                        </div>
                      )}
                      {a.oil_status === 'amarillo' && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Calendar size={14} />
                          <span>Aceite por vencer: {a.months_since_maintenance} meses</span>
                        </div>
                      )}
                      <div className="text-gray-500">
                        Último: {a.last_maintenance_km?.toLocaleString()} km ({a.last_maintenance_date || 'N/A'})
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-medium text-gray-800">{a.client_name}</p>
                    <p className="text-xs text-gray-500 mb-2">Responsable del vehículo</p>
                    <a href={`tel:${a.client_phone}`} className="inline-flex items-center gap-1 text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600">
                      <Phone size={14} /> {a.client_phone}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {urgentes.length === 0 && proximos.length === 0 && (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-lg font-medium text-gray-600">Todos los vehículos están al día</p>
          <p className="text-sm text-gray-400">No hay alertas de mantenimiento pendientes</p>
        </div>
      )}
    </div>
  );
}
