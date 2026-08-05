import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import type { OpsiCombobox } from '@/components/ui/combobox';
import { panggilApi } from '@/lib/api';
import { formatTanggal } from '@/lib/format';
import { JANGKAUAN_KORPORAT, bolehMenyaringDepartemen } from '@/lib/izin';
import { ambilDepartemen, type Pengguna } from '@/lib/master-data';
import { wajibAkses } from '@/lib/session';
import { ambilLaporanTertaut, ambilPapan } from '@/lib/tugas-server';
import { PapanKanban } from './papan-kanban';

export const metadata = { title: 'Progres Harian — DAMS' };

interface Params {
  cari?: string;
  departemen_id?: string;
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const pengguna = await wajibAkses('/progress');
  const filter = await searchParams;

  const query = new URLSearchParams();
  if (filter.cari) query.set('cari', filter.cari);
  if (filter.departemen_id) query.set('departemen_id', filter.departemen_id);

  const bolehKelola = pengguna.izin.includes('tugas.kelola');

  const [kolom, departemen, laporan] = await Promise.all([
    ambilPapan(query),
    ambilDepartemen(),
    bolehKelola ? ambilLaporanTertaut() : Promise.resolve([]),
  ]);

  /*
   * Departemen yang boleh dipilih dibatasi jangkauan pengguna. Backend menolak
   * departemen di luar jangkauan, tetapi menawarkannya lebih dulu lalu menolak
   * setelah pengguna mengisi seluruh kartu adalah cara yang buruk untuk
   * menyampaikan aturan yang sudah diketahui sejak awal.
   */
  const departemenTerjangkau =
    pengguna.jangkauan.level === JANGKAUAN_KORPORAT
      ? departemen
      : departemen.filter(
          (satu) =>
            pengguna.jangkauan.departemenId.includes(satu.id) ||
            satu.id === pengguna.departemenId,
        );

  /*
   * Daftar orang hanya diambil bila pengguna memang boleh membacanya. Staf
   * tidak memegang `pengguna.lihat`, dan memanggilnya tetap akan berakhir 403 —
   * yang tampil di layarnya bukan pemilih kosong, melainkan halaman galat.
   * Baginya, satu-satunya penanggung jawab yang masuk akal adalah dirinya.
   */
  const pilihanPengguna: OpsiCombobox[] = pengguna.izin.includes('pengguna.lihat')
    ? await ambilRekan(pengguna.departemenId)
    : [{ id: pengguna.id, label: pengguna.nama, keterangan: pengguna.departemen }];

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Progres Harian' }]} />
      <PageHeader
        judul="Progres Harian"
        keterangan="Kartu berpindah kolom seiring pekerjaannya berjalan."
      />

      <FilterBar
        placeholderCari="Cari judul tugas..."
        pilihan={
          bolehMenyaringDepartemen(pengguna.jangkauan)
            ? [
                {
                  kunci: 'departemen_id',
                  label: 'Departemen',
                  opsi: departemenTerjangkau.map((satu) => ({
                    nilai: String(satu.id),
                    label: satu.nama,
                  })),
                },
              ]
            : []
        }
      />

      <div className="mt-3">
        <PapanKanban
          kolomAwal={kolom}
          bolehKelola={bolehKelola}
          departemen={departemenTerjangkau.map((satu) => ({
            nilai: String(satu.id),
            label: satu.nama,
          }))}
          pengguna={pilihanPengguna}
          laporan={laporan.map((satu) => ({
            id: satu.id,
            label: formatTanggal(satu.tanggal),
            keterangan: satu.label_status,
          }))}
          departemenBawaan={pengguna.departemenId}
        />
      </div>
    </>
  );
}

/** Rekan sedepartemen yang dapat ditunjuk sebagai penanggung jawab. */
async function ambilRekan(departemenId: number | null): Promise<OpsiCombobox[]> {
  const query = new URLSearchParams({ status: 'aktif', per_halaman: '100' });
  if (departemenId !== null) query.set('departemen_id', String(departemenId));

  const { data } = await panggilApi<Pengguna[]>(`/pengguna?${query.toString()}`);

  return data.map((satu) => ({
    id: satu.id,
    label: satu.nama,
    keterangan: satu.departemen.nama ?? undefined,
  }));
}
