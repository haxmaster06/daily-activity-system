<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Support\KatalogIzin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $peran = $this->route('role');

        return $peran instanceof Role
            ? $this->user()->can('update', $peran)
            : $this->user()->can('create', Role::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $peran = $this->route('role');

        return [
            'name' => [
                'required', 'string', 'max:64',
                Rule::unique('roles', 'name')->ignore($peran?->getKey()),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'scope_level_default' => ['nullable', 'integer', 'in:1,2,3'],

            /*
             * Izin dikirim sebagai kunci, bukan id — kuncinya tetap sama di
             * seluruh environment, sedangkan id berbeda-beda.
             */
            'izin' => ['present', 'array'],
            'izin.*' => ['string', Rule::in(KatalogIzin::kunci())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama peran',
            'description' => 'keterangan',
            'scope_level_default' => 'jangkauan data bawaan',
            'izin' => 'hak akses',
            'izin.*' => 'hak akses',
        ];
    }
}
