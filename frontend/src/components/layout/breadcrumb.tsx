import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface JejakBreadcrumb {
  label: string;
  /** Tanpa href berarti halaman aktif — tingkat terakhir bukan tautan (standar §2.4). */
  href?: string;
}

interface BreadcrumbProps {
  /** Tingkat setelah Dashboard. Dashboard ditambahkan otomatis di depan. */
  jejak: JejakBreadcrumb[];
}

/**
 * Breadcrumb bersama untuk seluruh halaman fitur (standar §2.4).
 * Jangan membuat ulang komponen ini di tiap halaman.
 */
export function Breadcrumb({ jejak }: BreadcrumbProps) {
  const semua: JejakBreadcrumb[] = [{ label: 'Dashboard', href: '/dashboard' }, ...jejak];

  return (
    <nav aria-label="Remah roti" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-caption text-ink-soft">
        {semua.map((item, index) => {
          const terakhir = index === semua.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-ink-soft" />
              )}
              {item.href && !terakhir ? (
                <Link
                  href={item.href}
                  className="rounded-control text-primary-text hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink-muted">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
