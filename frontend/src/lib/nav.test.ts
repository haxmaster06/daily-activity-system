import { describe, expect, it } from 'vitest';

import { bolehBukaPengaturan } from './izin';
import { MENU_UTAMA, bolehAkses, menuAktif, menuUntukIzin } from './nav';

/** Susunan izin bawaan tiap peran, disalin dari KatalogIzin di backend. */
const IZIN_STAFF = [
  'dashboard.lihat',
  'laporan.lihat',
  'laporan.buat',
  'laporan.ubah-sendiri',
  'laporan.hapus-sendiri',
  'laporan.kirim',
  'export.laporan',
  'departemen.lihat',
  'template.lihat',
];

const IZIN_SUPERVISOR = [
  ...IZIN_STAFF,
  'laporan.tinjau',
  'monitoring.lihat',
  'monitoring.kirim-pengingat',
];

const IZIN_ADMIN = [
  ...IZIN_SUPERVISOR,
  'departemen.kelola',
  'template.kelola',
  'pengguna.lihat',
  'pengguna.kelola',
  'pengguna.nonaktifkan',
  'pengguna.atur-kata-sandi',
  'role.lihat',
  'role.kelola',
];

// Matriks visibilitas menu — standar §2.3
describe('visibilitas menu per izin', () => {
  it('menyembunyikan Monitoring dan Pengaturan dari yang tidak berizin', () => {
    const href = menuUntukIzin(IZIN_STAFF).map((m) => m.href);

    expect(href).toEqual(['/dashboard', '/laporan', '/export']);
  });

  it('menampilkan Monitoring bagi pemegang izin monitoring', () => {
    const href = menuUntukIzin(IZIN_SUPERVISOR).map((m) => m.href);

    expect(href).toContain('/monitoring');
    expect(href).not.toContain('/pengaturan');
  });

  it('menampilkan Pengaturan bagi pemegang salah satu izin pengelolaan', () => {
    expect(menuUntukIzin(IZIN_ADMIN).map((m) => m.href)).toContain('/pengaturan');

    // Satu izin pengelolaan saja sudah cukup untuk masuk halaman induknya.
    expect(menuUntukIzin(['template.kelola']).map((m) => m.href)).toContain('/pengaturan');

    /*
     * Pengelola daftar master TIDAK termasuk. Izin itu dipegang staf dan
     * supervisor departemen; memasukkannya membuat setiap staf melihat pintu ke
     * wilayah administrator. Data Master punya menunya sendiri.
     */
    expect(menuUntukIzin(['master.kelola']).map((m) => m.href)).not.toContain('/pengaturan');
  });

  /*
   * Data Master ditentukan KEMAMPUAN, bukan izin.
   *
   * `master.kelola` berlaku menyeluruh, sedangkan daftar yang benar-benar dapat
   * dikelola ditentukan departemen pengelolanya. Memakai izin saja membuat menu
   * muncul bagi departemen yang tidak mengelola satu daftar pun — halaman yang
   * seluruh isinya hanya dapat dibaca.
   */
  describe('menu Data Master', () => {
    it('muncul hanya bila benar-benar mengelola sesuatu', () => {
      const href = menuUntukIzin(['master.kelola'], { bolehKelolaMaster: true }).map(
        (m) => m.href,
      );

      expect(href).toContain('/pengaturan/master-data');
    });

    it('tidak muncul bagi pemegang izin yang tidak mengelola daftar mana pun', () => {
      const href = menuUntukIzin(['master.kelola'], { bolehKelolaMaster: false }).map(
        (m) => m.href,
      );

      expect(href).not.toContain('/pengaturan/master-data');
    });

    it('tidak muncul bila kemampuannya tidak disebutkan sama sekali', () => {
      expect(menuUntukIzin(['master.kelola']).map((m) => m.href)).not.toContain(
        '/pengaturan/master-data',
      );
    });

    /*
     * Menyembunyikan menu saja tidak cukup — alamatnya tetap dapat diketik.
     * Yang tidak mengelola daftar mana pun tidak punya urusan di layar
     * pengelolaannya, jadi halamannya ikut tertutup.
     */
    it('menutup halamannya bagi yang tidak mengelola daftar mana pun', () => {
      expect(
        bolehAkses(['master.kelola'], '/pengaturan/master-data', { bolehKelolaMaster: true }),
      ).toBe(true);

      expect(
        bolehAkses(['master.kelola'], '/pengaturan/master-data', { bolehKelolaMaster: false }),
      ).toBe(false);

      expect(bolehAkses(['master.kelola'], '/pengaturan/master-data')).toBe(false);
    });
  });

  /*
   * Dua daftar yang menentukan hal yang sama harus sepakat: yang satu memunculkan
   * menu Pengaturan, yang lain memunculkan ikon gerigi. Ketika keduanya berbeda,
   * ada pengguna yang melihat pintunya tetapi tidak melihat petunjuk jalannya —
   * dan itu persis yang pernah terjadi pada `master.kelola`.
   */
  it('menyamakan izin menu Pengaturan dengan penentu ikon gerigi', () => {
    const menu = MENU_UTAMA.find((satu) => satu.href === '/pengaturan');

    expect(menu?.izin).toBeDefined();

    for (const izin of menu!.izin!) {
      expect(bolehBukaPengaturan([izin])).toBe(true);
    }
  });

  it('tidak menampilkan apa pun bagi yang belum punya izin', () => {
    expect(menuUntukIzin([])).toEqual([]);
  });
});

describe('penanda menu aktif', () => {
  it('menandai menu yang alamatnya sama persis', () => {
    expect(menuAktif('/laporan', '/laporan')).toBe(true);
  });

  it('menandai menu pada halaman turunannya', () => {
    expect(menuAktif('/laporan', '/laporan/12/ubah')).toBe(true);
  });

  it('tidak menandai alamat yang hanya berawalan sama', () => {
    expect(menuAktif('/laporan', '/laporan-lama')).toBe(false);
  });
});

describe('penjagaan akses halaman', () => {
  it('menolak halaman yang izinnya tidak dimiliki', () => {
    expect(bolehAkses(IZIN_STAFF, '/monitoring')).toBe(false);
    expect(bolehAkses(IZIN_STAFF, '/pengaturan')).toBe(false);
  });

  it('mengizinkan halaman yang izinnya dimiliki', () => {
    expect(bolehAkses(IZIN_SUPERVISOR, '/monitoring')).toBe(true);
    expect(bolehAkses(IZIN_ADMIN, '/pengaturan/pengguna')).toBe(true);
  });

  it('memakai aturan halaman terdalam, bukan induknya', () => {
    /*
     * Pemegang izin template boleh masuk /pengaturan — tetapi bukan berarti
     * boleh masuk manajemen pengguna. Tanpa pencocokan terdalam, semantik
     * "salah satu izin" pada induknya akan meloloskannya.
     */
    const hanyaTemplate = ['template.kelola'];

    expect(bolehAkses(hanyaTemplate, '/pengaturan')).toBe(true);
    expect(bolehAkses(hanyaTemplate, '/pengaturan/template')).toBe(true);
    expect(bolehAkses(hanyaTemplate, '/pengaturan/pengguna')).toBe(false);
    expect(bolehAkses(hanyaTemplate, '/pengaturan/role')).toBe(false);
  });

  it('membiarkan halaman tak terdaftar terbuka bagi yang sudah masuk', () => {
    expect(bolehAkses([], '/profil')).toBe(true);
  });
});
