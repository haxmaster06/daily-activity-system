import { PageHeader } from '@/components/layout/page-header';
import { formatTanggalLengkap } from '@/lib/format';

export const metadata = { title: 'Dashboard — DAMS' };

/**
 * Placeholder M0. Isi sebenarnya (kartu statistik, grafik departemen, timeline,
 * dan FAB "Buat Laporan Baru") dikerjakan pada M5.
 */
export default function DashboardPage() {
  return (
    <>
      <PageHeader judul="Dashboard" />
      <div className="card p-4">
        <p className="text-body-lg text-ink-muted">{formatTanggalLengkap(new Date())}</p>
        <p className="mt-2 text-body text-ink-soft">
          Kartu statistik, grafik departemen, dan timeline aktivitas menyusul pada tahap
          berikutnya.
        </p>
      </div>
    </>
  );
}
