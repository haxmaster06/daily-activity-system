import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Pemberitahuan hasil tindakan. Pesan menjelaskan akibat bagi pengguna,
 * bukan mekanisme teknisnya (standar §25.1).
 */
export function Alert({
  jenis,
  pesan,
  className,
}: {
  jenis: 'galat' | 'berhasil';
  pesan: string;
  className?: string;
}) {
  const Icon = jenis === 'galat' ? AlertCircle : CheckCircle2;

  return (
    <div
      role={jenis === 'galat' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-input px-3 py-2 text-body',
        jenis === 'galat'
          ? 'border border-danger/25 bg-danger-subtle text-danger-text'
          : 'border border-secondary/25 bg-secondary-subtle text-secondary-text',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{pesan}</span>
    </div>
  );
}
