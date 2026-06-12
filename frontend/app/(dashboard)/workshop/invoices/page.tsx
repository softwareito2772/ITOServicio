'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Search, Trash2, Edit, FileText, DollarSign, CheckCircle, Clock, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'bg-warning/20 text-warningDark', icon: Clock },
  { value: 'paid', label: 'Pagada', color: 'bg-success/20 text-success', icon: CheckCircle },
  { value: 'partially_paid', label: 'Parcial', color: 'bg-primary/20 text-primary', icon: DollarSign },
  { value: 'cancelled', label: 'Anulada', color: 'bg-danger/20 text-danger', icon: XCircle },
];

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Yappy', 'Cheque', 'Otro'];

export default function WorkshopInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [formData, setFormData] = useState({ order_id: 0, subtotal: 0, tax: 0, discount: 0, total: 0, notes: '' });
  const [paymentData, setPaymentData] = useState({ paid_amount: 0, payment_method: 'Efectivo' });
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

  const invoicedOrderIds = invoices.filter((i: any) => i.status !== 'cancelled').map((i: any) => i.order_id);

  useEffect(() => { loadData(); }, [statusFilter]);

  const loadData = async () => {
    try {
      const [invoicesRes, statsRes, ordersRes] = await Promise.all([
        workshopAPI.getInvoices(statusFilter),
        workshopAPI.getInvoiceStats(),
        workshopAPI.getOrders(),
      ]);
      setInvoices(invoicesRes.data);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.order_id) { toast.error('Selecciona una orden'); return; }
    setSaving(true);
    try {
      await workshopAPI.createInvoice({ ...formData, total: formData.subtotal + formData.tax - formData.discount });
      toast.success('Factura creada');
      setShowForm(false);
      setFormData({ order_id: 0, subtotal: 0, tax: 0, discount: 0, total: 0, notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      const newPaid = selectedInvoice.paid_amount + paymentData.paid_amount;
      const newStatus = newPaid >= selectedInvoice.total ? 'paid' : 'partially_paid';
      await workshopAPI.updateInvoice(selectedInvoice.id, { paid_amount: newPaid, payment_method: paymentData.payment_method, status: newStatus, payment_date: new Date().toISOString() });
      toast.success('Pago registrado');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally { setSaving(false); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('¿Anular esta factura?')) return;
    try { await workshopAPI.updateInvoice(id, { status: 'cancelled' }); toast.success('Anulada'); loadData(); }
    catch { toast.error('Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta factura?')) return;
    try { await workshopAPI.deleteInvoice(id); toast.success('Eliminada'); loadData(); }
    catch { toast.error('Error'); }
  };

  const getStatusBadge = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Facturación del Taller</h1>
          <p className="text-gray-500">{invoices.length} facturas</p>
        </div>
        <button onClick={() => { setFormData({ order_id: 0, subtotal: 0, tax: 0, discount: 0, total: 0, notes: '' }); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva Factura
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total_invoiced}</p>
            <p className="text-xs text-gray-500">Facturadas</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-success">{formatCurrency(stats.total_paid_amount)}</p>
            <p className="text-xs text-gray-500">Cobrado</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-danger">{formatCurrency(stats.pending_amount)}</p>
            <p className="text-xs text-gray-500">Pendiente</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.total_paid}/{stats.total_invoiced}</p>
            <p className="text-xs text-gray-500">Pagadas</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!statusFilter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todas</button>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === s.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.label}</button>
        ))}
      </div>

      {showForm && (
        <div className="card p-4 sm:p-6">
          <h3 className="font-bold text-gray-800 mb-4">Nueva Factura</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden *</label>
              <select value={formData.order_id} onChange={e => {
                const orderId = parseInt(e.target.value);
                const order = orders.find((o: any) => o.id === orderId);
                const total = order?.total_cost || 0;
                setFormData({...formData, order_id: orderId, subtotal: total, total: total});
              }} className="input-field">
                <option value={0}>Seleccionar orden...</option>
                {orders.filter((o: any) => o.status !== 'cancelled' && !invoicedOrderIds.includes(o.id)).map((o: any) => (
                  <option key={o.id} value={o.id}>#{o.id} - {o.vehicle?.plate_number} ({o.vehicle?.brand}) - {formatCurrency(o.total_cost)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input type="number" step="0.01" value={formData.subtotal} onChange={e => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0, total: (parseFloat(e.target.value) || 0) + formData.tax - formData.discount})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto</label>
              <input type="number" step="0.01" value={formData.tax} onChange={e => setFormData({...formData, tax: parseFloat(e.target.value) || 0, total: formData.subtotal + (parseFloat(e.target.value) || 0) - formData.discount})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
              <input type="number" step="0.01" value={formData.discount} onChange={e => setFormData({...formData, discount: parseFloat(e.target.value) || 0, total: formData.subtotal + formData.tax - (parseFloat(e.target.value) || 0)})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input type="number" step="0.01" value={formData.total} readOnly className="input-field bg-gray-50" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Crear Factura
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
          </div>
        </div>
      )}

      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800">Registrar Pago</h3>
            <p className="text-sm text-gray-500">Factura {selectedInvoice.invoice_number} · Total: {formatCurrency(selectedInvoice.total)} · Ya pagado: {formatCurrency(selectedInvoice.paid_amount)}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
              <input type="number" step="0.01" value={paymentData.paid_amount} onChange={e => setPaymentData({...paymentData, paid_amount: parseFloat(e.target.value) || 0})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select value={paymentData.payment_method} onChange={e => setPaymentData({...paymentData, payment_method: e.target.value})} className="input-field">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={handlePayment} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <DollarSign size={16} />} Registrar Pago
              </button>
              <button onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); }} className="btn-outline">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {invoices.map(invoice => {
          const badge = getStatusBadge(invoice.status);
          const Icon = badge.icon;
          return (
            <div key={invoice.id} className="card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color}`}>
                    <Icon size={12} /> {badge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Orden #{invoice.order_id} · {invoice.client?.name || 'Sin cliente'}</p>
                <div className="flex gap-4 text-xs text-gray-400 mt-1">
                  <span>Total: <b className="text-gray-700">{formatCurrency(invoice.total)}</b></span>
                  <span>Pagado: {formatCurrency(invoice.paid_amount)}</span>
                  <span>Pendiente: {formatCurrency(invoice.total - invoice.paid_amount)}</span>
                </div>
                {invoice.work_summary && (
                  <button onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)} className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                    {expandedInvoice === invoice.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Ver detalle del trabajo
                  </button>
                )}
                {expandedInvoice === invoice.id && invoice.work_summary && (
                  <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{invoice.work_summary}</pre>
                )}
              </div>
              <div className="flex gap-2">
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <button onClick={() => { setSelectedInvoice(invoice); setPaymentData({ paid_amount: invoice.total - invoice.paid_amount, payment_method: 'Efectivo' }); setShowPaymentModal(true); }} className="px-3 py-1 bg-success/10 text-success rounded-lg text-sm font-medium hover:bg-success/20 transition">
                    Pagar
                  </button>
                )}
                {invoice.status !== 'cancelled' && (
                  <button onClick={() => handleCancel(invoice.id)} className="px-3 py-1 bg-danger/10 text-danger rounded-lg text-sm font-medium hover:bg-danger/20 transition">
                    Anular
                  </button>
                )}
                <button onClick={() => handleDelete(invoice.id)} className="p-2 hover:bg-gray-100 rounded-lg text-danger"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
        {invoices.length === 0 && <p className="text-center text-gray-500 py-8">No hay facturas</p>}
      </div>
    </div>
  );
}
