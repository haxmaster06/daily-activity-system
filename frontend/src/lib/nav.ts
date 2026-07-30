/**
 * Definisi menu utama dan visibilitasnya per role (standar §2.2–§2.3).
 *
 * Menu ini dipakai oleh Horizontal Top Navigation Bar. DAMS tidak memakai
 * permanent sidebar.
 */

export type Role = 'staff' | 'supervisor' | 'manager' | 'administrator';

export interface MenuUtama {
  label: string;
  href: string;
  /** Role yang boleh melihat menu ini. */
  roles: readonly Role[];
}

const SEMUA_ROLE = ['staff', 'supervisor', 'manager', 'administrator'] as const;

export const MENU_UTAMA: readonly MenuUtama[] = [
  { label: 'Dashboard', href: '/dashboard', roles: SEMUA_ROLE },
  { label: 'Laporan Saya', href: '/laporan', roles: SEMUA_ROLE },
  {
    label: 'Monitoring',
    href: '/monitoring',
    roles: ['supervisor', 'manager', 'administrator'],
  },
  { label: 'Export', href: '/export', roles: SEMUA_ROLE },
  { label: 'Pengaturan', href: '/pengaturan', roles: ['administrator'] },
];

export function menuUntukRole(role: Role): MenuUtama[] {
  return MENU_UTAMA.filter((menu) => menu.roles.includes(role));
}

/**
 * Apakah role boleh membuka halaman tersebut.
 *
 * Menyembunyikan menu saja tidak cukup — alamat halaman tetap dapat diketik
 * langsung. Halaman terbatas wajib memanggil `wajibAkses` yang memakai fungsi
 * ini (deny by default, non-fungsional §2.3).
 *
 * Halaman yang tidak terdaftar di menu utama dianggap terbuka untuk semua role
 * yang sudah masuk; pembatasan sebenarnya tetap ditegakkan backend.
 */
export function bolehAkses(role: Role, href: string): boolean {
  const menu = MENU_UTAMA.find((item) => menuAktif(item.href, href));

  return menu === undefined || menu.roles.includes(role);
}

/** Menu aktif bila path sama persis atau merupakan turunannya (`/laporan/12`). */
export function menuAktif(hrefMenu: string, pathSaatIni: string): boolean {
  return pathSaatIni === hrefMenu || pathSaatIni.startsWith(`${hrefMenu}/`);
}

export const LABEL_ROLE: Record<Role, string> = {
  staff: 'Staff',
  supervisor: 'Supervisor',
  manager: 'Manager',
  administrator: 'Administrator',
};
