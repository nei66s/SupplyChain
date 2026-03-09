import { getSiteSettings } from '@/lib/domain/site-settings';
import { LoginShell, type LoginBranding } from './login-shell';

const FALLBACK_BRANDING: LoginBranding = {
  companyName: 'Black Tower X',
  platformLabel: 'Plataforma SaaS',
  logoSrc: '/black-tower-x-transp.png',
};

function normalizeBranding(settings?: Awaited<ReturnType<typeof getSiteSettings>>): LoginBranding {
  if (!settings) {
    return FALLBACK_BRANDING;
  }

  const logoSrc = settings.logoDataUrl || settings.logoUrl || FALLBACK_BRANDING.logoSrc;
  return {
    companyName: settings.companyName || FALLBACK_BRANDING.companyName,
    platformLabel: settings.platformLabel || FALLBACK_BRANDING.platformLabel,
    logoSrc,
  };
}

export default async function LoginPage() {
  const settings = await getSiteSettings().catch((error) => {
    console.error('Failed to load site settings', error);
    return undefined;
  });

  const branding = normalizeBranding(settings);
  return <LoginShell branding={branding} />;
}
