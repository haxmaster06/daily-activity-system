import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import { PromptPasang } from '@/components/layout/prompt-pasang';
import { QueryProvider } from '@/providers/query-provider';
import { UiProvider } from '@/providers/ui-provider';
import './globals.css';

// Font di-host sendiri saat build — tanpa permintaan ke server luar saat runtime.
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DAMS — Sistem Monitoring Aktivitas Harian',
  description: 'Pencatatan dan pemantauan aktivitas harian antar departemen.',
  // Membuat iOS meluncurkan aplikasi layar penuh dari homescreen, bukan
  // berbingkai Safari. Link manifest disuntik otomatis dari app/manifest.ts.
  appleWebApp: { capable: true, title: 'DAMS', statusBarStyle: 'default' },
};

// Di Next 15 themeColor lewat viewport, bukan metadata.
export const viewport: Viewport = { themeColor: '#1A73E8' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Light mode saja — tidak ada dark mode (standar §3.1).
    <html lang="id" className={`${jakarta.variable} ${inter.variable}`}>
      <body>
        <UiProvider>
          <QueryProvider>{children}</QueryProvider>
          <PromptPasang />
        </UiProvider>
      </body>
    </html>
  );
}
