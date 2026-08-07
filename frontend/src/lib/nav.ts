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
  /**
   * Menu yang visibilitasnya ditentukan KEMAMPUAN, bukan izin.
   *
   * Data Master adalah satu-satunya sejauh ini: izinnya berlaku menyeluruh,
   * sedangkan daftar yang benar-benar dapat dikelola ditentukan departemen
   * pengelolanya. Hanya server yang tahu pemetaan itu, sehingga jawabannya
   * dibawa dalam muatan pengguna sebagai `bolehKelolaMaster`.
   */
  kemampuan?: 'master';
}

/** Kemampuan yang tidak dapat disimpulkan dari daftar izin saja. */
export interface KemampuanPengguna {
  bolehKelolaMaster?: boolean;
}

export const MENU_UTAMA: readonly MenuUtama[] = [
  { label: 'Dashboard', href: '/dashboard', izin: ['dashboard.lihat'] },
  { label: 'Laporan Saya', href: '/laporan', izin: ['laporan.lihat'] },
  { label: 'Progres', href: '/progress', izin: ['tugas.lihat'] },
  { label: 'Monitoring', href: '/monitoring', izin: ['monitoring.lihat'] },
  { label: 'Analytics', href: '/analitik', izin: ['analitik.lihat'] },
  { label: 'Export', href: '/export', izin: ['export.laporan'] },
  /*
   * Data Master berdiri sendiri, tidak lagi menumpang Pengaturan.
   *
   * Yang mengelolanya adalah unit kerja — Purchasing untuk Supplier, Produksi
   * untuk Produk — bukan administrator. "Pengaturan" di aplikasi mana pun
   * berarti wilayah admin, dan menyimpan pekerjaan harian sebuah departemen di
   * baliknya membuat orang yang berhak justru tidak menemukannya.
   *
   * Tampil hanya bila pengguna benar-benar mengelola sesuatu — lihat
   * `kemampuan` di atas.
   */
  { label: 'Data Master', href: '/pengaturan/master-data', kemampuan: 'master' },
  {
    label: 'Pengaturan',
    href: '/pengaturan',
    /*
     * Wajib sama persis dengan `bolehBukaPengaturan()` di lib/izin.ts — yang
     * satu menentukan menu ini, yang lain menentukan ikon gerigi di kanan atas.
     *
     * `master.kelola` sengaja TIDAK di sini. Izin itu dipegang staf dan
     * supervisor departemen, dan memasukkannya membuat setiap staf melihat menu
     * Pengaturan — wilayah yang isinya sama sekali bukan urusannya.
     */
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
];

function memenuhi(
  izinDimiliki: readonly string[],
  menu: MenuUtama,
  kemampuan: KemampuanPengguna = {},
): boolean {
  // Kemampuan menang atas izin: menu yang menyebutkannya tidak dinilai dari
  // daftar izin sama sekali.
  if (menu.kemampuan === 'master') {
    return kemampuan.bolehKelolaMaster === true;
  }

  return menu.izin === undefined || menu.izin.some((satu) => izinDimiliki.includes(satu));
}

export function menuUntukIzin(
  izin: readonly string[],
  kemampuan: KemampuanPengguna = {},
): MenuUtama[] {
  return MENU_UTAMA.filter((menu) => memenuhi(izin, menu, kemampuan));
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
export function bolehAkses(
  izin: readonly string[],
  href: string,
  kemampuan: KemampuanPengguna = {},
): boolean {
  /*
   * Kemampuan ikut menentukan akses halaman, bukan hanya tampilnya menu.
   *
   * Sempat dibedakan — menu berdasar kemampuan, halaman berdasar izin — dengan
   * alasan "membaca tetap boleh". Alasan itu tidak kuat: membaca daftar master
   * terjadi di form pengisian laporan, bukan di layar pengelolaannya. Orang
   * yang tidak mengelola satu daftar pun tidak punya urusan di sana, dan
   * menyembunyikan menunya sementara alamatnya tetap terbuka hanyalah pagar
   * yang tidak menutup apa-apa.
   */
  const cocok = [...AKSES_HALAMAN, ...MENU_UTAMA]
    .filter((item) => menuAktif(item.href, href))
    .sort((a, b) => {
      // Yang berbasis kemampuan didahulukan: ia aturan yang lebih ketat.
      if ((a.kemampuan === undefined) !== (b.kemampuan === undefined)) {
        return a.kemampuan === undefined ? 1 : -1;
      }

      return b.href.length - a.href.length;
    });

  return cocok[0] === undefined || memenuhi(izin, cocok[0], kemampuan);
}

/** Menu aktif bila path sama persis atau merupakan turunannya (`/laporan/12`). */
export function menuAktif(hrefMenu: string, pathSaatIni: string): boolean {
  return pathSaatIni === hrefMenu || pathSaatIni.startsWith(`${hrefMenu}/`);
}
