<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotifikasiController extends Controller
{
    /** Jumlah notifikasi yang dimuat lonceng sekali panggil. */
    private const BATAS = 20;

    /**
     * Notifikasi milik pengguna yang sedang masuk.
     *
     * Tidak ada penyaringan berdasarkan pengguna lain: relasi `notifications()`
     * sudah terikat pada pemiliknya, sehingga tidak ada jalan membaca
     * notifikasi orang lain lewat endpoint ini.
     */
    public function index(Request $request): JsonResponse
    {
        $pengguna = $request->user();

        $daftar = $pengguna->notifications()
            ->latest()
            ->limit(self::BATAS)
            ->get();

        return ApiResponse::ok([
            'jumlah_belum_dibaca' => $pengguna->unreadNotifications()->count(),
            'daftar' => $daftar->map(fn (DatabaseNotification $item) => [
                'id' => $item->id,
                'jenis' => $item->data['jenis'] ?? 'umum',
                'judul' => $item->data['judul'] ?? '',
                'pesan' => $item->data['pesan'] ?? '',
                'tautan' => $item->data['tautan'] ?? null,
                'dibaca' => $item->read_at !== null,
                'waktu' => $item->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /**
     * Menandai satu notifikasi sudah dibaca.
     */
    public function baca(Request $request, string $notifikasi): JsonResponse
    {
        $baris = $request->user()->notifications()->whereKey($notifikasi)->first();

        if (! $baris) {
            return ApiResponse::error('Notifikasi tidak ditemukan.', 404);
        }

        $baris->markAsRead();

        return ApiResponse::ok(null, 'Notifikasi ditandai sudah dibaca.');
    }

    /**
     * Menandai seluruh notifikasi sudah dibaca.
     */
    public function bacaSemua(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return ApiResponse::ok(null, 'Semua notifikasi ditandai sudah dibaca.');
    }

    /**
     * Menghapus satu notifikasi.
     *
     * Dihapus sungguhan, bukan disembunyikan. Notifikasi bukan catatan yang
     * perlu diaudit — riwayat tindakan yang sebenarnya ada di `audit_logs`,
     * dan menyimpan pemberitahuan yang sudah dibuang pemiliknya hanya
     * menumbuhkan tabel yang tidak pernah dibaca siapa pun.
     */
    public function hapus(Request $request, string $notifikasi): JsonResponse
    {
        $baris = $request->user()->notifications()->whereKey($notifikasi)->first();

        if (! $baris) {
            return ApiResponse::error('Notifikasi tidak ditemukan.', 404);
        }

        $baris->delete();

        return ApiResponse::ok(
            ['jumlah_belum_dibaca' => $request->user()->unreadNotifications()->count()],
            'Notifikasi dihapus.',
        );
    }

    /**
     * Membersihkan notifikasi.
     *
     * Bawaannya **hanya yang sudah dibaca**. Menghapus semuanya sekaligus
     * berarti membuang pemberitahuan yang belum sempat dilihat pemiliknya, dan
     * tidak ada jalan mengembalikannya. Yang ingin membuang seluruhnya mengirim
     * `semua=1` — pilihan yang dibuat sadar, bukan akibat sampingan dari
     * menekan tombol bersihkan.
     */
    public function bersihkan(Request $request): JsonResponse
    {
        $pengguna = $request->user();
        $semua = $request->boolean('semua');

        $jumlah = $semua
            ? $pengguna->notifications()->delete()
            : $pengguna->readNotifications()->delete();

        return ApiResponse::ok(
            [
                'jumlah_dihapus' => (int) $jumlah,
                'jumlah_belum_dibaca' => $pengguna->unreadNotifications()->count(),
            ],
            $jumlah === 0
                ? 'Tidak ada notifikasi yang perlu dibersihkan.'
                : ($semua
                    ? 'Semua notifikasi dihapus.'
                    : 'Notifikasi yang sudah dibaca dihapus.'),
        );
    }
}
