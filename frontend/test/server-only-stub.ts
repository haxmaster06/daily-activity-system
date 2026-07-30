/**
 * Pengganti paket `server-only` saat test.
 *
 * Paket aslinya sengaja melempar galat bila di-import dari lingkungan client.
 * Vitest berjalan pada jsdom sehingga dianggap client, padahal modul yang diuji
 * memang modul server. Stub ini menonaktifkan penjagaan tersebut khusus di
 * test — perilaku pada build produksi tidak berubah.
 */
export {};
