import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import KpiAnalitikPage from './page';

/*
 * Halaman penanda, dan justru karena itu diuji.
 *
 * Tab KPI sudah tampil di navigasi sementara isinya belum dikerjakan. Yang
 * dijaga di sini: tab itu tidak boleh pernah terbuka kosong — orang yang
 * menekannya harus menemukan kabar, bukan halaman putih yang terlihat seperti
 * kerusakan.
 */
it('mengabarkan bahwa KPI belum tersedia', () => {
  render(<KpiAnalitikPage />);

  expect(screen.getByRole('heading', { name: /KPI segera hadir/i })).toBeInTheDocument();
  expect(screen.getByText(/disepakati bersama manajemen/i)).toBeInTheDocument();
});
