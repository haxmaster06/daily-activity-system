'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Tema MUI DAMS.
 *
 * MUI dipakai hanya untuk widget yang tidak ada padanannya di shadcn maupun
 * React Bits — saat ini Autocomplete dan DatePicker (lihat
 * `docs/standar-interaksi.md` §5.1). Stepper dan Tabs sudah memakai komponen
 * React Bits sendiri, sehingga MUI tidak lagi menyentuh keduanya.
 *
 * Supaya tidak terlihat seperti aplikasi Material generik, seluruh token
 * disamakan dengan Tailwind: warna, radius, tinggi kontrol, dan skala huruf
 * compact 12–14px.
 *
 * Komponen MUI yang muncul dengan gaya Material bawaan dianggap cacat.
 */

const PRIMARY = '#1A73E8';
const PRIMARY_TEXT = '#005BBF';
const INK = '#191C1E';
const INK_MUTED = '#414754';
const INK_SOFT = '#727785';
const LINE = '#D9DDE5';
const SURFACE = '#FFFFFF';
const SURFACE_MUTED = '#F2F4F7';

/** Easing keluar: cepat di awal, mendarat halus (standar interaksi §4.1). */
export const EASE_KELUAR = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const damsTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: { main: PRIMARY, dark: PRIMARY_TEXT, contrastText: '#FFFFFF' },
    secondary: { main: '#00BFA5', dark: '#00695C', contrastText: '#FFFFFF' },
    warning: { main: '#FF8F00', dark: '#8E4D00' },
    error: { main: '#BA1A1A', dark: '#93000A' },
    text: { primary: INK, secondary: INK_MUTED, disabled: INK_SOFT },
    background: { default: '#F5F7FA', paper: SURFACE },
    divider: LINE,
  },

  shape: { borderRadius: 6 },

  typography: {
    fontFamily: 'var(--font-body), Inter, system-ui, sans-serif',
    // Skala compact DAMS (standarisasi §6.1)
    fontSize: 13,
    htmlFontSize: 16,
    body1: { fontSize: 14, lineHeight: '20px' },
    body2: { fontSize: 13, lineHeight: '20px' },
    caption: { fontSize: 11, lineHeight: '16px' },
    button: { fontSize: 14, fontWeight: 500, textTransform: 'none' },
    h1: { fontFamily: 'var(--font-heading), Plus Jakarta Sans, sans-serif' },
    h2: { fontFamily: 'var(--font-heading), Plus Jakarta Sans, sans-serif' },
    h3: { fontFamily: 'var(--font-heading), Plus Jakarta Sans, sans-serif' },
  },

  transitions: {
    duration: {
      shortest: 140,
      shorter: 180,
      short: 220,
      standard: 260,
      complex: 380,
      enteringScreen: 260,
      leavingScreen: 220,
    },
    easing: {
      easeOut: EASE_KELUAR,
      easeInOut: EASE_KELUAR,
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Menghormati prefers-reduced-motion adalah syarat aksesibilitas
        // (standar interaksi §4.3), bukan pilihan.
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: SURFACE, // bukan abu-abu generik (standarisasi §5.1)
          borderRadius: 6,
          fontSize: 14,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: INK_SOFT },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PRIMARY,
            borderWidth: 2,
          },
        },
        input: { paddingTop: 8, paddingBottom: 8, height: 20 },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 13, color: INK_MUTED, '&.Mui-focused': { color: PRIMARY_TEXT } },
      },
    },

    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: 11, marginLeft: 2 } },
    },

    MuiAutocomplete: {
      styleOverrides: {
        inputRoot: { paddingTop: 2, paddingBottom: 2 },
        option: {
          fontSize: 13,
          minHeight: 32,
          '&[aria-selected="true"]': { backgroundColor: '#E8F0FE' },
        },
        paper: {
          borderRadius: 10,
          border: `1px solid ${LINE}`,
          boxShadow: '0 8px 24px rgba(25, 28, 30, 0.12)',
        },
        noOptions: { fontSize: 13, color: INK_SOFT },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 38 },
        indicator: { height: 2, backgroundColor: PRIMARY, transition: `all 260ms ${EASE_KELUAR}` },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 38,
          padding: '0 12px',
          fontSize: 14,
          fontWeight: 500,
          color: INK_MUTED,
          transition: `color 180ms ${EASE_KELUAR}`,
          '&.Mui-selected': { color: PRIMARY_TEXT, fontWeight: 600 },
        },
      },
    },

    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: 13,
          color: INK_SOFT,
          '&.Mui-active': { fontWeight: 600, color: INK },
          '&.Mui-completed': { color: INK_MUTED },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          fontSize: 22,
          color: SURFACE_MUTED,
          transition: `color 260ms ${EASE_KELUAR}`,
          '&.Mui-active': { color: PRIMARY },
          '&.Mui-completed': { color: '#00BFA5' },
        },
        text: { fontSize: 12, fontWeight: 600 },
      },
    },

    MuiStepConnector: {
      styleOverrides: {
        line: { borderColor: LINE, transition: `border-color 260ms ${EASE_KELUAR}` },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 5, height: 22, fontSize: 11, fontWeight: 500 },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: 11, borderRadius: 6, backgroundColor: '#2D3133' },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
  },
});
