<?php

namespace App\Http\Requests;

use App\Models\MasterType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MasterTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $jenis = $this->route('jenis');

        return $jenis instanceof MasterType
            ? $this->user()->can('update', $jenis)
            : $this->user()->can('create', MasterType::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $jenis = $this->route('jenis');
        $id = $jenis instanceof MasterType ? $jenis->id : null;

        // `slug` tidak diterima dari klien — dibuat controller dari nama (§1.3).
        return [
            'departemen_id' => ['sometimes', 'array'],
            'departemen_id.*' => ['integer', 'exists:departments,id'],
            'name' => [
                'required', 'string', 'max:64',
                Rule::unique('master_types', 'name')->ignore($id),
            ],
            'parent_type_id' => ['nullable', 'integer', 'exists:master_types,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $jenis = $this->route('jenis');
            $induk = $this->input('parent_type_id');

            if (! $jenis instanceof MasterType || $induk === null) {
                return;
            }

            /*
             * Jenis tidak boleh menjadi induk dirinya sendiri, langsung maupun
             * melingkar. Rantai yang melingkar membuat penyempitan daftar
             * berputar tanpa henti saat laporan diisi.
             */
            $ditelusuri = MasterType::find($induk);

            for ($langkah = 0; $ditelusuri !== null && $langkah < 20; $langkah++) {
                if ($ditelusuri->id === $jenis->id) {
                    $validator->errors()->add(
                        'parent_type_id',
                        'Jenis daftar tidak boleh menjadi induk dirinya sendiri.',
                    );

                    return;
                }

                $ditelusuri = $ditelusuri->induk;
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama daftar',
            'parent_type_id' => 'daftar induk',
            'description' => 'keterangan',
        ];
    }
}
