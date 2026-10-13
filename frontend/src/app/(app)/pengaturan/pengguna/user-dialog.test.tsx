import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, expect, it, vi } from 'vitest';

import type { Departemen, RingkasanRole } from '@/lib/master-data';
import { UserDialog } from './user-dialog';

vi.mock('./actions', () => ({
  buatPengguna: vi.fn(),
  perbaruiPengguna: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const DEPARTEMEN = [{ id: 1, nama: 'IT' }] as unknown as Departemen[];
const ROLE = [
  { id: 1, nama: 'Staf', slug: 'staf', jangkauan_bawaan: 'pribadi' },
] as unknown as RingkasanRole[];

/*
 * Manajemen Pengguna menyegarkan dirinya tiap 5 detik untuk indikator
 * kehadiran, dan tiap `router.refresh()` menurunkan referensi array `role` dan
 * `departemen` yang baru walau isinya sama. Dulu efek pengisian ulang form
 * bergantung pada referensi itu, sehingga tiap penyegaran mengosongkan form di
 * tengah pengetikan — nama hilang saat pengguna mengisi email.
 */
it('mempertahankan ketikan saat props di-refresh (referensi role/departemen baru)', async () => {
  const { rerender } = render(
    <UserDialog terbuka onTutup={vi.fn()} pengguna={null} departemen={DEPARTEMEN} role={ROLE} />,
  );

  await userEvent.type(screen.getByLabelText('Nama Lengkap'), 'Budi Santoso');
  await userEvent.type(screen.getByLabelText('Email'), 'budi@hbmcorp.co.id');

  // Meniru router.refresh(): isi sama, referensi array baru.
  rerender(
    <UserDialog
      terbuka
      onTutup={vi.fn()}
      pengguna={null}
      departemen={[...DEPARTEMEN]}
      role={[...ROLE]}
    />,
  );

  expect(screen.getByLabelText('Nama Lengkap')).toHaveValue('Budi Santoso');
  expect(screen.getByLabelText('Email')).toHaveValue('budi@hbmcorp.co.id');
});
