'use client';

import { CalendarDate, parseDate } from '@internationalized/date';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
  Text,
} from 'react-aria-components';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';

interface DatePickerProps {
  label: string;
  /** Format ISO `YYYY-MM-DD`, atau kosong. */
  nilai: string | null;
  onUbah: (nilai: string | null) => void;
  galat?: string;
  bantuan?: string;
  wajib?: boolean;
  nonaktif?: boolean;
  /** Batas tanggal, format ISO. */
  minimal?: string;
  maksimal?: string;
}

/**
 * Pemilih tanggal (React Aria DatePicker).
 *
 * Data tanggal tidak pernah diketik bebas (standar interaksi §1.1). Isiannya
 * tersegmen — hari, bulan, tahun terpisah — sehingga dapat diketik cepat tanpa
 * tebak-tebakan format, dan tetap bisa dipilih lewat kalender.
 *
 * Nama bulan dan hari mengikuti locale `id-ID` yang dipasang `UiProvider`.
 *
 * Nilai yang dipertukarkan tetap ISO `YYYY-MM-DD` karena itu format payload
 * API (CLAUDE.md, pengecualian format tanggal).
 */
export function DatePicker({
  label,
  nilai,
  onUbah,
  galat,
  bantuan,
  wajib = false,
  nonaktif = false,
  minimal,
  maksimal,
}: DatePickerProps) {
  return (
    <AriaDatePicker
      value={keCalendarDate(nilai)}
      onChange={(tanggal) => onUbah(tanggal ? tanggal.toString() : null)}
      isDisabled={nonaktif}
      isRequired={wajib}
      isInvalid={Boolean(galat)}
      minValue={keCalendarDate(minimal ?? null) ?? undefined}
      maxValue={keCalendarDate(maksimal ?? null) ?? undefined}
      className="flex flex-col"
    >
      <Label className="field-label">
        {label}
        {wajib && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </Label>

      <Group
        className={cn(
          'flex h-input w-full items-center rounded-input border border-line bg-surface pl-2.5',
          'transition-colors duration-fast',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
          galat && 'border-danger focus-within:border-danger focus-within:ring-danger/30',
        )}
      >
        <DateInput className="flex flex-1 items-center gap-0.5 text-body-lg text-ink">
          {(segmen) => (
            <DateSegment
              segment={segmen}
              className={cn(
                'rounded-sm px-0.5 tabular-nums outline-none',
                'data-[focused]:bg-primary data-[focused]:text-white',
                'data-[placeholder]:text-ink-soft',
              )}
            />
          )}
        </DateInput>

        <Button
          aria-label="Buka kalender"
          className="grid h-full w-8 place-items-center text-ink-soft transition-colors duration-fast hover:text-ink"
        >
          <CalendarDays aria-hidden="true" className="size-4" />
        </Button>
      </Group>

      {bantuan && !galat && (
        <Text slot="description" className="mt-1 text-caption text-ink-soft">
          {bantuan}
        </Text>
      )}

      <FieldError className="field-error">{galat}</FieldError>

      <Popover
        className={cn(
          'rounded-card border border-line bg-surface p-3 shadow-modal',
          'data-[entering]:animate-popover-masuk',
        )}
      >
        <Dialog className="outline-none">
          <Calendar>
            <header className="mb-2 flex items-center justify-between gap-2">
              <Button
                slot="previous"
                aria-label="Bulan sebelumnya"
                className="grid size-7 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>

              <Heading className="text-body-lg font-semibold text-ink" />

              <Button
                slot="next"
                aria-label="Bulan berikutnya"
                className="grid size-7 place-items-center rounded-control text-ink-muted transition-colors duration-fast hover:bg-surface-muted"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </header>

            <CalendarGrid className="border-separate border-spacing-0.5">
              <CalendarGridHeader>
                {(hari) => (
                  <CalendarHeaderCell className="pb-1 text-caption font-semibold text-ink-soft">
                    {hari}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>

              <CalendarGridBody>
                {(tanggal) => (
                  <CalendarCell
                    date={tanggal}
                    className={cn(
                      'grid size-8 cursor-pointer place-items-center rounded-control text-body text-ink outline-none',
                      'transition-colors duration-fast',
                      'data-[hovered]:bg-surface-muted',
                      'data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary/40',
                      'data-[selected]:bg-primary data-[selected]:font-semibold data-[selected]:text-white',
                      'data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-soft/50',
                      'data-[outside-month]:text-ink-soft/60',
                    )}
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}

/**
 * Mengubah ISO `YYYY-MM-DD` menjadi CalendarDate.
 *
 * Nilai yang tidak dapat dibaca dianggap kosong, bukan melempar galat —
 * data lama yang formatnya menyimpang tidak boleh membuat halaman gagal
 * dirender.
 */
function keCalendarDate(iso: string | null): CalendarDate | null {
  if (!iso) return null;

  try {
    return parseDate(iso.slice(0, 10));
  } catch {
    return null;
  }
}
