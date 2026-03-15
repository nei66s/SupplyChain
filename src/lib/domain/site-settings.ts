import { query } from '@/lib/db';

export type SiteSettings = {
  companyName: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  platformLabel: string;
  logoUrl: string | null;
  logoDataUrl: string | null;
  logoContentType: string | null;
  updatedAt: string;
};

export type SiteSettingsUpdate = Partial<{
  companyName: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  platformLabel: string;
  logoUrl: string | null;
  logoData: Buffer | null;
  logoContentType: string | null;
}>;

const PRIMARY_SITE_ID = 'primary';

function formatRow(row: {
  company_name: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  platform_label: string;
  logo_url: string | null;
  logo_data: Buffer | null;
  logo_content_type: string | null;
  updated_at: Date;
}): SiteSettings {
  return {
    companyName: row.company_name,
    document: row.document,
    phone: row.phone,
    address: row.address,
    platformLabel: row.platform_label,
    logoUrl: row.logo_url,
    logoDataUrl: row.logo_data
      ? `data:${row.logo_content_type ?? 'image/png'};base64,${row.logo_data.toString('base64')}`
      : null,
    logoContentType: row.logo_content_type,
    updatedAt: row.updated_at.toISOString(),
  };
}

import { getJsonCache, setJsonCache } from '@/lib/cache';
import { getTenantFromSession } from '@/lib/auth';

export async function getSiteSettings(): Promise<SiteSettings> {
  const tenantId = await getTenantFromSession();
  const cacheKey = `site-settings:${tenantId ?? 'public'}`;

  // Tenta buscar no cache primeiro
  const cached = await getJsonCache<SiteSettings>(cacheKey);
  if (cached) return cached;

  // Tenta buscar no Tenant Atual da Sessão (O wrapper query aplica o RLS)
  const result = await query(
    'SELECT company_name, document, phone, address, platform_label, logo_url, logo_data, logo_content_type, updated_at FROM site_settings WHERE id = $1 AND (tenant_id = $2::uuid OR tenant_id IS NULL) LIMIT 1',
    [PRIMARY_SITE_ID, tenantId]
  );

  let settings: SiteSettings;

  if (result.rowCount === 0) {
    // Retorna um fallback vazio mas estruturado se nada existir para esse tenant
    settings = {
      companyName: 'Nova Empresa',
      document: null,
      phone: null,
      address: null,
      platformLabel: 'Inventário Ágil',
      logoUrl: '/black-tower-x-transp.png',
      logoDataUrl: null,
      logoContentType: null,
      updatedAt: new Date().toISOString(),
    };
  } else {
    settings = formatRow(result.rows[0]);
  }

  // Salva no cache por 1 hora (3600 segundos)
  await setJsonCache(cacheKey, settings, 3600);
  return settings;
}

import { invalidateCache } from '@/lib/cache';

export async function updateSiteSettings(update: SiteSettingsUpdate): Promise<SiteSettings> {
  if (!update || Object.keys(update).length === 0) {
    return getSiteSettings();
  }

  const assignments: string[] = [];
  const params: unknown[] = [];

  if (update.companyName !== undefined) {
    assignments.push(`company_name = $${params.length + 1}`);
    params.push(update.companyName);
  }
  if (update.document !== undefined) {
    assignments.push(`document = $${params.length + 1}`);
    params.push(update.document);
  }
  if (update.phone !== undefined) {
    assignments.push(`phone = $${params.length + 1}`);
    params.push(update.phone);
  }
  if (update.address !== undefined) {
    assignments.push(`address = $${params.length + 1}`);
    params.push(update.address);
  }
  if (update.platformLabel !== undefined) {
    assignments.push(`platform_label = $${params.length + 1}`);
    params.push(update.platformLabel);
  }
  if (Object.prototype.hasOwnProperty.call(update, 'logoUrl')) {
    assignments.push(`logo_url = $${params.length + 1}`);
    params.push(update.logoUrl);
  }
  if (Object.prototype.hasOwnProperty.call(update, 'logoData')) {
    assignments.push(`logo_data = $${params.length + 1}`);
    params.push(update.logoData);
  }
  if (Object.prototype.hasOwnProperty.call(update, 'logoContentType')) {
    assignments.push(`logo_content_type = $${params.length + 1}`);
    params.push(update.logoContentType);
  }

  assignments.push(`updated_at = now()`);

  const result = await query(
    `UPDATE site_settings SET ${assignments.join(', ')} WHERE id = $${params.length + 1} RETURNING company_name, document, phone, address, platform_label, logo_url, logo_data, logo_content_type, updated_at`,
    [...params, PRIMARY_SITE_ID]
  );

  if (result.rowCount === 0) {
    throw new Error('Site settings not found');
  }

  const tenantId = await getTenantFromSession();
  await invalidateCache(`site-settings:${tenantId ?? 'public'}`);

  return formatRow(result.rows[0]);
}
