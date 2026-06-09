'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Edit, Trash2, X, Wrench } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Mechanic {
  id: number;
  name: string;
  role: string;
  phone?: string;
  specialty?: string;
  is_active: boolean;
}

const ROLES = [
  { value: 'mecanico', label: 'Mecánico' },
  { value: 'ayudante', label: 'Ayudante' },
];

export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [formData, setFormData] = useState({ name: '', role: 'mecanico', phone: '', specialty: '' });

  useEffect(() => { loadMechanics(); }, []);

  const loadMechanics = async () => {
    try {
      const res = await workshopAPI.getMechanics();
      setMechanics(res.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Ingresa el nombre'); return; }
    try {
      if (editing) {
        await workshopAPI.updateMechanic(editing.id, formData);
        toast.success('Actualizado');
      } else {
        await workshopAPI.createMechanic(formData);
        toast.success('Registrado');
      }
      setShowModal(false); resetForm(); loadMechanics();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    }
  };

  const handleEdit = (m: Mechanic) => {
    setEditing(m);
    setFormData({ name: m.name, role: m.role, phone: m.phone || '', specialty: m.specialty || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar?')) return;
    try { await workshopAPI.deleteMechanic(id); toast.success('Desactivado'); loadMechanics(); }
    catch { toast.error('Error'); }
  };

  const resetForm = () => { setEditing(null); setFormData({ name: '', role: 'mecanico', phone: '', specialty: '' }); };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mecánicos y Ayudantes</h1>
          <p className="text-gray-500">Personal del taller</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Nuevo
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : mechanics.length === 0 ? (
          <div className="text-center py-12">
            <Wrench size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay personal registrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Rol</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Especialidad</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">Teléfono</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Acciones</th>
              </tr></thead>
              <tbody>{mechanics.map(m => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{m.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.role === 'mecanico' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {m.role === 'mecanico' ? 'Mecánico' : 'Ayudante'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm hidden sm:table-cell">{m.specialty || '-'}</td>
                  <td className="py-3 px-4 text-sm hidden sm:table-cell">{m.phone || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(m)} className="text-gray-400 hover:text-primary"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-[calc(100%-1rem)] sm:w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">{editing ? 'Editar' : 'Nuevo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Juan Pérez" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-field">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                <input type="text" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="input-field" placeholder="Motor, eléctrico, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="0991234567" />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
