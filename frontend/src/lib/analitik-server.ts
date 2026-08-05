import 'server-only';

import { panggilApi } from '@/lib/api';
import type { DataAnalitik } from '@/lib/analitik';

/**
 * Seluruh angka Executive Analytics dalam satu permintaan.
 *
 * Bukan lima pengambil terpisah: yang membuka halaman ini membaca keadaan
 * sekali lihat, dan lima permintaan berurutan membuat halamannya terisi
 * sepotong-sepotong.
 */
export async function ambilAnalitik(): Promise<DataAnalitik> {
  const { data } = await panggilApi<DataAnalitik>('/analitik');

  return data;
}
