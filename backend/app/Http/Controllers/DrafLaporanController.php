<?php

namespace App\Http\Controllers;

use App\Models\ReportDraft;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Auto-save draf isian laporan di latar.
 *
 * Jalur draf tersendiri, bukan endpoint laporan biasa: `DailyReportController`
 * memvalidasi tiap sel (kolom wajib, tipe), sehingga form setengah terisi akan
 * ditolak 422. Draf ini menyimpan payload apa adanya supaya isian yang belum
 * lengkap pun aman, lalu dibaca kembali ke form pemiliknya. Kepemilikan dijaga
 * dengan menyaring `user_id` pada tiap aksi — tak ada draf yang bisa dibaca
 * pengguna lain.
 */
class DrafLaporanController extends Controller
{
    /** Sama dengan draf localStorage: draf yang lama ditinggalkan dibuang. */
    private const UMUR_MAKS_HARI = 7;

    public function show(Request $request, string $kunci): JsonResponse
    {
        $this->pastikanKunci($kunci);

        $draf = ReportDraft::where('user_id', $request->user()->id)
            ->where('kunci', $kunci)
            ->first();

        if ($draf !== null && $draf->updated_at->lt(now()->subDays(self::UMUR_MAKS_HARI))) {
            $draf->delete();
            $draf = null;
        }

        return ApiResponse::ok($draf === null ? null : [
            'payload' => $draf->payload,
            'disimpan_pada' => $draf->updated_at->toIso8601String(),
        ]);
    }

    public function simpan(Request $request, string $kunci): JsonResponse
    {
        $this->pastikanKunci($kunci);

        $data = $request->validate([
            'payload' => ['required', 'array'],
        ]);

        $draf = ReportDraft::updateOrCreate(
            ['user_id' => $request->user()->id, 'kunci' => $kunci],
            ['payload' => $data['payload']],
        );

        return ApiResponse::ok(
            ['disimpan_pada' => $draf->updated_at->toIso8601String()],
            'Draf tersimpan.',
        );
    }

    public function destroy(Request $request, string $kunci): JsonResponse
    {
        $this->pastikanKunci($kunci);

        ReportDraft::where('user_id', $request->user()->id)
            ->where('kunci', $kunci)
            ->delete();

        return ApiResponse::ok(null, 'Draf dibersihkan.');
    }

    /**
     * Kunci hanya boleh `baru` atau `ubah-<id>` — sama seperti kunci draf di
     * peramban. Selain itu ditolak supaya kolomnya tak jadi tempat titipan
     * data sembarangan.
     */
    private function pastikanKunci(string $kunci): void
    {
        abort_unless(preg_match('/^(baru|ubah-\d+)$/', $kunci) === 1, 404);
    }
}
