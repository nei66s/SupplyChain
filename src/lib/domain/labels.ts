'use client';

import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { LabelFormat, Order } from './types';

let cachedLogoDataUrl: string | null = null;

async function getLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read logo image'));
      reader.readAsDataURL(blob);
    });
    cachedLogoDataUrl = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

function shortDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function simpleDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

async function addQr(
  pdf: any,
  order: Order,
  pageIndex: number,
  format: LabelFormat,
  x: number,
  y: number,
  size: number
) {
  const payload = `${order.orderNumber}|${format}|PAGE:${pageIndex + 1}`;
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 180 });
  pdf.addImage(qrDataUrl, 'PNG', x, y, size, size);
}

type LabelRenderContext = {
  pdf: any;
  order: Order;
  pickerName?: string;
  pageIndex: number;
};

function drawItemList(
  pdf: any,
  items: Order['items'],
  startY: number,
  maxHeight?: number
) {
  if (!maxHeight || maxHeight <= 0) return startY;
  let y = startY;
  pdf.setFontSize(9);
  const lineSpacing = 6;
  const maxY = startY + maxHeight - lineSpacing;
  items.forEach((item) => {
    if (y > maxY) return;
    const qty = Math.max(item.qtySeparated, item.qtyRequested);
    const line = `${item.materialName} | ${item.color} | ${qty} ${item.uom}`;
    pdf.text(line.slice(0, 160), 14, y);
    y += lineSpacing;
  });
  return y;
}

async function renderExitLabel({ pdf, order, pickerName, pageIndex }: LabelRenderContext) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 4;
  const innerWidth = pageWidth - margin * 2;
  const item = order.items[0] ?? { materialName: 'Material', color: 'Cor', qtySeparated: 0, qtyRequested: 0, uom: 'EA' };
  const peso = Math.max(item.qtySeparated, item.qtyRequested);
  const volume = `${pageIndex + 1}/${Math.max(1, order.volumeCount)}`;

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.8);
  pdf.rect(margin, margin, innerWidth, pageHeight - margin * 2);

  const logoY = margin + 6;
  const logoSize = 30;
  const logoDataUrl = await getLogoDataUrl();
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', pageWidth / 2 - logoSize / 2, logoY, logoSize, logoSize);
  }

  pdf.setFontSize(18);
  pdf.text('São José Cordas', pageWidth / 2, logoY + logoSize + 6, { align: 'center' });

  const detailX = margin + 6;
  const detailStartY = logoY + logoSize + 18;
  const lines = [
    ['Pedido', order.orderNumber],
    ['Data', simpleDate(order.dueDate ?? order.orderDate)],
    ['Tipo', item.materialName],
    ['Desc', item.materialName],
    ['Cor', item.color],
    ['Peso', `${peso} ${item.uom}`],
    ['Pac.', volume],
    ['Separador', pickerName ?? '-'],
  ];
  const warrantyHeight = 48;
  const warrantyY = pageHeight - margin - warrantyHeight;

  pdf.setFontSize(10);
  const lineHeight = 8;
  let detailY = detailStartY;
  for (const [label, value] of lines) {
    pdf.text(`${label}: ${value}`, detailX, detailY);
    detailY += lineHeight;
  }

  const itemsLabelY = detailY + 6;
  pdf.setFontSize(12);
  pdf.text('Itens', detailX, itemsLabelY);
  const itemsDetailY = itemsLabelY + 6;
  const qty = Math.max(item.qtySeparated, item.qtyRequested);
  pdf.setFontSize(10);
  pdf.text(`${item.materialName} | ${item.color} | ${qty} ${item.uom}`, detailX, itemsDetailY);

  pdf.setLineWidth(0.5);
  pdf.rect(margin + 3, warrantyY - 4, innerWidth - 6, warrantyHeight);
  pdf.setFontSize(6.8);
  const warrantyText =
    'Garantia de 1 ano contra defeitos de fabricação ou material, válida a partir da data da compra mediante apresentação do comprovante. Em caso de falha, interrompa o uso e contate imediatamente o fornecedor. A garantia não cobre danos causados por uso inadequado durante a fabricação.';
  pdf.text(warrantyText, margin + 6, warrantyY + 6, { maxWidth: innerWidth - 12 });
  pdf.text('** Não trocamos material já utilizado **', margin + 6, warrantyY + warrantyHeight - 6);

  pdf.setFontSize(9);
  pdf.text(`Impresso em ${shortDate(new Date().toISOString())}`, pageWidth - margin - 6, pageHeight - margin - 6, { align: 'right' });
}

async function renderProductionLabel({ pdf, order, pickerName, pageIndex }: LabelRenderContext) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 4;
  const item = order.items[0] ?? { materialName: 'Material', color: 'Cor', qtySeparated: 0, qtyRequested: 0, uom: 'EA' };
  const peso = Math.max(item.qtySeparated, item.qtyRequested);
  const logoY = margin + 4;
  const logoSize = 22;

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.6);
  pdf.rect(margin, margin, pageWidth - margin * 2, pdf.internal.pageSize.getHeight() - margin * 2);

  const logoDataUrl = await getLogoDataUrl();
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', pageWidth / 2 - logoSize / 2, logoY, logoSize, logoSize);
  }

  pdf.setFontSize(14);
  pdf.text('São José Cordas', pageWidth / 2, logoY + logoSize + 8, { align: 'center' });
  const detailX = margin + 6;
  let detailY = logoY + logoSize + 16;
  pdf.setFontSize(10);
  const fields = [
    ['Lote', order.orderNumber],
    ['Data', simpleDate(order.orderDate)],
    ['Tipo', item.materialName],
    ['Desc', item.materialName],
    ['Cor', item.color],
    ['Peso', `${peso} ${item.uom}`],
    ['Separador', pickerName ?? '-'],
    ['Pac.', `${pageIndex + 1}/${Math.max(1, order.volumeCount)}`],
  ];
  fields.forEach(([label, value]) => {
    pdf.text(`${label}: ${value}`, detailX, detailY);
    detailY += 6;
  });

  pdf.setFontSize(9);
  pdf.text('Etiqueta de produção para colar após concluir o processo.', detailX, detailY + 4, { maxWidth: pageWidth - detailX - 6 });
  await addQr(pdf, order, pageIndex, 'PRODUCTION_4x4', pageWidth - margin - 30, margin + 8, 26);
}

export async function generateLabelPdf(order: Order, pickerName?: string, format: LabelFormat = 'EXIT_10x15'): Promise<void> {
  const dimensions = format === 'EXIT_10x15' ? [100, 150] : [40, 40];
  const pdf = new jsPDF({ unit: 'mm', format: dimensions });
  const render = format === 'EXIT_10x15' ? renderExitLabel : renderProductionLabel;
  const pageCount = format === 'EXIT_10x15' ? Math.max(1, order.volumeCount) : 1;

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex !== 0) pdf.addPage();
    // eslint-disable-next-line no-await-in-loop
    await render({ pdf, order, pickerName, pageIndex });
  }

  pdf.save(`etiquetas-${order.orderNumber}-${format}.pdf`);
}
