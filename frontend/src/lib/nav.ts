/**
 * Definisi menu utama dan visibilitasnya (standar §2.2–§2.3).
 *
 * Menu ini dipakai oleh Horizontal Top Navigation Bar. DAMS tidak memakai
 * permanent sidebar.
 *
 * Visibilitas ditentukan **izin**, bukan nama peran. Peran dapat dibuat dan
 * diubah administrator dari layar, sehingga daftar peran tidak lagi tertutup
 * dan tidak bisa dijadikan patokan di kode.
 */

export interface MenuUtama {
  label: string;
  href: string;
  /**
   * Memegang salah satu izin ini sudah cukup.
   *
   * Tanpa `izin`, halaman terbuka bagi siapa pun yang sudah masuk.
   */
  izin?: readonly string[];
}

export const MENU_UTAMA: readonly MenuUtama[] = [
  { label: 'Dashboard', href: '/dashboard', izin: ['dashboard.lihat'] },
  { label: 'Laporan Saya', href: '/laporan', izin: ['laporan.lihat'] },
  { label: 'Monitoring', href: '/monitoring', izin: ['monitoring.lihat'] },
  { label: 'Export', href: '/export', izin: ['export.laporan'] },
  {
    label: 'Pengaturan',
    href: '/pengaturan',
    izin: ['pengguna.lihat', 'role.lihat', 'departemen.kelola', 'template.kelola'],
  },
];

/**
 * Halaman yang dijaga tetapi tidak muncul sebagai menu tersendiri.
 *
 * Diperiksa lebih dulu daripada `MENU_UTAMA` karena alamatnya lebih spesifik.
 */
export const AKSES_HALAMAN: readonly MenuUtama[] = [
  { label: 'Manajemen Pengguna', href: '/pengaturan/pengguna', izin: ['pengguna.lihat'] },
  { label: 'Manajemen Peran', href: '/pengaturan/role', izin: ['role.lihat'] },
  { label: 'Manajemen Departemen', href: '/pengaturan/departemen', izin: ['departemen.kelola'] },
  { label: 'Template Laporan', href: '/pengaturan/template', izin: ['template.kelola'] },
  { label: 'Data Master', href: '/pengaturan/master-data', izin: ['master.kelola'] },
];

function memenuhi(izinDimiliki: readonly string[], menu: MenuUtama): boolean {
  return menu.izin === undefined || menu.izin.some((satu) => izinDimiliki.includes(satu));
}

export function menuUntukIzin(izin: readonly string[]): MenuUtama[] {
  return MENU_UTAMA.filter((menu) => memenuhi(izin, menu));
}

/**
 * Apakah pemegang izin ini boleh membuka halaman tersebut.
 *
 * Menyembunyikan menu saja tidak cukup — alamat halaman tetap dapat diketik
 * langsung. Halaman terbatas wajib memanggil `wajibAkses` yang memakai fungsi
 * ini (deny by default, non-fungsional §2.3).
 *
 * Yang dicocokkan adalah alamat paling spesifik lebih dulu. Tanpa itu,
 * semantik "salah satu izin" pada `/pengaturan` akan meloloskan operator yang
 * hanya mengurus template ke `/pengaturan/pengguna` — sebab
 * `menuAktif('/pengaturan', '/pengaturan/pengguna')` bernilai benar.
 *
 * Halaman yang tidak terdaftar di mana pun dianggap terbuka untuk semua yang
 * sudah masuk; pembatasan sebenarnya tetap ditegakkan backend.
 */
export function bolehAkses(izin: readonly string[], href: string): boolean {
  const cocok = [...AKSES_HALAMAN, ...MENU_UTAMA]
    .filter((item) => menuAktif(item.href, href))
    .sort((a, b) => b.href.length - a.href.length);

  return cocok[0] === undefined || memenuhi(izin, cocok[0]);
}

/** Menu aktif bila path sama persis atau merupakan turunannya (`/laporan/12`). */
export function menuAktif(hrefMenu: string, pathSaatIni: string): boolean {
  return pathSaatIni === hrefMenu || pathSaatIni.startsWith(`${hrefMenu}/`);
}
