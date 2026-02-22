import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=Source+Code+Pro&display=swap"
          rel="stylesheet"
        />
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
        <Toaster />
      </body>
    </html>
  );
}
