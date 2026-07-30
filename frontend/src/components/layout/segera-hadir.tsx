import { Breadcrumb, type JejakBreadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';

interface SegeraHadirProps {
  judul: string;
  jejak: JejakBreadcrumb[];
  /** Kalimat singkat tentang apa yang akan tersedia di halaman ini. */
  keterangan: string;
}

/**
 * Halaman yang menunya sudah aktif tetapi isinya dikerjakan pada tahap
 * berikutnya. Lebih baik daripada menu yang mengarah ke halaman 404.
 *
 * Hapus pemakaian komponen ini begitu halaman sebenarnya selesai.
 */
export function SegeraHadir({ judul, jejak, keterangan }: SegeraHadirProps) {
  return (
    <>
      <Breadcrumb jejak={jejak} />
      <PageHeader judul={judul} />
      <div className="card p-4">
        <p className="text-body-lg text-ink-muted">{keterangan}</p>
      </div>
    </>
  );
}
