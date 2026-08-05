'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatTanggalRingkas } from '@/lib/format';
import { LABEL_PRIORITAS, RAGAM_PRIORITAS, type StatusTugas, type Tugas } from '@/lib/tugas';

export const AWALAN_KARTU = 'kartu:';

interface IsiKartuProps {
  tugas: Tugas;
  /** Kendali kanan atas; tidak ada saat kartu sedang melayang. */
  kendali?: React.ReactNode;
  /** Pegangan seret; tidak ada saat kartu sedang melayang. */
  pegangan?: React.ReactNode;
  className?: string;
}

/**
 * Tampilan satu kartu, tanpa perilaku seret.
 *
 * Dipakai dua kali: sebagai kartu di dalam kolom, dan sebagai bayangan yang
 * mengikuti kursor saat diseret. Menyalin tampilannya dua kali akan membuat
 * bayangannya lambat laun berbeda dari kartu aslinya.
 */
export function IsiKartu({ tugas, kendali, pegangan, className }: IsiKartuProps) {
  return (
    <article
      className={cn(
        'rounded-card border border-line bg-surface p-2.5 shadow-kartu',
        className,
      )}
    >
      <div className="flex items-start gap-1.5">
        {pegangan}

        <h3 className="min-w-0 flex-1 text-body-lg font-medium text-ink">{tugas.judul}</h3>

        {kendali}
      </div>

      {tugas.keterangan && (
        <p className="mt-1 text-body text-ink-muted">{tugas.keterangan}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-soft">
        {tugas.prioritas && (
          <span
            className={cn(
              'inline-flex items-center rounded-control px-1.5 py-0.5 font-medium',
              RAGAM_PRIORITAS[tugas.prioritas],
            )}
          >
            Prioritas {LABEL_PRIORITAS[tugas.prioritas]}
          </span>
        )}

        {tugas.penanggung_jawab && (
          <span className="inline-flex items-center gap-1">
            <UserRound aria-hidden="true" className="size-3.5" />
            {tugas.penanggung_jawab.nama}
          </span>
        )}

        {tugas.target_selesai && (
          <span
            className={cn(
              'inline-flex items-center gap-1',
              tugas.lewat_target && 'font-medium text-danger-text',
            )}
          >
            {tugas.lewat_target ? (
              <AlertTriangle aria-hidden="true" className="size-3.5" />
            ) : (
              <CalendarDays aria-hidden="true" className="size-3.5" />
            )}
            {/* Penanda lewat target tidak pernah hanya berupa warna (standar §9). */}
            {tugas.lewat_target ? 'Lewat target ' : 'Target '}
            {formatTanggalRingkas(tugas.target_selesai)}
          </span>
        )}

        {(tugas.jumlah_laporan ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText aria-hidden="true" className="size-3.5" />
            {tugas.jumlah_laporan} laporan tertaut
          </span>
        )}
      </div>
    </article>
  );
}

interface KartuTugasProps {
  tugas: Tugas;
  /** Kolom selain kolomnya sendiri, untuk perpindahan lewat menu. */
  kolomLain: { status: StatusTugas; label: string }[];
  bolehKelola: boolean;
  onPindah: (status: StatusTugas) => void;
  onUbah: () => void;
  onHapus: () => void;
}

/**
 * Kartu yang dapat diseret, sekaligus dapat dipindahkan tanpa menyeret.
 *
 * **Menu "Pindahkan ke" bukan pelengkap.** Menyeret dengan papan ketik selalu
 * menuntut pengguna menahan model posisi di kepalanya — ia tidak melihat kursor
 * dan harus menebak sudah sampai kolom mana. Menu menyebut kolom tujuannya
 * dengan kata, sekali tekan, dan bekerja sama baiknya di layar sentuh.
 * Menyeretnya tetap ada untuk yang memakai tetikus.
 */
export function KartuTugas({
  tugas,
  kolomLain,
  bolehKelola,
  onPindah,
  onUbah,
  onHapus,
}: KartuTugasProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `${AWALAN_KARTU}${tugas.id}`, disabled: !bolehKelola });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      /*
       * Kartu aslinya disembunyikan selagi diseret, bukan dihapus dari DOM:
       * menghapusnya membuat tinggi kolom melompat dan kartu di bawahnya
       * berpindah tempat di tengah gerakan.
       */
      className={cn('list-none', isDragging && 'opacity-0')}
    >
      <IsiKartu
        tugas={tugas}
        pegangan={
          bolehKelola ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Seret kartu ${tugas.judul}`}
              className="mt-0.5 grid size-5 shrink-0 cursor-grab place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:cursor-grabbing"
            >
              <GripVertical aria-hidden="true" className="size-3.5" />
            </button>
          ) : undefined
        }
        kendali={
          bolehKelola ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label={`Kelola kartu ${tugas.judul}`}
                className="grid size-5 shrink-0 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:bg-surface-muted hover:text-ink"
              >
                <MoreVertical aria-hidden="true" className="size-3.5" />
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="z-40 min-w-48 animate-masuk-halus rounded-card border border-line bg-surface p-1 shadow-modal"
                >
                  {kolomLain.map((kolom) => (
                    <DropdownMenu.Item
                      key={kolom.status}
                      onSelect={() => onPindah(kolom.status)}
                      className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-ink-muted outline-none data-[highlighted]:bg-surface-muted data-[highlighted]:text-ink"
                    >
                      Pindahkan ke {kolom.label}
                    </DropdownMenu.Item>
                  ))}

                  <DropdownMenu.Separator className="my-1 h-px bg-line" />

                  <DropdownMenu.Item
                    onSelect={onUbah}
                    className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-ink-muted outline-none data-[highlighted]:bg-surface-muted data-[highlighted]:text-ink"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    Ubah Tugas
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={onHapus}
                    className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-lg text-danger-text outline-none data-[highlighted]:bg-danger-subtle"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Hapus Tugas
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : undefined
        }
      />
    </li>
  );
}
