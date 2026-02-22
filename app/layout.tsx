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
                try {
                  const saved = localStorage.getItem('theme');
                  const theme = saved === 'dark' ? 'dark' : 'light';
                  const root = document.documentElement;
                  root.classList.toggle('dark', theme === 'dark');
                  root.dataset.theme = theme;
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
