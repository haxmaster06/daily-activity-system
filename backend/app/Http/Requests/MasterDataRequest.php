<?php

namespace App\Http\Requests;

use App\Models\MasterData;
use App\Models\MasterType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MasterDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        $baris = $this->route('item');

        if ($baris instanceof MasterData) {
            return $this->user()->can('update', $baris);
        }

        /*
         * Jenisnya ikut disertakan, bukan hanya kelasnya. Pembatasan
         * pengelolaan bergantung pada departemen pengelola jenis itu — tanpa
         * menyebutkannya, `create` tidak punya apa pun untuk ditimbang selain
         * izin, dan seluruh pembatasan departemen menguap pada jalur tambah.
         */
        $jenis = $this->route('jenis');

        return $this->user()->can('create', [MasterData::class, $jenis instanceof MasterType ? $jenis : null]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $baris = $this->route('item');
        $id = $baris instanceof MasterData ? $baris->id : null;
        $jenis = $this->jenis();

        // `code` tidak diterima dari klien — dibuat controller dari nama (§1.3).
        return [
            'name' => [
                'required', 'string', 'max:150',
                Rule::unique('master_data', 'name')
                    ->where('master_type_id', $jenis?->id)
                    ->ignore($id),
            ],
            'parent_id' => ['nullable', 'integer', 'exists:master_data,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $jenis = $this->jenis();

            if (! $jenis instanceof MasterType) {
                return;
            }

            $indukId = $this->input('parent_id');

            /*
             * Induk wajib ada bila jenisnya berinduk, dan wajib kosong bila
             * tidak. Ini yang ditegakkan di sini alih-alih lewat CHECK
             * constraint: MySQL di bawah 8.0.16 mengabaikan CHECK diam-diam,
             * sehingga aturan yang ditulis di sana hanya terlihat dijaga.
             */
            if (! $jenis->berinduk()) {
                if ($indukId !== null) {
                    $validator->errors()->add(
                        'parent_id',
                        "Daftar {$jenis->name} tidak berinduk, jadi induknya harus dikosongkan.",
                    );
                }

                return;
            }

            if ($indukId === null) {
                $validator->errors()->add('parent_id', 'Induk wajib dipilih.');

                return;
            }

            $induk = MasterData::find($indukId);

            if ($induk === null || $induk->master_type_id !== $jenis->parent_type_id) {
                $validator->errors()->add(
                    'parent_id',
                    'Induk yang dipilih bukan berasal dari daftar induk yang benar.',
                );
            }
        });
    }

    public function jenis(): ?MasterType
    {
        $jenis = $this->route('jenis');

        return $jenis instanceof MasterType ? $jenis : null;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'parent_id' => 'induk',
            'description' => 'keterangan',
            'is_active' => 'status',
        ];
    }
}
