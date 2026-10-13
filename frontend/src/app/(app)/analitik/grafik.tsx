'use client';

import { useMemo } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ActiveElement,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import {
  WARNA,
  type BarisKepatuhanHarian,
  type BarisSebaranStatus,
  type Metrik,
} from '@/lib/analitik';
import { formatAngka, formatTanggal, formatTanggalRingkas } from '@/lib/format';

/*
 * Chart.js v4 tidak mendaftarkan apa pun secara otomatis. Yang didaftarkan
 * hanya bagian yang benar-benar dipakai — mendaftarkan seluruhnya menyeret
 * seluruh isi paket ke dalam bundel.
 */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

/** Animasi dimatikan bila pengguna memintanya lewat setelan sistem. */
function gerakDikurangi(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * Pengaturan yang sama untuk seluruh grafik.
 *
 * Kanvasnya diberi `aria-hidden` di tiap komponen: isi grafik sudah terbaca
 * lewat tabel pendampingnya, dan membiarkan kanvas ikut terbaca hanya
 * menghasilkan simpul kosong di tengah halaman.
 */
function dasar(gerak: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: gerak ? (false as const) : { duration: 260 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 10, boxHeight: 10, color: WARNA.teks, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#191C1E',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 8,
        displayColors: true,
      },
    },
  };
}

/**
 * Membuat sebuah grafik dapat ditekan.
 *
 * ## Mengapa `nearest` + `intersect`, bukan elemen yang diberikan Chart.js
 *
 * Interaksi bawaan memakai mode `index`: menekan satu batang mengembalikan
 * **seluruh** dataset pada posisi itu, sehingga tidak ada cara mengetahui
 * segmen mana yang benar-benar ditekan. Untuk tooltip itu memang yang
 * diinginkan — pembacanya ingin membandingkan ketiga status sekaligus. Untuk
 * penyaringan justru salah: menekan bagian oranye harus menyaring
 * "dalam proses", bukan status pertama yang kebetulan ada di indeks itu.
 *
 * ## Kanvas tidak dapat difokus papan ketik
 *
 * Konsekuensi langsung dari Chart.js: seluruh grafik hanya satu elemen DOM.
 * Penyaringan lewat grafik karena itu **tidak pernah** menjadi satu-satunya
 * jalan — tabel pendamping tiap grafik memuat tautan yang sama, dan itulah
 * jalur papan ketik maupun pembaca layar (`docs/standar-ui-ux.md` §1).
 */
function dapatDitekan(aktif: boolean) {
  if (!aktif) return {};

  return {
    onHover: (peristiwa: { native: Event | null }, elemen: ActiveElement[]) => {
      const sasaran = peristiwa.native?.target;

      if (sasaran instanceof HTMLElement) {
        sasaran.style.cursor = elemen.length > 0 ? 'pointer' : 'default';
      }
    },
  };
}

/* ------------------------------------------------------------ tren kepatuhan */

export function GrafikTrenKepatuhan({
  data,
  onPilihTanggal,
}: {
  data: BarisKepatuhanHarian[];
  onPilihTanggal?: (tanggal: string) => void;
}) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => formatTanggalRingkas(satu.tanggal)),
      datasets: [
        {
          label: 'Kepatuhan (%)',
          data: data.map((satu) => satu.persen),
          borderColor: WARNA.primary,
          backgroundColor: 'rgba(26, 115, 232, 0.12)',
          fill: true,
          tension: 0.25,
          /*
           * Akhir pekan diberi titik lebih besar dan berwarna lain. Banyak
           * departemen memang tidak melapor hari Minggu, dan tanpa penanda itu
           * grafiknya terbaca seperti kemerosotan berulang.
           */
          pointRadius: data.map((satu) => (satu.akhir_pekan ? 4 : 2)),
          pointBackgroundColor: data.map((satu) =>
            satu.akhir_pekan ? WARNA.belum_mulai : WARNA.primary,
          ),
        },
      ],
    }),
    [data],
  );

  const opsi: ChartOptions<'line'> = {
    ...dasar(gerak),
    scales: {
      x: { ticks: { color: WARNA.teks, font: { size: 10 }, maxTicksLimit: 10 } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: WARNA.teks, font: { size: 11 }, callback: (n) => `${n}%` },
        grid: { color: WARNA.garisBantu },
      },
    },
    plugins: {
      ...dasar(gerak).plugins,
      tooltip: {
        ...dasar(gerak).plugins.tooltip,
        callbacks: {
          title: (butir) => formatTanggal(data[butir[0].dataIndex]?.tanggal ?? ''),
          label: (butir) => {
            const baris = data[butir.dataIndex];

            return baris === undefined
              ? ''
              : `${baris.melapor} dari ${baris.wajib} melapor (${baris.persen}%)` +
                  (baris.akhir_pekan ? ' — akhir pekan' : '');
          },
        },
      },
    },
    ...dapatDitekan(onPilihTanggal !== undefined),
    onClick: (_peristiwa, elemen: ActiveElement[]) => {
      // Grafik garis memakai mode `index`; satu titik hanya punya satu seri,
      // sehingga elemen bawaannya sudah tepat.
      const baris = data[elemen[0]?.index ?? -1];

      if (baris) onPilihTanggal?.(baris.tanggal);
    },
  };

  return <Line aria-hidden="true" data={konfigurasi} options={opsi} />;
}

/* -------------------------------------------------------------- produktivitas */

export function GrafikProduktivitas({
  data,
  metrik,
  onPilihTanggal,
}: {
  data: { tanggal: string; nilai: number; baris: number; pelapor: number }[];
  metrik: Metrik;
  onPilihTanggal?: (tanggal: string) => void;
}) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => formatTanggalRingkas(satu.tanggal)),
      datasets: [
        {
          label: `${metrik.label} (${metrik.satuan})`,
          data: data.map((satu) => satu.nilai),
          borderColor: WARNA.primary,
          backgroundColor: 'rgba(26, 115, 232, 0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    }),
    [data, metrik],
  );

  const opsi: ChartOptions<'line'> = {
    ...dasar(gerak),
    plugins: {
      ...dasar(gerak).plugins,
      tooltip: {
        ...dasar(gerak).plugins.tooltip,
        callbacks: {
          title: (butir) => formatTanggal(data[butir[0].dataIndex]?.tanggal ?? ''),
          label: (butir) => {
            const baris = data[butir.dataIndex];

            return baris === undefined
              ? ''
              : `${formatAngka(baris.nilai, metrik.desimal ? 2 : 0)} ${metrik.satuan} — ${baris.baris} baris, ${baris.pelapor} pelapor`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: WARNA.teks, font: { size: 10 }, maxTicksLimit: 10 } },
      y: {
        beginAtZero: true,
        ticks: { color: WARNA.teks, font: { size: 11 } },
        grid: { color: WARNA.garisBantu },
      },
    },
    ...dapatDitekan(onPilihTanggal !== undefined),
    onClick: (_peristiwa, elemen: ActiveElement[]) => {
      const baris = data[elemen[0]?.index ?? -1];

      if (baris) onPilihTanggal?.(baris.tanggal);
    },
  };

  return <Line aria-hidden="true" data={konfigurasi} options={opsi} />;
}

export function GrafikProduktivitasDepartemen({
  data,
  metrik,
  onPilih,
}: {
  data: { departemen_id: number; departemen: string; nilai: number }[];
  metrik: Metrik;
  onPilih?: (departemenId: number) => void;
}) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => satu.departemen),
      datasets: [
        {
          label: `${metrik.label} (${metrik.satuan})`,
          data: data.map((satu) => satu.nilai),
          backgroundColor: WARNA.primary,
        },
      ],
    }),
    [data, metrik],
  );

  const opsi: ChartOptions<'bar'> = {
    ...dasar(gerak),
    indexAxis: 'y',
    plugins: { ...dasar(gerak).plugins, legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: WARNA.teks, font: { size: 11 } },
        grid: { color: WARNA.garisBantu },
      },
      y: { ticks: { color: WARNA.teks, font: { size: 11 } } },
    },
    ...dapatDitekan(onPilih !== undefined),
    onClick: (_peristiwa, elemen: ActiveElement[]) => {
      const baris = data[elemen[0]?.index ?? -1];

      if (baris) onPilih?.(baris.departemen_id);
    },
  };

  return <Bar aria-hidden="true" data={konfigurasi} options={opsi} />;
}

export function GrafikSebaranStatus({
  data,
  onPilihStatus,
}: {
  data: BarisSebaranStatus[];
  onPilihStatus?: (status: string) => void;
}) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => satu.label),
      datasets: [
        {
          data: data.map((satu) => satu.jumlah),
          backgroundColor: [WARNA.belum_mulai, WARNA.dalam_proses, WARNA.selesai],
          borderWidth: 0,
        },
      ],
    }),
    [data],
  );

  const opsi: ChartOptions<'doughnut'> = {
    ...dasar(gerak),
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      ...dasar(gerak).plugins,
      tooltip: {
        ...dasar(gerak).plugins.tooltip,
        callbacks: {
          label: (butir) => {
            const baris = data[butir.dataIndex];

            return baris === undefined
              ? ''
              : `${baris.label}: ${formatAngka(baris.jumlah)} baris (${baris.persen}%)`;
          },
        },
      },
    },
    ...dapatDitekan(onPilihStatus !== undefined),
    onClick: (_peristiwa, elemen: ActiveElement[]) => {
      // Doughnut sudah memakai `intersect`, sehingga elemennya tepat satu.
      const baris = data[elemen[0]?.index ?? -1];

      if (baris) onPilihStatus?.(baris.status);
    },
  };

  return <Doughnut aria-hidden="true" data={konfigurasi} options={opsi} />;
}

/** Tren keluaran produksi — butir sudah berlabel dari server (hari/minggu/bulan/tahun). */
export function GrafikTrenProduksi({
  titik,
  satuan,
  label,
}: {
  titik: { label: string; nilai: number }[];
  satuan: string;
  label: string;
}) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: titik.map((satu) => satu.label),
      datasets: [
        {
          label: satuan ? `${label} (${satuan})` : label,
          data: titik.map((satu) => satu.nilai),
          borderColor: WARNA.primary,
          backgroundColor: 'rgba(26, 115, 232, 0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    }),
    [titik, satuan, label],
  );

  const opsi: ChartOptions<'line'> = {
    ...dasar(gerak),
    plugins: {
      ...dasar(gerak).plugins,
      tooltip: {
        ...dasar(gerak).plugins.tooltip,
        callbacks: {
          label: (butir) => `${formatAngka(titik[butir.dataIndex]?.nilai ?? 0)} ${satuan}`.trim(),
        },
      },
    },
    scales: {
      x: { ticks: { color: WARNA.teks, font: { size: 10 }, maxTicksLimit: 12 } },
      y: {
        beginAtZero: true,
        ticks: { color: WARNA.teks, font: { size: 11 } },
        grid: { color: WARNA.garisBantu },
      },
    },
  };

  return <Line aria-hidden="true" data={konfigurasi} options={opsi} />;
}
