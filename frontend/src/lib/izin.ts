/**
 * Penolong keputusan tampilan berdasarkan izin dan jangkauan data.
 *
 * Dikumpulkan di satu berkas supaya dua halaman yang seharusnya memutuskan
 * hal yang sama tidak lambat laun berbeda.
 */

export interface Jangkauan {
  /** 1 Pribadi, 2 Departemen, 3 Korporat. */
  level: 1 | 2 | 3;
  /** Terisi hanya pada tingkat Departemen. */
  departemenId: number[];
}

export const JANGKAUAN_PRIBADI = 1;
export const JANGKAUAN_DEPARTEMEN = 2;
export const JANGKAUAN_KORPORAT = 3;

/**
 * Perlukah pemilih departemen ditampilkan.
 *
 * Berguna hanya bila ada lebih dari satu departemen untuk dipilih: pemegang
 * jangkauan Korporat, atau pemantau lebih dari satu departemen. Menampilkannya
 * pada pemantau satu departemen berarti menawarkan pilihan yang jawabannya
 * sudah pasti.
 */
export function bolehMenyaringDepartemen(jangkauan: Jangkauan): boolean {
  return jangkauan.level === JANGKAUAN_KORPORAT || jangkauan.departemenId.length > 1;
}

/** Melihat data orang lain, bukan hanya miliknya sendiri. */
export function melihatOrangLain(jangkauan: Jangkauan): boolean {
  return jangkauan.level > JANGKAUAN_PRIBADI;
}

/** Salah satu halaman pengaturan dapat dibuka. */
export function bolehBukaPengaturan(izin: readonly string[]): boolean {
  return ['pengguna.lihat', 'role.lihat', 'departemen.kelola', 'template.kelola'].some(
    (satu) => izin.includes(satu),
  );
}

export function labelJangkauan(level: number): string {
  if (level === JANGKAUAN_KORPORAT) return 'Korporat';
  if (level === JANGKAUAN_DEPARTEMEN) return 'Departemen';

  return 'Pribadi';
}
