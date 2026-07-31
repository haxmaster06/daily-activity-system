<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Support\KatalogIzin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Perubahan hak akses beberapa peran sekaligus, dari layar matriks.
 */
class MatriksIzinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Role::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'perubahan' => ['required', 'array', 'min:1'],
            'perubahan.*.role_id' => ['required', 'integer', 'exists:roles,id'],

            // `present` bukan `required`: peran boleh berakhir tanpa hak akses
            // sama sekali, dan array kosong adalah cara menyatakannya.
            'perubahan.*.izin' => ['present', 'array'],
            'perubahan.*.izin.*' => ['string', Rule::in(KatalogIzin::kunci())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'perubahan' => 'perubahan hak akses',
            'perubahan.*.role_id' => 'peran',
            'perubahan.*.izin' => 'hak akses',
            'perubahan.*.izin.*' => 'hak akses',
        ];
    }
}
