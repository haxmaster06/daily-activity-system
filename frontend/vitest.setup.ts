import '@testing-library/jest-dom/vitest';

/*
 * jsdom tidak mengimplementasikan `matchMedia`, sedangkan `useLebarLayar`
 * memakainya untuk memilih bentuk pengisian. Tanpa stub ini komponen apa pun
 * yang memanggilnya gagal render — dan galatnya menyesatkan, karena yang
 * terlihat hanya "elemen tidak ditemukan".
 *
 * Jawabannya selalu "tidak cocok": itu berarti layar lebar, sehingga test
 * membaca mode grid seperti pemakaian di komputer kerja.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (kueri: string): MediaQueryList =>
    ({
      matches: false,
      media: kueri,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/*
 * jsdom tidak mengimplementasikan `ResizeObserver`, sedangkan Radix memakainya
 * untuk menempatkan Popover dan Tooltip. Tanpa stub ini, komponen apa pun yang
 * membuka salah satunya gagal dengan "ResizeObserver is not defined" — galat
 * yang menyesatkan, karena yang terlihat seolah komponennya yang rusak.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
