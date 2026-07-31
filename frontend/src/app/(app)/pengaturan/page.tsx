import Link from 'next/link';
import { Building2, Layers, ShieldCheck, Users } from 'lucide-react';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { BorderGlowCard } from '@/components/ui/border-glow-card';
import { wajibAkses } from '@/lib/session';

export const metadata = { title: 'Pengaturan — DAMS' };

/** Tiap kartu menyebut izin yang dibutuhkan halamannya. */
const MENU = [
  {
    href: '/pengaturan/pengguna',
    judul: 'Manajemen Pengguna',
    keterangan: 'Akun, peran, departemen, dan status aktif pengguna.',
    icon: Users,
    izin: 'pengguna.lihat',
  },
  {
    href: '/pengaturan/role',
    judul: 'Manajemen Peran',
    keterangan: 'Peran beserta hak akses yang melekat padanya.',
    icon: ShieldCheck,
    izin: 'role.lihat',
  },
  {
    href: '/pengaturan/departemen',
    judul: 'Manajemen Departemen',
    keterangan: 'Struktur departemen dan unit kerja organisasi.',
    icon: Building2,
    izin: 'departemen.kelola',
  },
  {
    href: '/pengaturan/template',
    judul: 'Template Laporan',
    keterangan: 'Susunan kolom laporan harian tiap departemen.',
    icon: Layers,
    izin: 'template.kelola',
  },
];

export default async function PengaturanPage() {
  const pengguna = await wajibAkses('/pengaturan');

  /*
   * Disaring per izin. Satu izin pengelolaan sudah cukup untuk membuka halaman
   * ini, sehingga menampilkan seluruh kartu berarti menawarkan halaman yang
   * akan menolak pengguna begitu diklik.
   */
  const menu = MENU.filter((item) => pengguna.izin.includes(item.izin));

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Pengaturan' }]} />
      <PageHeader judul="Pengaturan" />

      <div className="grid gap-3 sm:grid-cols-2">
        {menu.map(({ href, judul, keterangan, icon: Icon }) => (
          // Border Glow hanya pada kartu yang memang dapat diklik
          // (standar interaksi §5.3).
          <BorderGlowCard key={href} asChild>
            <Link href={href} className="flex items-start gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary-text">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-section-title text-ink">{judul}</span>
                <span className="mt-0.5 block text-body text-ink-muted">{keterangan}</span>
              </span>
            </Link>
          </BorderGlowCard>
        ))}
      </div>
    </>
  );
}
