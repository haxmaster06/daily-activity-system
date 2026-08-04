<?php

namespace Database\Seeders;

use App\Models\MasterData;
use App\Models\MasterType;
use Illuminate\Database\Seeder;

/**
 * Daftar master bawaan.
 *
 * Idempotent: `updateOrCreate`, tidak pernah `truncate` (ADR-008). Aman
 * dijalankan berulang.
 *
 * Hanya **Satuan** yang diisi. Supplier, Customer, Produk, dan LOT dibuat
 * kosong: isinya milik klien, dan repository ini publik. Administrator
 * mengisinya lewat layar.
 */
class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $satuan = $this->jenis(self::SATUAN);

        foreach (self::ISI_SATUAN as $urutan => [$kode, $nama]) {
            MasterData::updateOrCreate(
                ['master_type_id' => $satuan->id, 'code' => $kode],
                ['name' => $nama, 'sort_order' => $urutan, 'is_active' => true],
            );
        }

        // Jenis yang dirujuk penyusun template sejak sebelum ada master data.
        // Dibuat kosong supaya kolom lama punya tempat bersandar.
        $supplier = $this->jenis(self::SUPPLIER);
        $this->jenis(self::CUSTOMER);
        $this->jenis(self::PRODUK);

        // LOT berinduk Supplier: memilih supplier menyempitkan daftar LOT
        // (docs/standar-ui-ux.md §1.2).
        $this->jenis(self::LOT, $supplier->id);
    }

    private const SATUAN = ['satuan', 'Satuan', 'Satuan ukur untuk kolom angka.'];

    private const SUPPLIER = ['supplier', 'Supplier', 'Daftar pemasok.'];

    private const CUSTOMER = ['customer', 'Customer', 'Daftar pelanggan.'];

    private const PRODUK = ['produk', 'Produk', 'Daftar produk dan bahan.'];

    private const LOT = ['lot', 'Nomor LOT', 'Nomor LOT, menyempit mengikuti supplier.'];

    /** Satuan generik — bukan data klien. */
    private const ISI_SATUAN = [
        ['kg', 'Kilogram (kg)'],
        ['gram', 'Gram (g)'],
        ['ton', 'Ton'],
        ['liter', 'Liter (L)'],
        ['pcs', 'Pieces (pcs)'],
        ['box', 'Box'],
        ['karton', 'Karton'],
        ['sak', 'Sak'],
        ['meter', 'Meter (m)'],
        ['persen', 'Persen (%)'],
    ];

    /**
     * @param  array{0: string, 1: string, 2: string}  $definisi
     */
    private function jenis(array $definisi, ?int $indukId = null): MasterType
    {
        [$slug, $nama, $keterangan] = $definisi;

        $jenis = MasterType::updateOrCreate(
            ['slug' => $slug],
            ['name' => $nama, 'description' => $keterangan, 'parent_type_id' => $indukId],
        );

        // `is_system` sengaja di luar fillable — hanya seeder yang menandainya.
        $jenis->forceFill(['is_system' => true])->save();

        return $jenis;
    }
}
