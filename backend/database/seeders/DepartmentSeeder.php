<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

/**
 * Master departemen.
 *
 * Daftar disusun dari PRD §4 ditambah temuan pada berkas klien di `Klien_Data/`
 * (Document Control, Admin Keuangan MTN, ICS/Organic) dan `Requirement1.docx`
 * (EX/IM, Retail MND, GA Legal).
 *
 * Seeder idempotent — memakai `updateOrCreate` dan tidak pernah menghapus
 * departemen yang sudah ada, karena laporan lama merujuk padanya.
 */
class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['code' => 'PRODUKSI', 'name' => 'Produksi', 'description' => 'SPK, proses oven hingga packing, dan target produksi harian'],
            ['code' => 'QA', 'name' => 'QA', 'description' => 'Receiving bahan baku, pengujian, dan dokumen compliance'],
            ['code' => 'QC', 'name' => 'QC', 'description' => 'Pemeriksaan lot, kontrol proses, dan pengujian bahan baku'],
            ['code' => 'FINANCE', 'name' => 'Finance & Accounting', 'description' => 'Aktivitas keuangan dan akuntansi'],
            ['code' => 'ADM_KEUANGAN', 'name' => 'Admin Keuangan', 'description' => 'Pembukuan, petty cash, dan realisasi uang tugas'],
            ['code' => 'HRD', 'name' => 'HRD', 'description' => 'Training, MCU, dan administrasi kepegawaian'],
            ['code' => 'PURCHASING', 'name' => 'Purchasing', 'description' => 'Pengadaan, PO supplier, ETD dan ETA'],
            ['code' => 'WAREHOUSE', 'name' => 'Warehouse', 'description' => 'Bahan baku, packaging, finish good, receiving, dan shipping'],
            ['code' => 'DOC_CONTROL', 'name' => 'Document Control', 'description' => 'Pengendalian dokumen, revisi, dan klausul standar'],
            ['code' => 'MAINTENANCE', 'name' => 'Maintenance', 'description' => 'Perawatan mesin dan sarana produksi'],
            ['code' => 'EXIM', 'name' => 'EX/IM', 'description' => 'Ekspor impor dan jadwal pengiriman'],
            ['code' => 'ICS', 'name' => 'ICS / Organic', 'description' => 'Inspeksi petani dan pengendalian internal sertifikasi organik'],
            ['code' => 'RETAIL_MND', 'name' => 'Retail MND', 'description' => 'Pengiriman produk retail ke customer'],
            ['code' => 'GA_LEGAL', 'name' => 'GA Legal', 'description' => 'General affair dan legal'],
            ['code' => 'IT', 'name' => 'IT', 'description' => 'Pengembangan sistem dan dukungan teknis'],
            ['code' => 'MARKETING', 'name' => 'Marketing', 'description' => 'Pemasaran dan hubungan pelanggan'],
            ['code' => 'MEDSOS', 'name' => 'Media Sosial', 'description' => 'Pengelolaan konten media sosial'],
        ];

        foreach ($departments as $department) {
            Department::updateOrCreate(
                ['code' => $department['code']],
                $department + ['is_active' => true],
            );
        }
    }
}
