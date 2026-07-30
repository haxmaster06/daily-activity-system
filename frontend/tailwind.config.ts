import type { Config } from 'tailwindcss';

/**
 * Token visual DAMS.
 *
 * Sumber:
 * - `.agents/Standarization/standarization.md` §3 (warna), §6 (skala), §10.3 (radius)
 * - `mockup/UI UX Mockup/.../daily_activity_monitoring/DESIGN.md` (font, spacing)
 *
 * Catatan warna primer: standar menetapkan Primary #1A73E8 untuk isian tombol dan
 * indikator aktif. Untuk teks di atas latar terang dipakai `primary-text` (#005BBF)
 * karena #1A73E8 tidak mencapai kontras 4.5:1 pada ukuran body (standar §20.1).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A73E8',
          hover: '#1666CF',
          text: '#005BBF',
          subtle: '#E8F0FE',
        },
        secondary: {
          DEFAULT: '#00BFA5',
          text: '#00695C',
          subtle: '#E0F7F2',
        },
        accent: {
          DEFAULT: '#FF8F00',
          text: '#8E4D00',
          subtle: '#FFF3E0',
        },
        danger: {
          DEFAULT: '#BA1A1A',
          text: '#93000A',
          subtle: '#FFDAD6',
        },
        background: '#F5F7FA',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F2F4F7',
          sunken: '#ECEEF1',
        },
        ink: {
          DEFAULT: '#191C1E',
          muted: '#414754',
          soft: '#727785',
        },
        line: {
          DEFAULT: '#D9DDE5',
          strong: '#C1C6D6',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Skala compact — baseline body 12–14px (standar §6.1)
        meta: ['10px', { lineHeight: '14px' }],
        caption: ['11px', { lineHeight: '16px' }],
        body: ['13px', { lineHeight: '20px' }],
        'body-lg': ['14px', { lineHeight: '20px' }],
        label: ['11px', { lineHeight: '16px', fontWeight: '500' }],
        table: ['12px', { lineHeight: '18px' }],
        'section-title': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'page-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
      },
      borderRadius: {
        control: '5px',
        input: '6px',
        card: '10px',
        modal: '14px',
      },
      height: {
        input: '36px',
        'input-sm': '32px',
        nav: '52px',
        subnav: '40px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(25, 28, 30, 0.04), 0 1px 3px rgba(25, 28, 30, 0.06)',
        modal: '0 8px 24px rgba(25, 28, 30, 0.12)',
        paper: '0 2px 12px rgba(25, 28, 30, 0.10)',
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '180ms',
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
