'use client';

import type { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { id } from 'date-fns/locale';

import { damsTheme } from '@/theme/mui-theme';

/**
 * Penyedia gaya untuk komponen MUI.
 *
 * `AppRouterCacheProvider` menyisipkan gaya Emotion pada render server sehingga
 * tidak ada kedipan gaya saat halaman pertama dimuat.
 *
 * `enableCssLayer` menaruh gaya MUI pada CSS layer tersendiri, sehingga utility
 * Tailwind tetap menang tanpa perlu `!important` — keduanya dipakai
 * berdampingan (lihat `docs/standar-interaksi.md` §5.1).
 *
 * Locale date-fns `id` membuat DatePicker menampilkan nama bulan dan hari dalam
 * Bahasa Indonesia (standarisasi §26).
 */
export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui', enableCssLayer: true }}>
      <ThemeProvider theme={damsTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={id}>
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
