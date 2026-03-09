"use server";

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSiteSettings, updateSiteSettings } from '@/lib/domain/site-settings';

const FALLBACK_PLATFORM_LABEL = 'Plataforma SaaS';
const FALLBACK_SETTINGS = {
  companyName: 'Black Tower X',
  document: null,
  phone: null,
  address: null,
  platformLabel: FALLBACK_PLATFORM_LABEL,
  logoUrl: '/black-tower-x-transp.png',
  logoDataUrl: null,
  logoContentType: null,
};

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('site GET error', error);
    return NextResponse.json(FALLBACK_SETTINGS, { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const companyName =
      typeof body.companyName === 'string' ? body.companyName.trim() : '';
    const document = typeof body.document === 'string' ? body.document.trim() : null;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
    const address = typeof body.address === 'string' ? body.address.trim() : null;
    const rawLogoData =
      typeof body.logoDataUrl === 'string' ? body.logoDataUrl.trim() : '';

    if (!companyName) {
      return NextResponse.json(
        { message: 'Nome da empresa nao pode ficar vazio' },
        { status: 400 }
      );
    }

    if (!rawLogoData) {
      return NextResponse.json(
        { message: 'Faça upload do logo para salvar a identidade.' },
        { status: 400 }
      );
    }

    const parsedLogo = parseDataUrl(rawLogoData);
    if (!parsedLogo) {
      return NextResponse.json({ message: 'Formato de imagem invalido' }, { status: 400 });
    }

    const updated = await updateSiteSettings({
      companyName,
      document,
      phone,
      address,
      platformLabel: FALLBACK_PLATFORM_LABEL,
      logoData: parsedLogo.buffer,
      logoContentType: parsedLogo.contentType,
      logoUrl: null,
    });

    return NextResponse.json({
      companyName: updated.companyName,
      document: updated.document,
      phone: updated.phone,
      address: updated.address,
      platformLabel: updated.platformLabel,
      logoDataUrl: updated.logoDataUrl,
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
    }
    console.error('site PATCH error', error);
    return NextResponse.json({ message: 'Não foi possivel atualizar' }, { status: 500 });
  }
}
