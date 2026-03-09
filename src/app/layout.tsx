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
  title: 'Inventário Ágil',
  description: 'Gerencie eficientemente sua cadeia de suprimentos, do pedido a entrega.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${sourceCodePro.variable}`}>
      <head>
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
