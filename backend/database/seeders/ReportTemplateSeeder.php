<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\ReportTemplate;
use Illuminate\Database\Seeder;

/**
 * Template laporan awal.
 *
 * Bentuk kolom diambil dari `docs/template-departemen.md`, yang disusun dari
 * berkas acuan klien. Hanya nama kolom dan tipe data — tidak ada satu pun
 * nilai data asli di berkas ini.
 *
 * Idempotent: memakai `updateOrCreate` pada kode template, dan kolom ditulis
 * ulang hanya bila jumlah atau kuncinya berubah. Administrator yang sudah
 * menyesuaikan template lewat antarmuka tidak akan tertimpa.
 */
class ReportTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->template() as $definisi) {
            $departemen = $definisi['departemen'] === null
                ? null
                : Department::where('code', $definisi['departemen'])->first();

            // Departemen belum ada di master — template-nya dilewati, bukan
            // digagalkan, agar seeder tetap bisa dijalankan sebagian.
            if ($definisi['departemen'] !== null && $departemen === null) {
                $this->command?->warn(
                    "Departemen {$definisi['departemen']} tidak ada. "
                    ."Template {$definisi['kode']} dilewati.",
                );

                continue;
            }

            $template = ReportTemplate::updateOrCreate(
                ['code' => $definisi['kode']],
                [
                    'department_id' => $departemen?->id,
                    'name' => $definisi['nama'],
                    'description' => $definisi['keterangan'] ?? null,
                    'sort_order' => $definisi['urutan'] ?? 0,
                    'is_active' => true,
                ],
            );

            $this->selaraskanKolom($template, $definisi['kolom']);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $kolom
     */
    private function selaraskanKolom(ReportTemplate $template, array $kolom): void
    {
        $kunciBaru = array_column($kolom, 'kunci');
        $kunciLama = $template->fields()->pluck('key')->all();

        // Susunan kolom tidak berubah — biarkan penyesuaian administrator.
        if ($kunciLama === $kunciBaru) {
            return;
        }

        $template->fields()->delete();

        foreach (array_values($kolom) as $urutan => $field) {
            $template->fields()->create([
                'key' => $field['kunci'],
                'label' => $field['label'],
                'group_label' => $field['grup'] ?? null,
                'type' => $field['tipe'],
                'is_required' => $field['wajib'] ?? false,
                'sort_order' => $urutan,
                'unit' => $field['satuan'] ?? null,
                'help_text' => $field['bantuan'] ?? null,
                'options' => $field['pilihan'] ?? null,
                'lookup_source' => $field['sumber'] ?? null,
                'computed_from' => $field['rumus'] ?? null,
            ]);
        }
    }

    /**
     * Pilihan status yang dipakai berulang.
     *
     * @return array<int, array{nilai: string, label: string}>
     */
    private function opsiStatus(): array
    {
        return [
            ['nilai' => 'belum_mulai', 'label' => 'Belum Mulai'],
            ['nilai' => 'dalam_proses', 'label' => 'Dalam Proses'],
            ['nilai' => 'selesai', 'label' => 'Selesai'],
        ];
    }

    /**
     * @return array<int, array{nilai: string, label: string}>
     */
    private function opsiSatuan(): array
    {
        return [
            ['nilai' => 'kg', 'label' => 'Kilogram (kg)'],
            ['nilai' => 'pcs', 'label' => 'Pieces (pcs)'],
            ['nilai' => 'box', 'label' => 'Box'],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function template(): array
    {
        return [
            [
                'kode' => 'AKTIVITAS_UMUM',
                'nama' => 'Aktivitas Harian',
                'keterangan' => 'Dipakai seluruh departemen yang laporannya berupa daftar aktivitas',
                'departemen' => null,
                'urutan' => 0,
                'kolom' => [
                    ['kunci' => 'aktivitas', 'label' => 'Aktivitas', 'tipe' => 'textarea', 'wajib' => true],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                    [
                        'kunci' => 'target_penyelesaian',
                        'label' => 'Target Penyelesaian',
                        'tipe' => 'text',
                        'bantuan' => 'Boleh berupa tanggal atau keterangan bebas',
                    ],
                    [
                        'kunci' => 'status',
                        'label' => 'Status',
                        'tipe' => 'select',
                        'wajib' => true,
                        'pilihan' => $this->opsiStatus(),
                    ],
                ],
            ],

            [
                'kode' => 'PROD_SPK',
                'nama' => 'SPK & Pemenuhan Order',
                'departemen' => 'PRODUKSI',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'no_spk', 'label' => 'No SPK', 'tipe' => 'text', 'wajib' => true],
                    ['kunci' => 'no_po', 'label' => 'PO#', 'tipe' => 'text'],
                    ['kunci' => 'nama_perusahaan', 'label' => 'Nama Perusahaan', 'tipe' => 'text', 'sumber' => 'customer'],
                    ['kunci' => 'kode_item', 'label' => 'Kode Item', 'tipe' => 'text', 'sumber' => 'produk'],
                    ['kunci' => 'deskripsi', 'label' => 'Deskripsi', 'tipe' => 'textarea'],
                    ['kunci' => 'butuh_pouch', 'label' => 'Pouch', 'grup' => 'QTY Dibutuhkan', 'tipe' => 'integer', 'satuan' => 'pouch'],
                    ['kunci' => 'butuh_box', 'label' => 'Box', 'grup' => 'QTY Dibutuhkan', 'tipe' => 'integer', 'satuan' => 'box'],
                    ['kunci' => 'selesai_pouch', 'label' => 'Pouch', 'grup' => 'QTY Selesai', 'tipe' => 'integer', 'satuan' => 'pouch'],
                    ['kunci' => 'selesai_box', 'label' => 'Box', 'grup' => 'QTY Selesai', 'tipe' => 'integer', 'satuan' => 'box'],
                    ['kunci' => 'kurang_pouch', 'label' => 'Pouch', 'grup' => 'Kekurangan', 'tipe' => 'integer', 'satuan' => 'pouch', 'rumus' => 'butuh_pouch - selesai_pouch'],
                    ['kunci' => 'kurang_box', 'label' => 'Box', 'grup' => 'Kekurangan', 'tipe' => 'integer', 'satuan' => 'box', 'rumus' => 'butuh_box - selesai_box'],
                    ['kunci' => 'tanggal_mulai', 'label' => 'Tanggal Mulai Produksi', 'tipe' => 'date'],
                    ['kunci' => 'tanggal_selesai', 'label' => 'Tanggal Selesai Produksi', 'tipe' => 'date'],
                    ['kunci' => 'tanggal_kirim', 'label' => 'Tanggal Pengiriman', 'tipe' => 'date'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'PROD_PROSES',
                'nama' => 'Proses Harian per LOT',
                'departemen' => 'PRODUKSI',
                'urutan' => 2,
                'kolom' => [
                    ['kunci' => 'tanggal_produksi', 'label' => 'Tanggal Produksi', 'tipe' => 'date', 'wajib' => true],
                    ['kunci' => 'lot', 'label' => 'LOT#', 'tipe' => 'integer', 'wajib' => true, 'sumber' => 'lot'],

                    ['kunci' => 'oven_target', 'label' => 'Target Per Hari', 'grup' => 'Oven', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'oven_masuk', 'label' => 'QTY Masuk', 'grup' => 'Oven', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'oven_keluar', 'label' => 'QTY Keluar', 'grup' => 'Oven', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'oven_waste', 'label' => 'Waste', 'grup' => 'Oven', 'tipe' => 'decimal', 'satuan' => 'kg', 'rumus' => 'oven_masuk - oven_keluar'],

                    ['kunci' => 'ayak_target', 'label' => 'Target Per Hari', 'grup' => 'Ayak', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'ayak_masuk', 'label' => 'QTY Masuk', 'grup' => 'Ayak', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'ayak_qty', 'label' => 'QTY Ayak', 'grup' => 'Ayak', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'ayak_keluar', 'label' => 'QTY Keluar', 'grup' => 'Ayak', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'ayak_brontol', 'label' => 'QTY Brontol', 'grup' => 'Ayak', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'ayak_wip', 'label' => 'Sisa WIP', 'grup' => 'Ayak', 'tipe' => 'decimal', 'satuan' => 'kg'],

                    ['kunci' => 'pack1_target', 'label' => 'Target Per Hari', 'grup' => 'Packing 1', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'pack1_masuk', 'label' => 'QTY Masuk', 'grup' => 'Packing 1', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'pack1_keluar', 'label' => 'QTY Keluar', 'grup' => 'Packing 1', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'pack1_wip', 'label' => 'Sisa WIP', 'grup' => 'Packing 1', 'tipe' => 'decimal', 'satuan' => 'kg'],

                    ['kunci' => 'xray_target', 'label' => 'Target Per Hari', 'grup' => 'Xray', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'xray_masuk', 'label' => 'QTY Masuk', 'grup' => 'Xray', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'xray_keluar', 'label' => 'QTY Keluar', 'grup' => 'Xray', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'xray_reject', 'label' => 'Reject Xray', 'grup' => 'Xray', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'xray_sisa_reject', 'label' => 'Sisa Reject', 'grup' => 'Xray', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'xray_belum_packing', 'label' => 'Sisa Belum Packing', 'grup' => 'Xray', 'tipe' => 'integer', 'satuan' => 'bag'],

                    ['kunci' => 'pack2_target', 'label' => 'Target Per Hari', 'grup' => 'Packing 2', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'pack2_masuk', 'label' => 'QTY Masuk', 'grup' => 'Packing 2', 'tipe' => 'integer', 'satuan' => 'bag'],
                    ['kunci' => 'pack2_keluar', 'label' => 'QTY Keluar', 'grup' => 'Packing 2', 'tipe' => 'integer', 'satuan' => 'box'],
                    ['kunci' => 'pack2_persen', 'label' => 'Target Tercapai', 'grup' => 'Packing 2', 'tipe' => 'integer', 'satuan' => '%'],

                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'QC_LOT',
                'nama' => 'Pemeriksaan Lot',
                'departemen' => 'QC',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'lot', 'label' => 'Lot Product', 'tipe' => 'integer', 'wajib' => true, 'sumber' => 'lot'],
                    ['kunci' => 'qty_masuk', 'label' => 'QTY Masuk', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'qty_halus', 'label' => 'QTY Halus', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'brontol', 'label' => 'Brontol', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'lost', 'label' => 'Lost', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'waste', 'label' => 'Waste', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'sortir', 'label' => 'Sortir', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'benda_asing', 'label' => 'Benda Asing', 'tipe' => 'text'],
                    ['kunci' => 'kadar_air', 'label' => 'Kadar Air Produk', 'tipe' => 'decimal', 'satuan' => '%', 'bantuan' => 'Maksimal 2%'],
                    ['kunci' => 'packing_kg', 'label' => 'QTY Packing', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'packing_box', 'label' => 'QTY Packing', 'tipe' => 'integer', 'satuan' => 'box'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'QC_LOT_XRAY',
                'nama' => 'Pemeriksaan Lot (dengan Xray)',
                'departemen' => 'QC',
                'urutan' => 2,
                'kolom' => [
                    ['kunci' => 'lot', 'label' => 'Lot Product', 'tipe' => 'integer', 'wajib' => true, 'sumber' => 'lot'],
                    ['kunci' => 'qty_masuk', 'label' => 'QTY Masuk', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'qty_halus', 'label' => 'QTY Halus', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'brontol', 'label' => 'Brontol', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'xray_detected', 'label' => 'Xray Detected', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'benda_asing', 'label' => 'Benda Asing', 'tipe' => 'text'],
                    ['kunci' => 'sortir', 'label' => 'Sortir', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'kadar_air', 'label' => 'Kadar Air Produk', 'tipe' => 'decimal', 'satuan' => '%'],
                    ['kunci' => 'suhu_ruangan', 'label' => 'Suhu Ruangan', 'tipe' => 'decimal', 'satuan' => '°C'],
                    ['kunci' => 'kelembapan', 'label' => 'Kelembapan Ruangan', 'tipe' => 'decimal', 'satuan' => '%'],
                    ['kunci' => 'packing_kg', 'label' => 'QTY Packing', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'QC_PENGUJIAN_BB',
                'nama' => 'Pengujian Bahan Baku',
                'departemen' => 'QC',
                'urutan' => 3,
                'kolom' => [
                    ['kunci' => 'supplier', 'label' => 'Supplier', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'supplier'],
                    ['kunci' => 'lot', 'label' => 'LOT', 'tipe' => 'integer', 'sumber' => 'lot'],
                    ['kunci' => 'gluten', 'label' => 'Gluten', 'tipe' => 'text', 'bantuan' => 'Isi nd bila tidak terdeteksi'],
                    ['kunci' => 'sulvit', 'label' => 'Sulvit', 'tipe' => 'text', 'bantuan' => 'Isi nd bila tidak terdeteksi'],
                    ['kunci' => 'refinasi', 'label' => 'Refinasi', 'tipe' => 'text', 'bantuan' => 'Isi nd bila tidak terdeteksi'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'QA_RECEIVING',
                'nama' => 'Receiving Bahan Baku',
                'departemen' => 'QA',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'supplier', 'label' => 'Supplier', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'supplier'],
                    ['kunci' => 'lot', 'label' => 'LOT', 'tipe' => 'text', 'sumber' => 'lot'],
                    ['kunci' => 'total_diterima', 'label' => 'Total Diterima', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'jumlah_reject', 'label' => 'Jumlah Direject', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'DC_DOKUMEN',
                'nama' => 'Aktivitas Document Control',
                'departemen' => 'DOC_CONTROL',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'aktivitas', 'label' => 'Aktivitas', 'tipe' => 'textarea', 'wajib' => true],
                    ['kunci' => 'jenis_dokumen', 'label' => 'Jenis Dokumen', 'tipe' => 'text'],
                    ['kunci' => 'nomor_dokumen', 'label' => 'Nomor Dokumen', 'tipe' => 'text'],
                    ['kunci' => 'revisi_ke', 'label' => 'Revisi Ke-', 'tipe' => 'text'],
                    ['kunci' => 'status_dokumen', 'label' => 'Status Dokumen', 'tipe' => 'text'],
                    ['kunci' => 'klausul', 'label' => 'Klausul', 'tipe' => 'text'],
                    ['kunci' => 'referensi', 'label' => 'Referensi', 'tipe' => 'text'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                    ['kunci' => 'target_penyelesaian', 'label' => 'Target Penyelesaian', 'tipe' => 'text'],
                ],
            ],

            [
                'kode' => 'WH_RAW',
                'nama' => 'Raw Material',
                'departemen' => 'WAREHOUSE',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'lot', 'label' => 'LOT#', 'tipe' => 'text', 'sumber' => 'lot'],
                    ['kunci' => 'supplier', 'label' => 'Supplier', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'supplier'],
                    ['kunci' => 'qty', 'label' => 'QTY', 'tipe' => 'decimal', 'wajib' => true],
                    ['kunci' => 'satuan', 'label' => 'Satuan', 'tipe' => 'select', 'wajib' => true, 'pilihan' => $this->opsiSatuan()],
                ],
            ],

            [
                'kode' => 'WH_SHIPPING',
                'nama' => 'Shipping',
                'departemen' => 'WAREHOUSE',
                'urutan' => 2,
                'kolom' => [
                    ['kunci' => 'customer', 'label' => 'Customer', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'customer'],
                    ['kunci' => 'produk', 'label' => 'Produk', 'tipe' => 'text', 'sumber' => 'produk'],
                    ['kunci' => 'qty', 'label' => 'QTY', 'tipe' => 'decimal', 'wajib' => true],
                    ['kunci' => 'satuan', 'label' => 'Satuan', 'tipe' => 'select', 'wajib' => true, 'pilihan' => $this->opsiSatuan()],
                ],
            ],

            [
                'kode' => 'PO_SUPPLIER',
                'nama' => 'Purchase Order',
                'departemen' => 'PURCHASING',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'supplier', 'label' => 'Supplier', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'supplier'],
                    ['kunci' => 'kode_po', 'label' => 'Kode PO', 'tipe' => 'text', 'wajib' => true],
                    ['kunci' => 'qty_po', 'label' => 'QTY PO', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'etd', 'label' => 'ETD', 'tipe' => 'date'],
                    ['kunci' => 'eta', 'label' => 'ETA', 'tipe' => 'date'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'EXIM_SHIPMENT',
                'nama' => 'Rencana Pengiriman',
                'departemen' => 'EXIM',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'perusahaan', 'label' => 'Nama Perusahaan', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'customer'],
                    ['kunci' => 'kapasitas', 'label' => 'Kapasitas Kirim', 'tipe' => 'decimal', 'satuan' => 'kg'],
                    ['kunci' => 'etd', 'label' => 'ETD', 'tipe' => 'date'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'HRD_TRAINING',
                'nama' => 'Training & MCU',
                'departemen' => 'HRD',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'kegiatan', 'label' => 'Training / MCU', 'tipe' => 'text', 'wajib' => true],
                    ['kunci' => 'bulan', 'label' => 'Bulan', 'tipe' => 'month'],
                    ['kunci' => 'estimasi', 'label' => 'Estimasi Pelaksanaan', 'tipe' => 'text'],
                    ['kunci' => 'program', 'label' => 'Program', 'tipe' => 'text'],
                    ['kunci' => 'perkembangan', 'label' => 'Perkembangan', 'tipe' => 'textarea'],
                    ['kunci' => 'target_penyelesaian', 'label' => 'Target Penyelesaian', 'tipe' => 'month'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],

            [
                'kode' => 'IT_PENGEMBANGAN',
                'nama' => 'Pengembangan Sistem',
                'departemen' => 'IT',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'aktivitas', 'label' => 'Aktivitas', 'tipe' => 'textarea', 'wajib' => true],
                    ['kunci' => 'fitur', 'label' => 'Fitur', 'tipe' => 'text'],
                    ['kunci' => 'modul', 'label' => 'Modul', 'tipe' => 'text'],
                    ['kunci' => 'fase', 'label' => 'Fase', 'tipe' => 'text'],
                    [
                        'kunci' => 'status',
                        'label' => 'Status',
                        'tipe' => 'select',
                        'wajib' => true,
                        'pilihan' => $this->opsiStatus(),
                    ],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                    ['kunci' => 'target_penyelesaian', 'label' => 'Target Penyelesaian', 'tipe' => 'text'],
                ],
            ],

            [
                'kode' => 'RETAIL_KIRIM',
                'nama' => 'Pengiriman Retail',
                'departemen' => 'RETAIL_MND',
                'urutan' => 1,
                'kolom' => [
                    ['kunci' => 'nama_barang', 'label' => 'Nama Barang', 'tipe' => 'text', 'wajib' => true, 'sumber' => 'produk'],
                    ['kunci' => 'qty', 'label' => 'QTY', 'tipe' => 'decimal', 'wajib' => true],
                    ['kunci' => 'satuan', 'label' => 'Satuan', 'tipe' => 'select', 'wajib' => true, 'pilihan' => $this->opsiSatuan()],
                    ['kunci' => 'jumlah_karton', 'label' => 'Jumlah Karton', 'tipe' => 'integer'],
                    ['kunci' => 'customer', 'label' => 'Customer', 'tipe' => 'text', 'sumber' => 'customer'],
                    ['kunci' => 'tanggal_kirim', 'label' => 'Tanggal Kirim', 'tipe' => 'date'],
                    ['kunci' => 'tujuan', 'label' => 'Tujuan', 'tipe' => 'text'],
                    ['kunci' => 'keterangan', 'label' => 'Keterangan', 'tipe' => 'textarea'],
                ],
            ],
        ];
    }
}
