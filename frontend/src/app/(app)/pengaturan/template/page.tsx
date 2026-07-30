import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilDepartemen } from '@/lib/master-data';
import { wajibAkses } from '@/lib/session';
import { ambilOpsiKolom, ambilTemplate } from '@/lib/template-server';
import { TemplateManager } from './template-manager';

export const metadata = { title: 'Template Laporan — DAMS' };

export default async function TemplatePage() {
  await wajibAkses('/pengaturan');

  const [template, departemen, opsi] = await Promise.all([
    // Kolom ikut dimuat agar wizard mode ubah langsung terisi.
    ambilTemplate(true),
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
