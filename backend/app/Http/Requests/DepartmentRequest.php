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

        return [
            'code' => [
                'required', 'string', 'max:32',
                // Kode dipakai sebagai penanda tetap di seeder dan template.
                'regex:/^[A-Z0-9_]+$/',
                Rule::unique('departments', 'code')->ignore($id),
            ],
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('departments', 'name')->ignore($id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'code' => 'kode',
            'name' => 'nama departemen',
            'description' => 'keterangan',
            'is_active' => 'status',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex' => 'Kode hanya boleh berisi huruf kapital, angka, dan garis bawah.',
        ];
    }
}
