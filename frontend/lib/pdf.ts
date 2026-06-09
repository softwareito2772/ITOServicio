import jsPDF from 'jspdf';

const CHECKLIST_CATEGORIES: Record<string, string> = {
  motor: 'Motor', frenos: 'Frenos', llantas: 'Llantas', luces: 'Luces',
  suspension: 'Suspensión', electrico: 'Eléctrico', transmision: 'Transmisión',
  general: 'General', carga: 'Carga'
};

const STATUS_ICONS: Record<string, string> = {
  ok: 'OK', reemplazar: 'REEMPLAZAR', limpiar: 'LIMPIAR',
  ajustar: 'AJUSTAR', reparar: 'REPARAR', na: 'N/A',
};

export default async function generateChecklistPDF(order: any, company: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const addLine = () => {
    doc.setDrawColor(200);
    doc.line(15, y, pageWidth - 15, y);
    y += 3;
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) { doc.addPage(); y = 15; }
  };

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.name || 'Taller', 15, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Orden #${order.id}`, pageWidth - 15, y, { align: 'right' });
  y += 6;

  doc.setFontSize(8);
  doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-MX')}`, 15, y);
  doc.text(`Tipo: ${order.type === 'mantenimiento' ? 'Mantenimiento' : 'Reparación'}`, pageWidth / 2, y);
  y += 4;
  doc.text(`Estado: ${order.status}`, 15, y);
  y += 6;
  addLine();

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VEHÍCULO', 15, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const v = order.vehicle;
  if (v) {
    doc.text(`Placa: ${v.plate_number}`, 15, y);
    doc.text(`Marca: ${v.brand || ''} ${v.model}`, 80, y);
    y += 4;
    doc.text(`Color: ${v.color || 'N/A'}`, 15, y);
    doc.text(`Año: ${v.year || 'N/A'}`, 80, y);
    doc.text(`Tipo: ${v.vehicle_type}`, 140, y);
    y += 4;
    doc.text(`Km: ${v.mileage?.toLocaleString() || 'N/A'}`, 15, y);
    doc.text(`Asignado a: ${v.assigned_to || 'N/A'}`, 80, y);
  }
  y += 6;
  addLine();

  if (order.entry_km || order.entry_datetime) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE INGRESO', 15, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (order.entry_datetime) doc.text(`Fecha entrada: ${new Date(order.entry_datetime).toLocaleString('es-MX')}`, 15, y);
    if (order.entry_km) doc.text(`Km entrada: ${order.entry_km.toLocaleString()} km`, 120, y);
    y += 6;
  }

  if (order.checklist && order.checklist.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST DE INGRESO', 15, y);
    y += 6;

    const grouped: Record<string, any[]> = {};
    order.checklist.forEach((item: any) => {
      if (!grouped[item.item_category]) grouped[item.item_category] = [];
      grouped[item.item_category].push(item);
    });

    for (const [cat, items] of Object.entries(grouped)) {
      checkPage(10 + items.length * 5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(CHECKLIST_CATEGORIES[cat] || cat, 15, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      items.forEach((item: any) => {
        checkPage(5);
        const statusText = STATUS_ICONS[item.status] || item.status.toUpperCase();
        doc.text(statusText, 18, y);
        doc.text(item.item_name, 45, y);
        if (item.notes) {
          doc.setTextColor(120);
          doc.text(`(${item.notes})`, 130, y);
          doc.setTextColor(0);
        }
        y += 4;
      });
      y += 2;
    }
    y += 2;
    addLine();
  }

  const sections = [
    { title: 'OBSERVACIONES DEL MECÁNICO', content: order.mechanic_observations },
    { title: 'RECOMENDACIONES', content: order.recommendations },
    { title: 'PROBLEMAS URGENTES', content: order.urgent_issues },
    { title: 'NOTAS DEL CLIENTE', content: order.customer_notes },
  ];

  for (const section of sections) {
    if (section.content) {
      checkPage(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 15, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(section.content, pageWidth - 30);
      doc.text(lines, 15, y);
      y += lines.length * 4 + 3;
    }
  }

  if (order.parts_used && order.parts_used.length > 0) {
    checkPage(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PIEZAS UTILIZADAS', 15, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Pieza', 15, y);
    doc.text('Cant', 110, y);
    doc.text('Costo', 130, y);
    doc.text('Precio', 160, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    let totalParts = 0;
    order.parts_used.forEach((part: any) => {
      checkPage(5);
      doc.text(part.product?.name || 'N/A', 15, y);
      doc.text(String(part.quantity), 110, y);
      doc.text(`$${part.unit_cost.toFixed(2)}`, 130, y);
      doc.text(`$${part.unit_price.toFixed(2)}`, 160, y);
      totalParts += part.unit_price * part.quantity;
      y += 4;
    });
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Costo piezas: $${totalParts.toFixed(2)}`, 15, y);
    y += 5;
  }

  checkPage(25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('COSTOS', 15, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mano de obra: $${(order.cost_labor || 0).toFixed(2)}`, 15, y);
  y += 4;
  doc.text(`Piezas: $${(order.cost_parts || 0).toFixed(2)}`, 15, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: $${(order.total_cost || 0).toFixed(2)}`, 15, y);
  y += 8;

  addLine();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mecánico: ______________________', 15, y);
  doc.text('Cliente: ______________________', pageWidth / 2 + 5, y);
  y += 5;
  if (order.picked_up_by) {
    doc.text(`Retirado por: ${order.picked_up_by}`, 15, y);
    if (order.picked_up_datetime) {
      doc.text(`Fecha retiro: ${new Date(order.picked_up_datetime).toLocaleString('es-MX')}`, 120, y);
    }
  }

  doc.save(`checklist-orden-${order.id}.pdf`);
}
