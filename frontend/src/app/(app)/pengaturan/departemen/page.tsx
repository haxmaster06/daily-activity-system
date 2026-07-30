import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilDepartemen } from '@/lib/master-data';
import { wajibAkses } from '@/lib/session';
import { DepartmentGrid } from './department-grid';

export const metadata = { title: 'Manajemen Departemen — DAMS' };

export default async function ManajemenDepartemenPage() {
  await wajibAkses('/pengaturan');

  const departemen = await ambilDepartemen();

  return (
    <>
      <Breadcrumb
        jejak={[
          { label: 'Pengaturan', href: '/pengaturan' },
          { label: 'Manajemen Departemen' },
        ]}
      />
      <DepartmentGrid departemen={departemen} />
    </>
  );
}
