import { Breadcrumb } from '@/components/layout/breadcrumb';
import type { MetaHalaman } from '@/components/ui/pagination';
import { panggilApi } from '@/lib/api';
import { ambilDepartemen, ambilRole, type Pengguna } from '@/lib/master-data';
import { wajibAkses } from '@/lib/session';
import { UserTable } from './user-table';

export const metadata = { title: 'Manajemen Pengguna — DAMS' };

interface Params {
  cari?: string;
  departemen_id?: string;
  role?: string;
  status?: string;
  halaman?: string;
}

export default async function ManajemenPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const pengguna = await wajibAkses('/pengaturan');
  const filter = await searchParams;

  // Penyaringan dan pagination dikerjakan server (standar §24.1).
  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.departemen_id) query.set('departemen_id', filter.departemen_id);
  if (filter.role) query.set('role', filter.role);
  if (filter.status) query.set('status', filter.status);
  if (filter.halaman) query.set('page', filter.halaman);

  const [daftar, departemen, role] = await Promise.all([
    panggilApi<Pengguna[]>(`/pengguna?${query.toString()}`),
    ambilDepartemen(),
    ambilRole(),
  ]);

  return (
    <>
      <Breadcrumb
        jejak={[{ label: 'Pengaturan', href: '/pengaturan' }, { label: 'Manajemen Pengguna' }]}
      />

      <UserTable
        pengguna={daftar.data}
        meta={daftar.meta as MetaHalaman}
        departemen={departemen}
        role={role}
        idPenggunaSaatIni={pengguna.id}
      />
    </>
  );
}
