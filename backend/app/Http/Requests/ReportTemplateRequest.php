<?php

namespace App\Http\Requests;

use App\Models\ReportTemplate;
use App\Models\TemplateField;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReportTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $template = $this->route('template');

        return $template instanceof ReportTemplate
            ? $this->user()->can('update', $template)
            : $this->user()->can('create', ReportTemplate::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $template = $this->route('template');
        $id = $template instanceof ReportTemplate ? $template->id : null;

        return [
            'code' => [
                'required', 'string', 'max:48', 'regex:/^[A-Z0-9_]+$/',
                Rule::unique('report_templates', 'code')->ignore($id),
            ],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            // Kosong berarti template berlaku lintas departemen.
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],

            'fields' => ['required', 'array', 'min:1', 'max:60'],
            'fields.*.key' => ['required', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]*$/'],
            'fields.*.label' => ['required', 'string', 'max:100'],
            'fields.*.group_label' => ['nullable', 'string', 'max:64'],
            'fields.*.type' => ['required', 'string', Rule::in(array_keys(TemplateField::TIPE))],
            'fields.*.is_required' => ['sometimes', 'boolean'],
            'fields.*.unit' => ['nullable', 'string', 'max:16'],
            'fields.*.placeholder' => ['nullable', 'string', 'max:100'],
            'fields.*.help_text' => ['nullable', 'string', 'max:255'],
            'fields.*.options' => ['nullable', 'array', 'max:50'],
            'fields.*.options.*.nilai' => ['required_with:fields.*.options', 'string', 'max:64'],
            'fields.*.options.*.label' => ['required_with:fields.*.options', 'string', 'max:100'],
            'fields.*.lookup_source' => [
                'nullable', 'string',
                Rule::in(array_keys(TemplateField::SUMBER_LOOKUP)),
            ],
            'fields.*.computed_from' => ['nullable', 'string', 'max:191'],
            'fields.*.min_value' => ['nullable', 'numeric'],
            'fields.*.max_value' => ['nullable', 'numeric'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var array<int, array<string, mixed>> $fields */
            $fields = $this->input('fields', []);

            $kunciTerpakai = [];

            foreach ($fields as $index => $field) {
                $kunci = $field['key'] ?? null;

                /*
                 * Kunci kolom menjadi penanda data di dalam laporan. Kunci
                 * ganda membuat satu nilai menimpa nilai lain tanpa terlihat.
                 */
                if ($kunci !== null) {
                    if (in_array($kunci, $kunciTerpakai, true)) {
                        $validator->errors()->add(
                            "fields.{$index}.key",
                            'Kunci kolom sudah dipakai kolom lain pada template ini.',
                        );
                    }
                    $kunciTerpakai[] = $kunci;
                }

                $tipe = $field['type'] ?? null;

                // Kolom pilihan tanpa daftar pilihan tidak dapat diisi.
                if ($tipe === TemplateField::TIPE_SELECT && empty($field['options'])) {
                    $validator->errors()->add(
                        "fields.{$index}.options",
                        'Kolom bertipe Pilihan harus punya minimal satu pilihan.',
                    );
                }

                // Satuan dan batas nilai hanya bermakna pada kolom angka.
                $tipeAngka = in_array(
                    $tipe,
                    [TemplateField::TIPE_INTEGER, TemplateField::TIPE_DECIMAL],
                    true,
                );

                if (! $tipeAngka && ! empty($field['unit'])) {
                    $validator->errors()->add(
                        "fields.{$index}.unit",
                        'Satuan hanya berlaku untuk kolom angka.',
                    );
                }

                $min = $field['min_value'] ?? null;
                $max = $field['max_value'] ?? null;

                if ($min !== null && $max !== null && (float) $min > (float) $max) {
                    $validator->errors()->add(
                        "fields.{$index}.max_value",
                        'Nilai maksimum tidak boleh lebih kecil daripada nilai minimum.',
                    );
                }

                /*
                 * Rumus hanya boleh menyebut kunci kolom yang ada pada
                 * template yang sama. Rumus yang menunjuk kolom tak dikenal
                 * akan gagal diam-diam saat laporan diisi.
                 */
                $rumus = $field['computed_from'] ?? null;

                if ($rumus !== null && $rumus !== '') {
                    if (! $tipeAngka) {
                        $validator->errors()->add(
                            "fields.{$index}.computed_from",
                            'Kolom hitungan harus bertipe angka.',
                        );

                        continue;
                    }

                    $seluruhKunci = array_column($fields, 'key');
                    preg_match_all('/[a-z][a-z0-9_]*/', $rumus, $cocok);

                    $tidakDikenal = array_diff(
                        array_unique($cocok[0]),
                        $seluruhKunci,
                    );

                    if ($tidakDikenal !== []) {
                        $validator->errors()->add(
                            "fields.{$index}.computed_from",
                            'Rumus menyebut kolom yang tidak ada: '
                            .implode(', ', $tidakDikenal).'.',
                        );
                    }

                    if (in_array($kunci, $cocok[0], true)) {
                        $validator->errors()->add(
                            "fields.{$index}.computed_from",
                            'Rumus tidak boleh menghitung kolomnya sendiri.',
                        );
                    }
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'code' => 'kode template',
            'name' => 'nama template',
            'description' => 'keterangan',
            'department_id' => 'departemen',
            'fields' => 'daftar kolom',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex' => 'Kode hanya boleh berisi huruf kapital, angka, dan garis bawah.',
            'fields.required' => 'Template harus punya minimal satu kolom.',
            'fields.min' => 'Template harus punya minimal satu kolom.',
            'fields.*.key.regex' => 'Kunci kolom diawali huruf kecil, hanya huruf kecil, angka, dan garis bawah.',
        ];
    }
}
