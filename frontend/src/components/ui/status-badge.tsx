import { cn } from '@/lib/cn';
import { tampilanStatus } from '@/lib/status';

interface StatusBadgeProps {
  status: string;
  /**
   * Mengganti kata pada badge tanpa mengubah warnanya.
   *
   * Dipakai saat sebuah keadaan memakai ramp warna yang sama tetapi punya
   * istilah sendiri — status laporan Draf, Dikirim, dan Ditinjau memakai warna
   * yang sama dengan Belum Mulai, Dalam Proses, dan Selesai.
   */
  label?: string;
  className?: string;
}

/** Badge status konsisten di seluruh aplikasi: latar tonal + ikon + label teks. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { label: bawaan, icon: Icon, className: warna } = tampilanStatus(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 text-caption font-medium',
        warna,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {label ?? bawaan}
    </span>
  );
}
