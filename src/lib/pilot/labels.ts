'use client';

import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Order } from './types';

function shortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function generateLabelPdf(order: Order, pickerName?: string): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

  for (let i = 0; i < order.volumeCount; i += 1) {
    if (i > 0) {
      pdf.addPage();
    }

    const volume = `${i + 1}/${order.volumeCount}`;
    const qrPayload = `${order.orderNumber}|VOLUME:${i + 1}`;
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 180 });

    pdf.setFontSize(18);
    pdf.text(`Pedido ${order.orderNumber}`, 14, 16);

    pdf.setFontSize(11);
    pdf.text(`Volume ${volume}`, 14, 24);
    pdf.text(`Status: ${order.status}`, 14, 30);
    pdf.text(`Separador: ${pickerName ?? '-'}`, 14, 42);

    pdf.addImage(qrDataUrl, 'PNG', 150, 10, 46, 46);

    pdf.setFontSize(10);
    pdf.text('Itens', 14, 52);

    let y = 58;
    order.items.forEach((item) => {
      const line = `${item.materialName} | ${item.uom} | ${item.color} | solicitado ${item.qtyRequested} | separado ${item.qtySeparated}`;
      pdf.text(line.slice(0, 165), 14, y);
      y += 6;
    });

    pdf.text(`Impresso em ${shortDate(new Date().toISOString())}`, 14, 286);
  }

  pdf.save(`etiquetas-${order.orderNumber}.pdf`);
}
