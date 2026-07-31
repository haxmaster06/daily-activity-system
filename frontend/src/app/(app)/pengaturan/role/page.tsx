import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilKatalogIzin, ambilPeran } from '@/lib/peran-server';
import { wajibAkses } from '@/lib/session';
import { MatriksIzin } from './matriks-izin';

export const metadata = { title: 'Manajemen Peran — DAMS' };

export default async function PeranPage() {
  const pengguna = await wajibAkses('/pengaturan/role');

  const [peran, katalog] = await Promise.all([ambilPeran(), ambilKatalogIzin()]);

  return (
    <>
      <Breadcrumb
        jejak={[{ label: 'Pengaturan', href: '/pengaturan' }, { label: 'Manajemen Peran' }]}
      />
      <MatriksIzin
        peran={peran}
        katalog={katalog}
        bolehKelola={pengguna.izin.includes('role.kelola')}
      />
    </>
  );
}
