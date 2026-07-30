import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

/**
 * Tombol DAMS — pola shadcn (Radix Slot + CVA), token dan skala dari
 * standarisasi §7: tinggi 32–40px, teks 13–14px, radius 6px.
 *
 * Gerakan sengaja secukupnya: warna berpindah halus dan skala turun tipis saat
 * ditekan. Tidak ada bounce atau efek dekoratif (standar interaksi §4).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium ' +
    'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-keluar ' +
    'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-text',
        sekunder: 'border border-line bg-surface text-ink hover:bg-surface-muted',
        halus: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        bahaya: 'bg-danger text-white hover:bg-danger-text',
        tautan: 'text-primary-text underline-offset-4 hover:underline',
      },
      ukuran: {
        sm: 'h-8 px-2.5 text-body',
        md: 'h-9 px-3 text-body-lg',
        lg: 'h-10 px-4 text-body-lg',
        ikon: 'size-8 p-0',
      },
    },
    defaultVariants: { variant: 'primary', ukuran: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Merender elemen anak sebagai tombol — dipakai untuk `Link`. */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  ukuran,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp className={cn(buttonVariants({ variant, ukuran }), className)} {...props} />
  );
}

export { buttonVariants };
