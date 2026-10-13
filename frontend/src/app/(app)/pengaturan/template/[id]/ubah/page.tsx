import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilDepartemen } from '@/lib/master-data';
import { ambilJenisMaster } from '@/lib/master-server';
import { wajibAkses } from '@/lib/session';
import { ambilOpsiKolom, ambilSatuTemplate } from '@/lib/template-server';
import { PenyusunTemplate } from '../../penyusun-template';

export const metadata = { title: 'Ubah Template — DAMS' };

export default async function UbahTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await wajibAkses('/pengaturan');

  const { id } = await params;
  const templateId = Number(id);

  if (!Number.isInteger(templateId) || templateId <= 0) notFound();

  const [template, departemen, opsi, jenisMaster] = await Promise.all([
    ambilSatuTemplate(templateId),
    ambilDepartemen(),
    ambilOpsiKolom(),
    ambilJenisMaster(),
  ]);

  return (
    <>
      <Breadcrumb
        jejak={[
          { label: 'Pengaturan', href: '/pengaturan' },
          { label: 'Template Laporan', href: '/pengaturan/template' },
          { label: template.nama },
        ]}
      />

      <h1 className="mb-3 text-page-title text-ink">Ubah Template</h1>

      <PenyusunTemplate
        template={template}
        salinanDari={null}
        departemen={departemen}
        opsi={opsi}
        jenisMaster={jenisMaster}
      />
    </>
  );
}
