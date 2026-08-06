<?php

namespace App\Http\Requests;

use App\Models\Department;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $departemen = $this->route('department');

        return $departemen instanceof Department
            ? $this->user()->can('update', $departemen)
            : $this->user()->can('create', Department::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $departemen = $this->route('department');
        $id = $departemen instanceof Department ? $departemen->id : null;

        /*
         * `code` sengaja tidak divalidasi dan tidak diterima dari klien.
         * Kode dibuat otomatis dari nama oleh controller
         * (docs/standar-ui-ux.md §1.5), dan tidak pernah berubah setelah
         * departemennya ada.
         */
        return [
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('departments', 'name')->ignore($id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'wajib_lapor' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama departemen',
            'description' => 'keterangan',
            'is_active' => 'status',
            'wajib_lapor' => 'kewajiban mengisi laporan',
        ];
    }
}
