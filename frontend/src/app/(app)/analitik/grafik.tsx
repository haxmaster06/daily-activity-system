'use client';

import { useMemo } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ActiveElement,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import { formatTanggalRingkas } from '@/lib/format';
import {
  WARNA,
  persenKepatuhan,
  type BarisBeban,
  type BarisKepatuhan,
  type BarisSebaranStatus,
  type BarisStatusDepartemen,
} from '@/lib/analitik';

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
  Tooltip,
  Legend,
);

/**
 * Animasi dimatikan bila pengguna memintanya lewat setelan sistem.
 *
 * Dibaca sekali saat render, bukan lewat state: nilainya praktis tidak pernah
 * berubah di tengah sesi, dan mendengarkan perubahannya hanya menambah
 * pekerjaan tanpa hasil yang terlihat.
 */
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
      },
    },
  };
}

/** Sumbu jumlah kartu: selalu bilangan bulat, selalu mulai dari nol. */
const SUMBU_JUMLAH = {
  beginAtZero: true,
  // Tanpa `precision`, angka kecil membuat sumbu menulis "0,5 — 1 — 1,5".
  ticks: { precision: 0, color: WARNA.teks, font: { size: 11 } },
  grid: { color: WARNA.garisBantu },
};

export function GrafikStatusDepartemen({
  data,
  onPilihDepartemen,
}: {
  data: BarisStatusDepartemen[];
  onPilihDepartemen?: (departemen: string) => void;
}) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => satu.departemen),
      datasets: [
        {
          label: 'Belum Mulai',
          data: data.map((satu) => satu.belum_mulai),
          backgroundColor: WARNA.belum_mulai,
        },
        {
          label: 'Dalam Proses',
          data: data.map((satu) => satu.dalam_proses),
          backgroundColor: WARNA.dalam_proses,
        },
        {
          label: 'Selesai',
          data: data.map((satu) => satu.selesai),
          backgroundColor: WARNA.selesai,
        },
      ],
    }),
    [data],
  );

  const opsi: ChartOptions<'bar'> = {
    ...dasar(gerak),
    scales: {
      x: { stacked: true, ticks: { color: WARNA.teks, font: { size: 11 } } },
      y: { stacked: true, ...SUMBU_JUMLAH },
    },
    onClick: (_peristiwa, elemen: ActiveElement[]) => {
      const pertama = elemen[0];
      if (pertama && data[pertama.index]) {
        onPilihDepartemen?.(data[pertama.index].departemen);
      }
    },
  };

  return <Bar aria-hidden="true" data={konfigurasi} options={opsi} />;
}

export function GrafikKepatuhan({ data }: { data: BarisKepatuhan[] }) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => formatTanggalRingkas(satu.tanggal)),
      datasets: [
        {
          label: 'Kepatuhan (%)',
          data: data.map(persenKepatuhan),
          borderColor: WARNA.primary,
          backgroundColor: WARNA.primary,
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    }),
    [data],
  );

  const opsi: ChartOptions<'line'> = {
    ...dasar(gerak),
    scales: {
      x: {
        ticks: {
          color: WARNA.teks,
          font: { size: 10 },
          // Tiga puluh tanggal berdempetan tidak terbaca; ditampilkan berselang.
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: WARNA.teks,
          font: { size: 11 },
          callback: (nilai) => `${nilai}%`,
        },
        grid: { color: WARNA.garisBantu },
      },
    },
  };

  return <Line aria-hidden="true" data={konfigurasi} options={opsi} />;
}

export function GrafikSebaranStatus({ data }: { data: BarisSebaranStatus[] }) {
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

  const opsi: ChartOptions<'doughnut'> = dasar(gerak);

  return <Doughnut aria-hidden="true" data={konfigurasi} options={opsi} />;
}

export function GrafikBeban({ data }: { data: BarisBeban[] }) {
  const gerak = gerakDikurangi();

  const konfigurasi = useMemo(
    () => ({
      labels: data.map((satu) => satu.nama),
      datasets: [
        {
          label: 'Berjalan',
          data: data.map((satu) => satu.berjalan),
          backgroundColor: WARNA.dalam_proses,
        },
        {
          label: 'Selesai',
          data: data.map((satu) => satu.selesai),
          backgroundColor: WARNA.selesai,
        },
      ],
    }),
    [data],
  );

  const opsi: ChartOptions<'bar'> = {
    ...dasar(gerak),
    // Mendatar supaya nama orang terbaca penuh tanpa diputar miring.
    indexAxis: 'y',
    scales: {
      x: { stacked: true, ...SUMBU_JUMLAH },
      y: { stacked: true, ticks: { color: WARNA.teks, font: { size: 11 } } },
    },
  };

  return <Bar aria-hidden="true" data={konfigurasi} options={opsi} />;
}
