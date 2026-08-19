'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Factory } from 'lucide-react';

import { ButtonGroup } from '@/components/ui/button-group';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import type { DataProduksi, OrderProduksi, StasiunProduksi, TrenProduksi } from '@/lib/analitik';
import { KartuAngka } from '../kartu-kpi';
import { GrafikTrenProduksi } from '../grafik';
import { PanelGrafik } from '../panel-grafik';

const PERIODE = [
  { nilai: 'harian', label: 'Harian' },
  { nilai: 'mingguan', label: 'Mingguan' },
  { nilai: 'bulanan', label: 'Bulanan' },
  { nilai: 'tahunan', label: 'Tahunan' },
];

/**
 * Proses Produksi — ringkas untuk keputusan, bukan papan penyaring.
 *
 * Satu kontrol: periode. Angkanya sudah dijumlahkan per stasiun di server dari
 * struktur template, jadi tak ada metrik yang perlu dipilih satu per satu.
 */
export function PapanProsesProduksi({ data }: { data: DataProduksi }) {
  const router = useRouter();
  const params = useSearchParams();

  function pilihPeriode(nilai: string) {
    const query = new URLSearchParams(params.toString());
    query.set('periode', nilai);
    router.push(`?${query.toString()}`);
  }

  function pilihPelapor(nilai: string) {
    const query = new URLSearchParams(params.toString());
    if (nilai) query.set('pengguna', nilai);
    else query.delete('pengguna');
    router.push(`?${query.toString()}`);
  }

  const kosong = data.kpi.length === 0 && data.stasiun.length === 0 && data.order === null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-section-title text-ink">
            <Factory aria-hidden="true" className="size-4 text-ink-soft" />
            Proses Produksi
          </h2>
          <p className="text-caption text-ink-soft">{data.periode_label}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {data.pelapor.length > 1 && (
            <Select
              id="pelapor-produksi"
              label="Pelapor"
              ukuran="sm"
              placeholder="Semua pelapor"
              nilai={data.pengguna_id ? String(data.pengguna_id) : ''}
              opsi={[
                { nilai: '', label: 'Semua pelapor' },
                ...data.pelapor.map((satu) => ({ nilai: String(satu.id), label: satu.nama })),
              ]}
              onUbah={pilihPelapor}
              className="min-w-44"
            />
          )}
          <ButtonGroup label="Periode" opsi={PERIODE} nilai={data.periode} onUbah={pilihPeriode} />
        </div>
      </div>

      {kosong ? (
        <div className="rounded-card border border-line bg-surface p-6 text-center">
          <p className="text-body-lg text-ink-muted">
            Belum ada data produksi pada periode ini.
          </p>
          <p className="mt-1 text-body text-ink-soft">
            Angkanya terisi sendiri begitu ada laporan Proses Produksi masuk.
          </p>
        </div>
      ) : (
        <>
          {data.kpi.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.kpi.map((kartu) => (
                <KartuAngka key={kartu.kunci} kartu={kartu} />
              ))}
            </div>
          )}

          {data.stasiun.length > 0 && (
            <section className="rounded-card border border-line bg-surface p-3">
              <h3 className="mb-2 text-body-lg font-semibold text-ink">Alur per stasiun</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.stasiun.map((stasiun) => (
                  <KartuStasiun key={stasiun.nama} stasiun={stasiun} />
                ))}
              </div>
            </section>
          )}

          {data.order && <KartuOrder order={data.order} />}

          {data.tren && data.tren.titik.length > 0 && (
            <PanelGrafik
              judul={`Tren ${data.tren.label}`}
              grafik={
                <GrafikTrenProduksi
                  titik={data.tren.titik}
                  satuan={data.tren.satuan}
                  label={data.tren.label}
                />
              }
              tabel={<TabelTren tren={data.tren} />}
            />
          )}
        </>
      )}
    </div>
  );
}

function KartuStasiun({ stasiun }: { stasiun: StasiunProduksi }) {
  return (
    <div className="min-w-[190px] shrink-0 rounded-control border border-line bg-surface-muted/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-body-lg font-semibold text-ink">{stasiun.nama}</span>
        {stasiun.tercapai !== null && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-caption font-medium tabular-nums',
              stasiun.tercapai >= 100
                ? 'bg-secondary-subtle text-secondary-text'
                : 'bg-accent-subtle text-accent-text',
            )}
          >
            {formatAngka(stasiun.tercapai)}%
          </span>
        )}
      </div>
      <dl className="space-y-0.5">
        {stasiun.field.map((field) => (
          <div key={field.label} className="flex items-baseline justify-between gap-2 text-caption">
            <dt className="text-ink-soft">{field.label}</dt>
            <dd className="tabular-nums text-ink">
              {formatAngka(field.nilai)}
              {field.satuan ? <span className="text-ink-soft"> {field.satuan}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function KartuOrder({ order }: { order: OrderProduksi }) {
  return (
    <section className="rounded-card border border-line bg-surface p-3">
      <h3 className="mb-2 text-body-lg font-semibold text-ink">Pemenuhan Order</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RingkasOrder label="Jumlah SPK" nilai={formatAngka(order.spk)} />
        <RingkasOrder
          label="Pouch selesai"
          nilai={formatAngka(order.selesai_pouch)}
          sub={`dari ${formatAngka(order.butuh_pouch)} · kurang ${formatAngka(order.kurang_pouch)}`}
        />
        <RingkasOrder
          label="Box selesai"
          nilai={formatAngka(order.selesai_box)}
          sub={`dari ${formatAngka(order.butuh_box)} · kurang ${formatAngka(order.kurang_box)}`}
        />
        <RingkasOrder
          label="Tepat kirim"
          nilai={`${formatAngka(order.tepat_kirim)}/${formatAngka(order.terjadwal)}`}
          sub="selesai ≤ tanggal kirim"
        />
      </div>
    </section>
  );
}

function RingkasOrder({ label, nilai, sub }: { label: string; nilai: string; sub?: string }) {
  return (
    <div className="rounded-control border border-line bg-surface-muted/40 p-2.5">
      <p className="text-caption text-ink-soft">{label}</p>
      <p className="mt-0.5 text-page-title tabular-nums text-ink">{nilai}</p>
      {sub && <p className="text-caption text-ink-soft">{sub}</p>}
    </div>
  );
}

function TabelTren({ tren }: { tren: TrenProduksi }) {
  return (
    <table className="w-full text-table">
      <thead>
        <tr className="border-b border-line text-left text-ink-soft">
          <th className="py-1 pr-2 font-medium">Periode</th>
          <th className="py-1 text-right font-medium">{tren.label}</th>
        </tr>
      </thead>
      <tbody>
        {tren.titik.map((titik) => (
          <tr key={titik.label} className="border-b border-line/60">
            <td className="py-1 pr-2 text-ink-muted">{titik.label}</td>
            <td className="py-1 text-right tabular-nums text-ink">
              {formatAngka(titik.nilai)}
              {tren.satuan ? <span className="text-ink-soft"> {tren.satuan}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
