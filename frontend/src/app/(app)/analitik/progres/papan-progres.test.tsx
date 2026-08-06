import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataProgres } from '@/lib/analitik';
import { PapanProgres } from './papan-progres';

/*
 * Penyaring bersama membaca alamat halaman. Tanpa tiruan ini seluruh papan
 * gagal dirender karena alasan yang tidak ada hubungannya dengan yang diuji.
 */
const push = vi.fn();
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, refresh: vi.fn() }),
    usePathname: () => '/analitik/progres',
    useSearchParams: () => params,
}));

/*
 * Grafiknya diganti boneka: Chart.js menggambar ke `<canvas>`, dan jsdom tidak
 * menyediakan konteks gambar sama sekali. Yang perlu diuji bukan gambarnya,
 * melainkan bahwa segmen yang ditekan berakhir sebagai penyaring yang benar.
 */
vi.mock('../grafik', () => ({
    GrafikStatusDepartemen: ({
        onPilih,
    }: {
        onPilih?: (departemen: number, status: string) => void;
    }) => (
        <button type="button" onClick={() => onPilih?.(3, 'selesai')}>
            segmen departemen
        </button>
    ),
    GrafikBeban: ({ onPilih }: { onPilih?: (pengguna: number, status: string) => void }) => (
        <button type="button" onClick={() => onPilih?.(7, 'berjalan')}>
            batang beban
        </button>
    ),
}));

const CONTOH: DataProgres = {
    rentang: {
        dari: '2026-07-07',
        sampai: '2026-08-05',
        hari: 30,
        departemen_id: [],
        status: [],
        pengguna_id: [],
        template_id: [],
        nilai: [],
    },
    status_per_departemen: [
        {
            departemen_id: 3,
            departemen: 'Produksi',
            belum_mulai: 2,
            dalam_proses: 4,
            selesai: 9,
            total: 15,
        },
    ],
    sebaran_status_baris: [],
    beban_penanggung_jawab: [{ id: 7, nama: 'Anggota Satu', berjalan: 3, selesai: 5, telat: 1 }],
    lewat_target: [],
    umur_kartu: [],
    ringkasan: { total: 15, berjalan: 4, selesai: 9, telat: 1, tanpa_penanggung_jawab: 0 },
};

beforeEach(() => {
    push.mockClear();
    params = new URLSearchParams();
});

describe('grafik menyaring seluruh halaman', () => {
    /*
     * Satu segmen membawa dua keterangan sekaligus: departemen tempatnya berdiri
     * dan statusnya. Menerapkan salah satunya saja menampilkan angka yang bukan
     * angka yang barusan ditekan pengguna.
     */
    it('menyaring departemen dan status sekaligus dari satu segmen', async () => {
        const pengguna = userEvent.setup();
        render(<PapanProgres data={CONTOH} />);

        await pengguna.click(screen.getByRole('button', { name: 'segmen departemen' }));

        const alamat = push.mock.calls[0][0] as string;

        expect(alamat).toContain('departemen=3');
        expect(alamat).toContain('status=selesai');
    });

    it('melepaskan penyaringnya saat segmen yang sama ditekan ulang', async () => {
        const pengguna = userEvent.setup();
        params = new URLSearchParams('departemen=3&status=selesai');
        render(<PapanProgres data={CONTOH} />);

        await pengguna.click(screen.getByRole('button', { name: 'segmen departemen' }));

        expect(push).toHaveBeenCalledWith('/analitik/progres');
    });

    it('menyaring penanggung jawab beserta statusnya dari batang beban', async () => {
        const pengguna = userEvent.setup();
        render(<PapanProgres data={CONTOH} />);

        await pengguna.click(screen.getByRole('button', { name: 'batang beban' }));

        const alamat = push.mock.calls[0][0] as string;

        expect(alamat).toContain('pengguna=7');
        expect(alamat).toContain('status=berjalan');
    });
});

/*
 * Tiap grafik wajib berdampingan dengan tabel yang memuat angka yang sama.
 * Grafik sendirian tidak dapat dibaca pembaca layar, dan angkanya tidak dapat
 * disalin siapa pun (standar §9).
 */
describe('tabel pendamping wajib', () => {
    it('menyertakan tabel di dalam panel yang sama dengan tiap grafik', () => {
        render(<PapanProgres data={CONTOH} />);

        for (const nama of ['segmen departemen', 'batang beban']) {
            const panel = screen.getByRole('button', { name: nama }).closest('section');

            expect(panel).not.toBeNull();
            expect(panel?.querySelector('table')).not.toBeNull();
        }
    });
});
