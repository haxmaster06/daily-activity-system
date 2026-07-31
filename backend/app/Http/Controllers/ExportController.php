<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\DataExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    /**
     * Pratinjau isi export.
     *
     * Unduhan langsung tidak disediakan — pengguna melihat dulu apa yang akan
     * keluar, baru memilih bentuk berkasnya (standarisasi §27).
     */
    public function pratinjau(Request $request): JsonResponse
    {
        $filter = $this->periksaFilter($request);
        $data = DataExport::susun($request->user(), $filter);

        return ApiResponse::ok($data);
    }

    public function excel(Request $request): Response|StreamedResponse|JsonResponse
    {
        $filter = $this->periksaFilter($request);
        $data = DataExport::susun($request->user(), $filter);

        if ($data['template'] === null) {
            return ApiResponse::error('Tidak ada data untuk diexport.', 422);
        }

        $lembar = new Spreadsheet;
        $sheet = $lembar->getActiveSheet();
        $sheet->setTitle(mb_substr($data['template']['nama'], 0, 31));

        $jumlahKolom = count($data['kolom']);

        // Judul di dua baris pertama, di luar tabel, supaya baris header tabel
        // tetap dapat dipakai sebagai filter di Excel.
        $sheet->setCellValue([1, 1], 'Laporan Harian — '.$data['template']['nama']);
        $sheet->mergeCells([1, 1, $jumlahKolom, 1]);
        $sheet->getStyle([1, 1])->getFont()->setBold(true)->setSize(14);

        $sheet->setCellValue([1, 2], 'Periode '.$data['rentang']['label']);
        $sheet->mergeCells([1, 2, $jumlahKolom, 2]);
        $sheet->getStyle([1, 2])->getFont()->setSize(10);

        $barisHeader = 4;

        foreach ($data['kolom'] as $index => $kolom) {
            $judul = $kolom['satuan'] ? "{$kolom['label']} ({$kolom['satuan']})" : $kolom['label'];
            $sheet->setCellValue([$index + 1, $barisHeader], $judul);
        }

        $sheet->getStyle([1, $barisHeader, $jumlahKolom, $barisHeader])->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '005BBF']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
        ]);

        foreach ($data['baris'] as $nomor => $baris) {
            foreach ($data['kolom'] as $index => $kolom) {
                $sheet->setCellValue(
                    [$index + 1, $barisHeader + 1 + $nomor],
                    $baris[$kolom['kunci']] ?? '',
                );
            }
        }

        $barisTerakhir = $barisHeader + count($data['baris']);

        if (count($data['baris']) > 0) {
            $sheet->getStyle([1, $barisHeader, $jumlahKolom, $barisTerakhir])
                ->getBorders()
                ->getAllBorders()
                ->setBorderStyle(Border::BORDER_THIN)
                ->getColor()->setRGB('D9DDE5');

            $sheet->setAutoFilter([1, $barisHeader, $jumlahKolom, $barisTerakhir]);
        }

        // Baris header dibekukan supaya tetap terlihat saat digulir — tabel
        // export bisa ratusan baris.
        $sheet->freezePane([1, $barisHeader + 1]);

        for ($kolom = 1; $kolom <= $jumlahKolom; $kolom++) {
            $sheet->getColumnDimensionByColumn($kolom)->setAutoSize(true);
        }

        $this->catatAudit('Excel', $data);

        $namaBerkas = $this->namaBerkas($data, 'xlsx');

        return response()->streamDownload(function () use ($lembar) {
            (new Xlsx($lembar))->save('php://output');
        }, $namaBerkas, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function pdf(Request $request): Response|JsonResponse
    {
        $filter = $this->periksaFilter($request);
        $data = DataExport::susun($request->user(), $filter);

        if ($data['template'] === null) {
            return ApiResponse::error('Tidak ada data untuk diexport.', 422);
        }

        $this->catatAudit('PDF', $data);

        $pdf = Pdf::loadView('export.laporan', [
            'data' => $data,
            'dicetakOleh' => $request->user()->name,
            'dicetakPada' => now()->translatedFormat('d F Y, H.i').' WIB',
        ]);

        // Tabel export lebar; potret akan memotong kolomnya.
        $pdf->setPaper('a4', 'landscape');

        return $pdf->download($this->namaBerkas($data, 'pdf'));
    }

    /**
     * @return array<string, mixed>
     */
    private function periksaFilter(Request $request): array
    {
        return $request->validate([
            'dari' => ['nullable', 'date'],
            'sampai' => ['nullable', 'date', 'after_or_equal:dari'],
            'status' => ['nullable', 'string', 'in:draf,dikirim,ditinjau'],
            'departemen_id' => ['nullable', 'integer', 'exists:departments,id'],
            'pengguna_id' => ['nullable', 'integer', 'exists:users,id'],
            'template_id' => ['nullable', 'integer', 'exists:report_templates,id'],
        ], attributes: [
            'dari' => 'tanggal mulai',
            'sampai' => 'tanggal akhir',
            'departemen_id' => 'departemen',
            'pengguna_id' => 'penyusun',
            'template_id' => 'template',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function namaBerkas(array $data, string $ekstensi): string
    {
        // Nama berkas tetap teknis — dikecualikan dari aturan format tanggal
        // Bahasa Indonesia (CLAUDE.md).
        $dari = str_replace('-', '', $data['rentang']['dari']);
        $sampai = str_replace('-', '', $data['rentang']['sampai']);

        return "DAMS_{$data['template']['kode']}_{$dari}_{$sampai}.{$ekstensi}";
    }

    /**
     * Export dicatat di jejak audit.
     *
     * Berkas export membawa data keluar dari sistem; siapa mengambil apa dan
     * kapan harus dapat ditelusuri (non-fungsional §11).
     *
     * @param  array<string, mixed>  $data
     */
    private function catatAudit(string $bentuk, array $data): void
    {
        Audit::catat(
            'diexport',
            Audit::MODUL_LAPORAN,
            "Mengexport {$data['jumlah_laporan']} laporan ke {$bentuk}",
            null,
            [
                'bentuk' => $bentuk,
                'template' => $data['template']['kode'] ?? null,
                'rentang' => $data['rentang']['dari'].' s.d. '.$data['rentang']['sampai'],
                'jumlah_baris' => $data['jumlah_baris'],
            ],
        );
    }
}
