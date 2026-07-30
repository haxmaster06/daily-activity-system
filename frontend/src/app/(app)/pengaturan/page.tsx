import Link from 'next/link';
import { Building2, Users } from 'lucide-react';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { wajibAkses } from '@/lib/session';

export const metadata = { title: 'Pengaturan — DAMS' };

const MENU = [
  {
    href: '/pengaturan/pengguna',
    judul: 'Manajemen Pengguna',
    keterangan: 'Akun, role, departemen, dan status aktif pengguna.',
    icon: Users,
  },
  {
    href: '/pengaturan/departemen',
    judul: 'Manajemen Departemen',
    keterangan: 'Struktur departemen dan unit kerja organisasi.',
    icon: Building2,
  },
];

export default async function PengaturanPage() {
  await wajibAkses('/pengaturan');

  return (
    <>
      <Breadcrumb jejak={[{ label: 'Pengaturan' }]} />
      <PageHeader judul="Pengaturan" />

      <div className="grid gap-3 sm:grid-cols-2">
        {MENU.map(({ href, judul, keterangan, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-start gap-3 p-4 transition-colors duration-fast hover:border-primary/40 hover:bg-primary-subtle/30"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary-text">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-section-title text-ink">{judul}</span>
              <span className="mt-0.5 block text-body text-ink-muted">{keterangan}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
