'use client';


import { jsPDF } from 'jspdf';
import { LabelFormat, Order } from './types';

type SiteSettingsPayload = {
  companyName: string;
  platformLabel: string;
  logoUrl: string | null;
  logoDataUrl: string | null;
};

const DEFAULT_LOGO_URL = '/black-tower-x-transp.png';

const DEFAULT_SITE_SETTINGS: SiteSettingsPayload = {
  companyName: 'Black Tower X',
  platformLabel: 'Inventário Ágil',
  logoUrl: DEFAULT_LOGO_URL,
  logoDataUrl: null,
};

let cachedSiteSettings: SiteSettingsPayload | null = null;
const cachedLogoDataUrls = new Map<string, string>();

async function fetchSiteSettingsSafely(): Promise<SiteSettingsPayload> {
  if (cachedSiteSettings) return cachedSiteSettings;

  try {
    const response = await fetch('/api/site', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Falha ao buscar marca');
    }
    const payload = (await response.json()) as SiteSettingsPayload;
    cachedSiteSettings = {
      companyName: payload.companyName || DEFAULT_SITE_SETTINGS.companyName,
      platformLabel: payload.platformLabel || DEFAULT_SITE_SETTINGS.platformLabel,
      logoUrl: payload.logoUrl ?? DEFAULT_SITE_SETTINGS.logoUrl,
      logoDataUrl: payload.logoDataUrl ?? DEFAULT_SITE_SETTINGS.logoDataUrl,
    };
    return cachedSiteSettings;
  } catch (error) {
    console.error('site settings fetch failed', error);
    cachedSiteSettings = DEFAULT_SITE_SETTINGS;
    return DEFAULT_SITE_SETTINGS;
  }
}

async function resolveLogoDataUrl(logoDataUrl?: string | null, logoUrl?: string | null) {
  if (logoDataUrl) {
    return logoDataUrl;
  }

  const url: string = logoUrl ?? DEFAULT_LOGO_URL;
  if (cachedLogoDataUrls.has(url)) {
    return cachedLogoDataUrls.get(url)!;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read logo image'));
      reader.readAsDataURL(blob);
    });
    cachedLogoDataUrls.set(url, dataUrl);
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



type LabelRenderContext = {
  pdf: any;
  order: Order;
  pickerName?: string;
  pageIndex: number;
};

function usesMeasuredUom(uom?: string | null) {
  const normalized = String(uom ?? '').trim().toUpperCase();
  return normalized === 'KG' || normalized === 'M';
}

function requestedValue(item: Order['items'][number]) {
  const qtyRequested = Number(item.qtyRequested ?? 0);
  if (qtyRequested > 0) return qtyRequested;
  return Number(item.requestedWeight ?? 0);
}

function separatedValue(item: Order['items'][number]) {
  const qtySeparated = Number(item.qtySeparated ?? 0);
  if (qtySeparated > 0) return qtySeparated;
  if (usesMeasuredUom(item.uom)) return Number(item.separatedWeight ?? 0);
  return qtySeparated;
}

function producedValue(item: Order['items'][number]) {
  const producedQty = Number(item.producedQty ?? 0);
  if (producedQty > 0) return producedQty;
  if (usesMeasuredUom(item.uom)) return Number(item.producedWeight ?? 0);
  return producedQty;
}

async function renderExitLabel({ pdf, order, pickerName, pageIndex }: LabelRenderContext) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 4;
  const innerWidth = pageWidth - margin * 2;
  const baseItem = order.items[pageIndex] ?? order.items[0] ?? {
    materialName: 'Material',
    color: 'Cor',
    qtySeparated: 0,
    qtyRequested: 0,
    uom: 'EA',
    conditions: []
  };
  // Garantir que conditions é sempre um array
  const item = {
    ...baseItem,
    conditions: (baseItem.conditions && Array.isArray(baseItem.conditions)) ? baseItem.conditions : []
  };
  const separado = Math.max(separatedValue(item), requestedValue(item));
  const volume = `${pageIndex + 1}/${Math.max(1, order.volumeCount)}`;

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.8);
  pdf.rect(margin, margin, innerWidth, pageHeight - margin * 2);

  const logoY = margin + 6;
  const logoSize = 30;
  const siteSettings = await fetchSiteSettingsSafely();
  const logoDataUrl = await resolveLogoDataUrl(siteSettings.logoDataUrl, siteSettings.logoUrl);
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', pageWidth / 2 - logoSize / 2, logoY, logoSize, logoSize);
  }

  pdf.setFontSize(18);
  pdf.text(siteSettings.companyName, pageWidth / 2, logoY + logoSize + 6, { align: 'center' });

  const detailX = margin + 6;
  const detailStartY = logoY + logoSize + 12;
  const lines = [
    ['Pedido', order.orderNumber],
    ['Data', simpleDate(order.dueDate ?? order.orderDate)],
    ['Tipo', item.materialName],
    ['Desc', item.description ?? item.materialName],
    ['Cor', item.color],
    ['Separado', `${separado} ${item.uom}`],
    ['Pac.', volume],
    ['Separador', pickerName ?? '-'],
  ];
  const warrantyHeight = 32;
  const warrantyY = pageHeight - margin - warrantyHeight;
  const bottomLimit = warrantyY - 4;

  pdf.setFontSize(10);
  const lineHeight = 4.8;
  let detailY = detailStartY;
  for (const [label, value] of lines) {
    if (detailY >= bottomLimit - 6) break;
    pdf.text(`${label}: ${value}`, detailX, detailY);
    detailY += lineHeight;
  }

  const conditions = Array.isArray(item.conditions) ? item.conditions : [];
  if (conditions.length > 0) {
    const condLineHeight = 3.6;
    const conditionBlockHeight = 3.5 + conditions.length * condLineHeight;
    const conditionsStartY = detailY + 4;
    if (conditionsStartY + conditionBlockHeight <= bottomLimit - 2) {
      pdf.setFontSize(7.5);
      pdf.text('Condições:', detailX, conditionsStartY);
      let currentY = conditionsStartY + 3.5;
      pdf.setFontSize(6.5);
      for (const cond of conditions) {
        if (currentY + condLineHeight > bottomLimit - 2) break;
        const condText = `${cond.key}: ${cond.value}`;
        pdf.text(condText.slice(0, 50), detailX, currentY);
        currentY += condLineHeight;
      }
      detailY = currentY;
    }
  }

  const itemsLabelY = detailY + 6;
  if (itemsLabelY < bottomLimit - 6) {
    pdf.setFontSize(11);
    pdf.text('Itens', detailX, itemsLabelY);
    const itemsDetailY = itemsLabelY + 5;
    if (itemsDetailY < bottomLimit - 2) {
      const qty = Math.max(separatedValue(item), requestedValue(item));
      pdf.setFontSize(9);
      const itemText = `${item.materialName} | ${item.color} | ${qty} ${item.uom}`;
      pdf.text(itemText.slice(0, 45), detailX, itemsDetailY);
    }
  }

  pdf.setFontSize(6.8);
  const warrantyText =
    'Garantia de 1 ano contra defeitos de fabricação ou material, válida a partir da data da compra mediante apresentação do comprovante. Em caso de falha, interrompa o uso e contate imediatamente o fornecedor. A garantia não cobre danos causados por uso inadequado durante a fabricação.';
  pdf.text(warrantyText, margin + 6, warrantyY + 6, { maxWidth: innerWidth - 12 });
  pdf.text('** Não trocamos material já utilizado **', margin + 6, warrantyY + warrantyHeight - 8);

  pdf.setFontSize(6.5);
  pdf.text(`Impresso em ${shortDate(new Date().toISOString())}`, margin + 6, pageHeight - margin - 4);
}

async function renderProductionLabel({ pdf, order, pageIndex }: LabelRenderContext) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 2;
  const baseItem = order.items[0] ?? {
    materialName: 'Material',
    color: 'Cor',
    qtySeparated: 0,
    qtyRequested: 0,
    qtyToProduce: 0,
    uom: 'EA',
    conditions: []
  };

  const item = {
    ...baseItem,
    conditions: (baseItem.conditions && Array.isArray(baseItem.conditions)) ? baseItem.conditions : []
  };

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.4);
  pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  const siteSettings = await fetchSiteSettingsSafely();
  const logoDataUrl = await resolveLogoDataUrl(siteSettings.logoDataUrl, siteSettings.logoUrl);

  // Cabeçalho Centralizado
  let currentY = margin + 1;
  const logoSize = 7;

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
    currentY += logoSize + 2;
  } else {
    currentY += 2;
  }

  pdf.setFontSize(6);
  pdf.text(siteSettings.companyName.slice(0, 35), pageWidth / 2, currentY, { align: 'center' });
  currentY += 3.2;

  const detailX = margin + 2;

  // Número do Pedido
  pdf.setFontSize(7.5);
  pdf.text(`${order.orderNumber}`, detailX, currentY);
  currentY += 3.8;

  // Detalhes da Produção e Quantidades
  pdf.setFontSize(6.5);
  pdf.text(`Solicitado: ${requestedValue(item)} ${item.uom}`, detailX, currentY);
  currentY += 3;

  if (producedValue(item) > 0) {
    pdf.text(`Produzido: ${producedValue(item)} ${item.uom}`, detailX, currentY);
    currentY += 3;
  }

  pdf.text(`Mat: ${item.materialName.slice(0, 30)}`, detailX, currentY);
  currentY += 3;

  if (item.color) {
    pdf.text(`Cor: ${item.color.slice(0, 30)}`, detailX, currentY);
    currentY += 3;
  }

  // Condições
  const conditions = item.conditions;
  if (conditions.length > 0) {
    pdf.setFontSize(5.2);
    pdf.text('Condições:', detailX, currentY);
    currentY += 2.6;
    for (const cond of conditions) {
      if (currentY > pageHeight - margin - 5) break;
      const condText = `${cond.key}: ${cond.value}`;
      pdf.text(condText.slice(0, 45), detailX, currentY);
      currentY += 2.4;
    }
  }

  // Descrição
  if (item.description && currentY < pageHeight - margin - 4) {
    if (item.description.trim().toLowerCase() !== item.materialName.trim().toLowerCase()) {
      pdf.setFontSize(4.8);
      pdf.text(item.description.slice(0, 85), detailX, currentY, { maxWidth: pageWidth - margin * 2 - 4 });
    }
  }

  // Rodapé
  pdf.setFontSize(4.5);
  const footerText = `${simpleDate(order.orderDate)} - Pç: ${pageIndex + 1}/${Math.max(1, order.volumeCount)}`;
  pdf.text(footerText, margin + 2, pageHeight - margin - 1);
}

export async function generateLabelPdf(order: Order, pickerName?: string, format: LabelFormat = 'EXIT_10x15'): Promise<void> {
  const dimensions = format === 'EXIT_10x15' ? [100, 150] : [40, 40];
  const pdf = new jsPDF({ unit: 'mm', format: dimensions });
  const render = format === 'EXIT_10x15' ? renderExitLabel : renderProductionLabel;
  const pageCount = format === 'EXIT_10x15' ? Math.max(1, order.volumeCount) : 1;

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex !== 0) pdf.addPage();
    await render({ pdf, order, pickerName, pageIndex });
  }

  pdf.save(`etiquetas-${order.orderNumber}-${format}.pdf`);
}
