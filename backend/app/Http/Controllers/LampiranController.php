<?php

namespace App\Http\Controllers;

use App\Http\Requests\LampiranRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\DailyReport;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LampiranController extends Controller
{
    /** Cakram penyimpanan lampiran — di luar direktori publik. */
    private const CAKRAM = 'local';

    public function store(LampiranRequest $request, DailyReport $laporan): JsonResponse
    {
        $berkas = $request->file('berkas');

        /*
         * Nama di disk dibuat acak, tidak pernah memakai nama dari pengguna.
         *
         * Nama dari pengguna dapat memuat karakter yang berbahaya bagi jalur
         * berkas, dapat kembar, dan dapat ditebak. Nama aslinya tetap disimpan
         * di basis data untuk ditampilkan dan dipakai saat diunduh.
         */
        $ekstensi = mb_strtolower((string) $berkas->getClientOriginalExtension());
        $namaDisk = Str::uuid()->toString().'.'.$ekstensi;

        $jalur = $berkas->storeAs("lampiran/{$laporan->getKey()}", $namaDisk, self::CAKRAM);

        $lampiran = $laporan->attachments()->create([
            'uploaded_by' => $request->user()->getKey(),
            'original_name' => mb_substr((string) $berkas->getClientOriginalName(), 0, 191),
            'path' => $jalur,
            'mime_type' => (string) $berkas->getMimeType(),
            'size_bytes' => (int) $berkas->getSize(),
        ]);

        Audit::catat(
            'lampiran_ditambah',
            Audit::MODUL_LAPORAN,
            "Melampirkan {$lampiran->original_name} pada laporan "
                .$laporan->report_date->translatedFormat('d F Y'),
            $laporan,
        );

        return ApiResponse::created(
            new AttachmentResource($lampiran->load('pengunggah')),
            'Lampiran berhasil diunggah.',
        );
    }

    /**
     * Mengunduh lampiran.
     *
     * Selalu lewat sini, tidak pernah lewat tautan penyimpanan langsung: izinnya
     * harus diperiksa dulu, dan berkas Office maupun PDF tidak boleh dibuka
     * sendiri oleh peramban.
     */
    public function show(Attachment $lampiran): StreamedResponse|JsonResponse
    {
        $this->authorize('view', $lampiran);

        if (! Storage::disk(self::CAKRAM)->exists($lampiran->path)) {
            return ApiResponse::error('Berkas lampiran tidak ditemukan.', 404);
        }

        return Storage::disk(self::CAKRAM)->download(
            $lampiran->path,
            $lampiran->original_name,
            [
                'Content-Type' => $lampiran->mime_type,

                /*
                 * Content-Disposition sengaja tidak ditulis di sini.
                 *
                 * `download()` sudah menyusunnya sebagai `attachment` lengkap
                 * dengan nama berkasnya; menimpanya dengan 'attachment' saja
                 * justru menghapus namanya, dan pengguna menerima berkas
                 * bernama acak.
                 *
                 * nosniff menahan peramban menebak tipe isi sendiri — tanpa itu
                 * berkas yang isinya HTML dapat dijalankan pada asal kita.
                 */
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    public function destroy(Attachment $lampiran): JsonResponse
    {
        $this->authorize('delete', $lampiran);

        $nama = $lampiran->original_name;
        $laporan = $lampiran->report;

        Storage::disk(self::CAKRAM)->delete($lampiran->path);
        $lampiran->delete();

        Audit::catat(
            'lampiran_dihapus',
            Audit::MODUL_LAPORAN,
            "Menghapus lampiran {$nama} dari laporan "
                .$laporan->report_date->translatedFormat('d F Y'),
            $laporan,
        );

        return ApiResponse::ok(null, 'Lampiran berhasil dihapus.');
    }
}
