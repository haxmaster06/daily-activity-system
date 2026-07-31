'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FileSpreadsheet, FileText, Printer } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { formatAngka } from '@/lib/format';
import type { Departemen } from '@/lib/master-data';
import type { PratinjauExport } from '@/lib/export-server';
import type { Template } from '@/lib/template';

interface PanelExportProps {
  pratinjau: PratinjauExport;
  departemen: Departemen[];
  template: Template[];
  dapatPilihDepartemen: boolean;
  /** Terisi bila penyaringan ditolak dan halaman memakai rentang bawaan. */
  peringatan?: string | null;
}

/** Radix Select tidak menerima string kosong sebagai nilai item. */
const SEMUA = '__semua__';

/**
 * Halaman export dengan alur preview-first (standarisasi §27).
 *
 * Tidak ada tombol unduh langsung: pengguna menyaring, melihat apa yang akan
 * keluar, baru memilih bentuk berkasnya. Pratinjau dan berkas memakai satu
 * sumber data yang sama di server, sehingga isinya tidak pernah berbeda.
 */
export function PanelExport({
  pratinjau,
  departemen,
  template,
  dapatPilihDepartemen,
  peringatan = null,
}: PanelExportProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mengunduh, setMengunduh] = useState<string | null>(null);

  function ubahFilter(kunci: string, nilai: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (nilai && nilai !== SEMUA) params.set(kunci, nilai);
    else params.delete(kunci);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  /*
   * Unduhan dipasang sebagai tautan, bukan tombol.
   *
   * Peramban yang menangani berkasnya, sehingga isinya tidak pernah ditahan di
   * memori JavaScript. Tautannya tetap berada di DOM selama unduhan berjalan —
   * anchor sekali pakai yang dibuat lalu dilepas membatalkan unduhan yang lama
   * disiapkan server, dan PDF memang perlu beberapa detik.
   */
  function alamatUnduh(bentuk: 'excel' | 'pdf') {
    return `/api/export/${bentuk}?${searchParams.toString()}`;
  }

  function tandaiUnduh(bentuk: 'excel' | 'pdf') {
    setMengunduh(bentuk);
    // Unduhan tidak meninggalkan halaman, sehingga keadaan tautan dipulihkan
    // sendiri setelah jeda singkat.
    setTimeout(() => setMengunduh(null), 2500);
  }

  const adaData = pratinjau.template !== null && pratinjau.jumlah_baris > 0;

  return (
    <>
      {/* Bar penyaringan tidak ikut tercetak. */}
      <section className="card mb-3 p-3 print:hidden">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DatePicker
            label="Dari Tanggal"
            nilai={searchParams.get('dari') ?? pratinjau.rentang.dari}
            onUbah={(nilai) => ubahFilter('dari', nilai)}
          />
          <DatePicker
            label="Sampai Tanggal"
            nilai={searchParams.get('sampai') ?? pratinjau.rentang.sampai}
            onUbah={(nilai) => ubahFilter('sampai', nilai)}
          />

          <Select
            id="template-export"
            label="Template"
            nilai={searchParams.get('template_id') ?? SEMUA}
            opsi={[
              { nilai: SEMUA, label: 'Otomatis (paling banyak dipakai)' },
              ...template.map((t) => ({ nilai: String(t.id), label: t.nama })),
            ]}
            onUbah={(nilai) => ubahFilter('template_id', nilai)}
            bantuan="Satu berkas memuat satu bentuk tabel."
          />

          <Select
            id="status-export"
            label="Status Laporan"
            nilai={searchParams.get('status') ?? SEMUA}
            opsi={[
              { nilai: SEMUA, label: 'Semua status' },
              { nilai: 'draf', label: 'Draf' },
              { nilai: 'dikirim', label: 'Dikirim' },
              { nilai: 'ditinjau', label: 'Ditinjau' },
            ]}
            onUbah={(nilai) => ubahFilter('status', nilai)}
          />

          {dapatPilihDepartemen && (
            <Select
              id="departemen-export"
              label="Departemen"
              nilai={searchParams.get('departemen_id') ?? SEMUA}
              opsi={[
                { nilai: SEMUA, label: 'Semua departemen' },
                ...departemen.map((d) => ({ nilai: String(d.id), label: d.nama })),
              ]}
              onUbah={(nilai) => ubahFilter('departemen_id', nilai)}
            />
          )}
        </div>
      </section>

      {peringatan && (
        <Alert
          jenis="galat"
          className="mb-3 print:hidden"
          pesan={`${peringatan} Ditampilkan memakai rentang bawaan.`}
        />
      )}

      {pratinjau.terpotong && (
        <Alert
          jenis="galat"
          className="mb-3 print:hidden"
          pesan={`Data melebihi batas per berkas. Yang ditampilkan dan diexport hanya ${formatAngka(
            pratinjau.baris.length,
          )} baris pertama dari ${formatAngka(
            pratinjau.jumlah_baris,
          )}. Persempit rentang tanggal untuk memperoleh seluruhnya.`}
        />
      )}

      {/* Tindakan export. Muncul setelah pratinjau, bukan sebelum. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-body-lg text-ink-muted">
          {adaData ? (
            <>
              <span className="font-semibold text-ink">
                {formatAngka(pratinjau.jumlah_baris)} baris
              </span>{' '}
              dari {formatAngka(pratinjau.jumlah_laporan)} laporan,
              periode {pratinjau.rentang.label}
            </>
          ) : (
            'Tidak ada data pada penyaringan ini.'
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={adaData ? alamatUnduh('excel') : undefined}
            download=""
            aria-disabled={!adaData}
            onClick={(event) => {
              if (!adaData) event.preventDefault();
              else tandaiUnduh('excel');
            }}
            className="btn-ghost btn-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
          >
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            {mengunduh === 'excel' ? 'Menyiapkan...' : 'Unduh Excel'}
          </a>

          <a
            href={adaData ? alamatUnduh('pdf') : undefined}
            download=""
            aria-disabled={!adaData}
            onClick={(event) => {
              if (!adaData) event.preventDefault();
              else tandaiUnduh('pdf');
            }}
            className="btn-ghost btn-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
          >
            <FileText aria-hidden="true" className="size-4" />
            {mengunduh === 'pdf' ? 'Menyiapkan...' : 'Unduh PDF'}
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!adaData}
            className="btn-primary btn-sm"
          >
            <Printer aria-hidden="true" className="size-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* Judul yang hanya muncul di hasil cetak. */}
      <div className="hidden print:mb-3 print:block">
        <p className="font-heading text-page-title text-ink">
          Laporan Harian — {pratinjau.template?.nama ?? '—'}
        </p>
        <p className="text-body text-ink-muted">Periode {pratinjau.rentang.label}</p>
      </div>

      <div className="card overflow-hidden print:border-0 print:shadow-none">
        <div className="max-h-[32rem] overflow-auto print:max-h-none print:overflow-visible">
          <table className="w-full min-w-max border-collapse text-table">
            <thead className="sticky top-0 z-10 bg-surface-muted print:static">
              <tr className="border-b border-line">
                {pratinjau.kolom.map((kolom) => (
                  <th
                    key={kolom.kunci}
                    scope="col"
                    className="whitespace-nowrap px-2.5 py-2 text-left text-caption font-semibold text-ink-muted"
                  >
                    {kolom.label}
                    {kolom.satuan && (
                      <span className="ml-1 font-normal text-ink-soft">({kolom.satuan})</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-line bg-surface">
              {pratinjau.baris.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, pratinjau.kolom.length)}
                    className="px-3 py-10 text-center text-body-lg text-ink-soft"
                  >
                    Tidak ada data pada penyaringan ini. Coba perlebar rentang tanggal.
                  </td>
                </tr>
              ) : (
                pratinjau.baris.map((baris, index) => (
                  <tr key={index} className="hover:bg-surface-muted/60">
                    {pratinjau.kolom.map((kolom) => (
                      <td key={kolom.kunci} className="px-2.5 py-1.5 align-top text-ink">
                        {baris[kolom.kunci] === null || baris[kolom.kunci] === ''
                          ? '—'
                          : String(baris[kolom.kunci])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
