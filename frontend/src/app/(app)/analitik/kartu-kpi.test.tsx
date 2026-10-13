import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { KartuKpi } from '@/lib/analitik';
import { KartuAngka } from './kartu-kpi';

/*
 * Arah membaik berbeda tiap kartu: laporan masuk naik itu baik, laporan yang
 * menunggu tinjauan naik itu buruk. Warna yang mengikuti tanda selisih saja
 * akan mewarnai "tumpukan tinjauan berkurang" sebagai kabar buruk.
 *
 * Penjaga ini sebelumnya menumpang papan Ringkasan lewat kartu "Kartu lewat
 * target". Kartu itu ikut hilang bersama fitur papan progres, sedangkan
 * perilakunya tetap milik komponen ini — jadi diujinya langsung di sini,
 * bukan lewat halaman yang kebetulan memakainya.
 */
function kartu(ubah: Partial<KartuKpi>): KartuKpi {
  return {
    kunci: 'menunggu',
    label: 'Menunggu tinjauan',
    nilai: 4,
    satuan: 'laporan',
    sebelumnya: 8,
    arah_baik: 'turun',
    keterangan: 'Sudah dikirim, belum ditinjau siapa pun.',
    ...ubah,
  };
}

function pasang(satu: KartuKpi) {
  return render(
    <TooltipProvider>
      <KartuAngka kartu={satu} />
    </TooltipProvider>,
  );
}

describe('KartuAngka', () => {
  it('membaca penurunan sebagai kabar baik bila arah membaiknya turun', () => {
    pasang(kartu({}));

    expect(screen.getByText(/-50%/).className).toContain('text-secondary-text');
  });

  it('membaca penurunan sebagai kabar buruk bila arah membaiknya naik', () => {
    pasang(kartu({ arah_baik: 'naik' }));

    expect(screen.getByText(/-50%/).className).toContain('text-danger-text');
  });

  it('menyebutkan kartu tanpa pembanding apa adanya', () => {
    pasang(kartu({ sebelumnya: null }));

    expect(screen.getByText('Tanpa pembanding')).toBeInTheDocument();
  });
});
