import { UserRound } from 'lucide-react';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
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
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-text">
              <UserRound aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-section-title text-ink">{pengguna.nama}</p>
              <p className="text-body text-ink-muted">
                {pengguna.role.nama} — {pengguna.departemen.nama ?? '—'}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-3 sm:grid-cols-2">
            {informasi.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-ink-soft">{item.label}</dt>
                <dd className="text-body-lg text-ink">{item.nilai}</dd>
              </div>
            ))}
          </dl>

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
