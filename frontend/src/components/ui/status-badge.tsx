import { cn } from '@/lib/cn';
import { tampilanStatus } from '@/lib/status';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/** Badge status konsisten di seluruh aplikasi: latar tonal + ikon + label teks. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, icon: Icon, className: warna } = tampilanStatus(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 text-caption font-medium',
        warna,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {label}
    </span>
  );
}
