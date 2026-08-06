import { redirect } from 'next/navigation';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import {
  ambilIsiMaster,
  ambilJenisMaster,
  ambilPilihanInduk,
  type JenisMaster,
} from '@/lib/master-server';
import { ambilDepartemen } from '@/lib/master-data';
import { denganPenyaringanAman } from '@/lib/penyaringan';
import { penggunaSaatIni, wajibAkses } from '@/lib/session';
import { PanelMaster } from './panel-master';

export const metadata = { title: 'Data Master — DAMS' };

interface Params {
  jenis?: string;
  cari?: string;
  halaman?: string;
}

export default async function MasterDataPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await wajibAkses('/pengaturan/master-data');

  const filter = await searchParams;
  const jenis = await ambilJenisMaster();

  /*
   * Daftar departemen hanya diambil untuk yang berwenang menetapkan pengelola
   * — jangkauan korporat. Bagi yang lain bidangnya tidak tampil sama sekali,
   * dan mengambil datanya pun tidak ada gunanya.
   */
  const pengguna = await penggunaSaatIni();
  const bolehAturPengelola = pengguna?.jangkauan.level === 3;
  const pilihanDepartemen = bolehAturPengelola
    ? (await ambilDepartemen()).map((satu) => ({ id: satu.id, nama: satu.nama }))
    : [];

  if (jenis.length === 0) {
    return (
      <>
        <Breadcrumb
          jejak={[{ label: 'Pengaturan', href: '/pengaturan' }, { label: 'Data Master' }]}
        />
        <PageHeader judul="Data Master" />
        <PanelMaster bolehKelolaJenis={bolehAturPengelola} pilihanDepartemen={pilihanDepartemen} jenis={[]} terpilih={null} isi={[]} meta={null} pilihanInduk={[]} />
      </>
    );
  }

  /*
   * Daftar yang sedang dibuka disimpan di URL supaya dapat dibagikan dan
   * bertahan saat halaman dimuat ulang (standar §6.2). Slug yang tidak dikenal
   * diarahkan ke daftar pertama alih-alih menampilkan halaman kosong yang
   * membingungkan.
   */
  const terpilih: JenisMaster =
    jenis.find((satu) => satu.slug === filter.jenis) ?? jenis[0];

  if (filter.jenis !== undefined && filter.jenis !== terpilih.slug) {
    redirect(`/pengaturan/master-data?jenis=${terpilih.slug}`);
  }

  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.halaman) query.set('page', filter.halaman);

  const halaman = await denganPenyaringanAman(query, (q) => ambilIsiMaster(terpilih.slug, q));

  // Pemilih induk hanya berguna bila jenisnya memang berinduk.
  const indukSlug = terpilih.induk?.slug;
  const pilihanInduk = indukSlug ? await ambilPilihanInduk(indukSlug) : [];

  return (
    <>
      <Breadcrumb
        jejak={[{ label: 'Pengaturan', href: '/pengaturan' }, { label: 'Data Master' }]}
      />
      <PageHeader judul="Data Master" />

      <PanelMaster bolehKelolaJenis={bolehAturPengelola} pilihanDepartemen={pilihanDepartemen}
        jenis={jenis}
        terpilih={terpilih}
        isi={halaman.data.data}
        meta={halaman.data.meta}
        pilihanInduk={pilihanInduk}
        peringatan={halaman.peringatan}
      />
    </>
  );
}
