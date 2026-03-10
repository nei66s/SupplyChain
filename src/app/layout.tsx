import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter, Space_Grotesk, Source_Code_Pro } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Inventário Ágil | Warehouse Management System Inteligente',
    template: '%s | Inventário Ágil',
  },
  description: 'A próxima geração da gestão logística em tempo real. IA preditiva, reservas instantâneas e controle total da sua cadeia de suprimentos.',
  keywords: ['WMS', 'SaaS', 'logística', 'estoque', 'IA', 'gestão de armazém', 'MRP'],
  authors: [{ name: 'Black Tower X' }],
  openGraph: {
    title: 'Inventário Ágil - Gestão Logística em Tempo Real',
    description: 'Resolva o gap entre vendas e produção com nossa IA preditiva e WMS de alta performance.',
    url: 'https://inventario-agil.vercel.app',
    siteName: 'Inventário Ágil',
    locale: 'pt-BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inventário Ágil',
    description: 'Gestão logística inteligente e realtime.',
  },
  icons: {
    icon: '/black-tower-x-transp.png',
    shortcut: '/black-tower-x-transp.png',
    apple: '/black-tower-x-transp.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${sourceCodePro.variable}`}>
      <head>
        <link rel="preload" href="/black-tower-x-transp.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const STORAGE_KEY = 'theme';
                const COOKIE_KEY = 'theme';
                const isTheme = (value) => value === 'dark' || value === 'light';

                const readStorage = () => {
                  try {
                    return localStorage.getItem(STORAGE_KEY);
                  } catch {
                    return null;
                  }
                };

                const writeStorage = (value) => {
                  try {
                    localStorage.setItem(STORAGE_KEY, value);
                  } catch {}
                };

                const readCookie = () => {
                  const match = document.cookie.match(/(?:^|;\\s*)theme=(dark|light)(?:;|$)/);
                  return match ? match[1] : null;
                };

                const writeCookie = (value) => {
                  try {
                    document.cookie =
                      COOKIE_KEY +
                      '=' +
                      value +
                      ';path=/;max-age=31536000;SameSite=Lax';
                  } catch {}
                };

                try {
                  const stored = readStorage();
                  const cookie = readCookie();
                  const prefersDark =
                    typeof window !== 'undefined' &&
                    window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = isTheme(stored)
                    ? stored
                    : isTheme(cookie)
                      ? cookie
                      : prefersDark
                        ? 'dark'
                        : 'light';

                  const root = document.documentElement;
                  root.classList.toggle('dark', theme === 'dark');
                  root.dataset.theme = theme;
                  writeStorage(theme);
                  writeCookie(theme);
                } catch {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased min-h-screen w-full overflow-x-hidden">
        {children}
        <Analytics />
        <SpeedInsights />
        <Toaster />
      </body>
    </html>
  );
}
