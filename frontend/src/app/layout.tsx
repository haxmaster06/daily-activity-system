import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import { QueryProvider } from '@/providers/query-provider';
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Light mode saja — tidak ada dark mode (standar §3.1).
    <html lang="id" className={`${jakarta.variable} ${inter.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
