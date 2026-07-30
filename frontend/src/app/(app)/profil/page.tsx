
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { Lanyard } from '@/components/ui/lanyard';
import { panggilApi } from '@/lib/api';
import { formatTanggal, formatTanggalWaktu } from '@/lib/format';
import type { Pengguna } from '@/lib/master-data';
import { FormKataSandi, FormNama } from './profil-form';

export const metadata = { title: 'Profil Saya — DAMS' };

interface DataProfil {
  pengguna: Pengguna;
  bergabung_pada: string | null;
  masuk_terakhir: string | null;
}

export default async function ProfilPage() {
  const { data } = await panggilApi<DataProfil>('/profil');
  const { pengguna } = data;

  const informasi = [
    { label: 'Email', nilai: pengguna.email },
    { label: 'Departemen', nilai: pengguna.departemen.nama ?? '—' },
    { label: 'Role', nilai: pengguna.role.nama ?? '—' },
    { label: 'Bergabung Sejak', nilai: formatTanggal(data.bergabung_pada) },
    { label: 'Masuk Terakhir', nilai: formatTanggalWaktu(data.masuk_terakhir) },
  ];

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Profil Saya' }]} />
      <PageHeader judul="Profil Saya" />

      <div className="space-y-3">
        <section className="card p-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/*
              Kartu identitas menggantung. Belum ada unggah foto pengguna,
              sehingga kartunya memakai tanda DAMS sebagai tampilan bawaan.
            */}
            <Lanyard
              nama={pengguna.nama}
              keterangan={`${pengguna.role.nama} · ${pengguna.departemen.nama ?? '—'}`}
              className="shrink-0"
            />

            <dl className="grid w-full gap-x-6 gap-y-2 sm:mt-6 sm:grid-cols-2">
              {informasi.map((item) => (
                <div key={item.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-caption text-ink-soft">{item.label}</dt>
                  <dd className="text-body-lg text-ink">{item.nilai}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-3 text-caption text-ink-soft">
            Departemen dan role hanya dapat diubah administrator.
          </p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-heading text-section-title text-ink">Informasi Akun</h2>
          <FormNama namaAwal={pengguna.nama} />
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-heading text-section-title text-ink">Ubah Kata Sandi</h2>
          <FormKataSandi />
        </section>
      </div>
    </>
  );
}
