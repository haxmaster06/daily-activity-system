<?php

namespace App\Http\Requests;

use App\Models\MasterData;
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
    public function authorize(): bool
    {
        return $this->user()->can('create', MasterData::class);
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
