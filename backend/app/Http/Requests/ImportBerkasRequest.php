<?php

namespace App\Http\Requests;

use App\Models\DailyReport;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\ReportTemplate;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Berkas import yang diunggah pengguna.
 *
 * Pembatasannya sengaja ketat. Berkas ini dibaca pustaka pengurai yang rumit,
 * dan tiap format tambahan yang diterima memperluas permukaan serangannya tanpa
 * menambah kegunaan — `.xlsx` sudah yang dihasilkan tombol unduh template.
 */
class ImportBerkasRequest extends FormRequest
{
    /**
     * Yang diperiksa adalah izin membuat data yang akan dihasilkan berkasnya.
     *
     * Dipilih dari rute, bukan ditetapkan satu kali: berkas ini dipakai dua
     * import yang berbeda, dan memeriksa izin master pada import laporan akan
     * menutup fitur itu bagi Staf — yang justru satu-satunya orang yang
     * mengisinya.
     */
    public function authorize(): bool
    {
        if ($this->route('template') instanceof ReportTemplate) {
            return $this->user()->can('create', DailyReport::class);
        }

        /*
         * Import daftar master menciptakan isi pada satu jenis tertentu, jadi
         * ia tunduk pada batas yang sama dengan menambah satu per satu:
         * jenisnya ikut ditimbang, bukan hanya izinnya. Tanpa ini, pembatasan
         * departemen dapat ditembus cukup dengan mengunggah berkas.
         */
        $jenis = $this->route('jenis');

        return $this->user()->can('create', [MasterData::class, $jenis instanceof MasterType ? $jenis : null]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'berkas' => [
                'required',
                'file',
                // `mimes` memeriksa isi berkasnya, bukan hanya namanya.
                'mimes:xlsx,xls',
                'max:5120',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'berkas.required' => 'Berkas belum dipilih.',
            'berkas.mimes' => 'Berkas harus berupa Excel (.xlsx atau .xls).',
            'berkas.max' => 'Ukuran berkas melebihi 5 MB.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['berkas' => 'berkas'];
    }
}
