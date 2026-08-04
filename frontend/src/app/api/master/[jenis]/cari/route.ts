import { NextResponse } from 'next/server';

import { GalatApi, panggilApi } from '@/lib/api';

/**
 * Meneruskan pencarian daftar master ke backend.
 *
 * Peramban tidak pernah memanggil backend langsung: token akses ada pada
 * cookie httpOnly yang hanya terbaca di sisi server Next. Rute ini menjadi
 * jembatannya, dan hanya jembatan — seluruh penyaringan dan pembatasan jumlah
 * tetap dikerjakan backend.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jenis: string }> },
) {
  const { jenis } = await params;
  const masuk = new URL(request.url).searchParams;

  // Hanya parameter yang memang dikenal yang diteruskan.
  const query = new URLSearchParams();
  for (const kunci of ['q', 'induk_id', 'induk_kode', 'batas'] as const) {
    const nilai = masuk.get(kunci);
    if (nilai) query.set(kunci, nilai);
  }

  try {
    const hasil = await panggilApi<{ id: number; kode: string; nama: string }[]>(
      `/master/${encodeURIComponent(jenis)}/cari?${query.toString()}`,
    );

    return NextResponse.json(hasil);
  } catch (galat) {
    if (galat instanceof GalatApi) {
      return NextResponse.json(
        { success: false, message: galat.message, data: [] },
        { status: galat.status },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Daftar pilihan tidak dapat dimuat.', data: [] },
      { status: 500 },
    );
  }
}
