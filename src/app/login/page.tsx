import { LoginShell, type LoginBranding } from './login-shell';

const FALLBACK_BRANDING: LoginBranding = {
  companyName: 'Black Tower X',
  platformLabel: 'Inventário Ágil',
  logoSrc: '/black-tower-x-transp.png',
};

export default async function LoginPage() {
  // Since we don't have subdomain-based routing yet to infer the tenant before login,
  // we render the login page using the platform's default branding.
  const branding = FALLBACK_BRANDING;
  return <LoginShell branding={branding} />;
}

