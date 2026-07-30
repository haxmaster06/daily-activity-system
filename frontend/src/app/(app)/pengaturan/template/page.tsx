import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilDepartemen } from '@/lib/master-data';
import { wajibAkses } from '@/lib/session';
import { ambilOpsiKolom, ambilTemplate } from '@/lib/template-server';
import { TemplateManager } from './template-manager';

export const metadata = { title: 'Template Laporan — DAMS' };

interface Params {
  cari?: string;
  departemen_id?: string;
  status?: string;
}

export default async function TemplatePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await wajibAkses('/pengaturan');
  const filter = await searchParams;

  // Penyaringan dikerjakan server — jumlah template tumbuh mengikuti jumlah
  // departemen (docs/standar-ui-ux.md §6).
  const query = new URLSearchParams({ dengan_kolom: '1' });
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.departemen_id) query.set('departemen_id', filter.departemen_id);
  if (filter.status) query.set('status', filter.status);

  const [template, departemen, opsi] = await Promise.all([
    ambilTemplate(query),
    ambilDepartemen(),
    ambilOpsiKolom(),
  ]);

  return (
    <>
      <Breadcrumb
        jejak={[{ label: 'Pengaturan', href: '/pengaturan' }, { label: 'Template Laporan' }]}
      />
      <TemplateManager template={template} departemen={departemen} opsi={opsi} />
    </>
  );
}
