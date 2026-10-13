import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ambilDepartemen } from '@/lib/master-data';
import { ambilJenisMaster } from '@/lib/master-server';
import { wajibAkses } from '@/lib/session';
import { ambilOpsiKolom, ambilSatuTemplate } from '@/lib/template-server';
import { PenyusunTemplate } from '../penyusun-template';

export const metadata = { title: 'Buat Template — DAMS' };

/**
 * Membuat template, sekaligus menduplikat template yang sudah ada.
 *
 * `?dari=` mengisi seluruh isian dari template sumber lalu berhenti di situ —
 * tidak ada yang tersimpan sampai pengguna menekan Buat Template. Karena itu
 * duplikat tidak memerlukan endpoint tersendiri: kodenya dibangkitkan server
 * dari nama akhir lewat jalur pembuatan biasa.
 */
export default async function BuatTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string }>;
}) {
  await wajibAkses('/pengaturan');

  const { dari } = await searchParams;
  const idSumber = Number(dari);

  const [departemen, opsi, jenisMaster, sumber] = await Promise.all([
    ambilDepartemen(),
    ambilOpsiKolom(),
    ambilJenisMaster(),
    Number.isInteger(idSumber) && idSumber > 0 ? ambilSatuTemplate(idSumber) : null,
  ]);

  return (
    <>
      <Breadcrumb
        jejak={[
          { label: 'Pengaturan', href: '/pengaturan' },
          { label: 'Template Laporan', href: '/pengaturan/template' },
          { label: sumber ? `Duplikat ${sumber.nama}` : 'Buat Template' },
        ]}
      />

      <h1 className="mb-3 text-page-title text-ink">
        {sumber ? 'Duplikat Template' : 'Buat Template'}
      </h1>

      <PenyusunTemplate
        template={null}
        salinanDari={sumber}
        departemen={departemen}
        opsi={opsi}
        jenisMaster={jenisMaster}
      />
    </>
  );
}
