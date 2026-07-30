import { describe, expect, it } from 'vitest';

import { menuAktif, menuUntukRole } from './nav';

// Matriks visibilitas menu — standar §2.3
describe('visibilitas menu per role', () => {
  it('menyembunyikan Monitoring dan Pengaturan dari Staff', () => {
    const label = menuUntukRole('staff').map((m) => m.label);
    expect(label).toEqual(['Dashboard', 'Laporan Saya', 'Export']);
  });

  it('memberi Supervisor akses Monitoring tanpa Pengaturan', () => {
    const label = menuUntukRole('supervisor').map((m) => m.label);
    expect(label).toContain('Monitoring');
    expect(label).not.toContain('Pengaturan');
  });

  it('memberi Manager akses Monitoring tanpa Pengaturan', () => {
    const label = menuUntukRole('manager').map((m) => m.label);
    expect(label).toContain('Monitoring');
    expect(label).not.toContain('Pengaturan');
  });

  it('memberi Administrator seluruh menu', () => {
    const label = menuUntukRole('administrator').map((m) => m.label);
    expect(label).toEqual([
      'Dashboard',
      'Laporan Saya',
      'Monitoring',
      'Export',
      'Pengaturan',
    ]);
  });
});

describe('penanda menu aktif', () => {
  it('menandai menu pada path yang sama persis', () => {
    expect(menuAktif('/laporan', '/laporan')).toBe(true);
  });

  it('menandai menu pada halaman turunan', () => {
    expect(menuAktif('/laporan', '/laporan/12')).toBe(true);
  });

  it('tidak menandai path yang hanya berawalan sama', () => {
    expect(menuAktif('/laporan', '/laporan-lain')).toBe(false);
  });
});
