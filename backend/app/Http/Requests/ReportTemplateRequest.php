<?php

namespace App\Http\Requests;

use App\Models\DailyReportItem;
use App\Models\MasterType;
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
        /*
         * `code` sengaja tidak divalidasi dan tidak diterima dari klien.
         * Kode dibuat otomatis dari nama oleh controller
         * (docs/standar-ui-ux.md §1.5), dan tidak pernah berubah setelah
         * templatenya ada.
         */
        return [
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            // Kosong berarti template berlaku lintas departemen.
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
            'bentuk_pengisian' => ['sometimes', 'string', Rule::in(['grid', 'baris'])],

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
            'fields.*.desimal' => ['nullable', 'integer', 'min:0', 'max:4'],
            'fields.*.master_type_id' => ['nullable', 'integer', 'exists:master_types,id'],
            'fields.*.master_induk_key' => ['nullable', 'string', 'max:64'],
            'fields.*.beku' => ['sometimes', 'boolean'],
            'fields.*.tampilan' => ['nullable', 'string', 'max:24'],
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

                /*
                 * Kolom berkunci `status` disalin ke `daily_report_items
                 * .progress_status` yang terindeks, dan hanya bila tipenya
                 * pilihan (`ValidasiIsianTemplate::statusBaris()`). Mengubah
                 * tipenya membuat Monitoring berhenti menyaring — tanpa galat,
                 * tanpa ada yang memberi tahu. Ditolak di sini.
                 */
                if (
                    ($field['key'] ?? null) === DailyReportItem::KUNCI_STATUS
                    && $tipe !== TemplateField::TIPE_SELECT
                ) {
                    $validator->errors()->add(
                        "fields.{$index}.type",
                        'Kolom Status harus bertipe Pilihan. Monitoring memakai kolom ini '
                        .'untuk menyaring laporan, dan tipe lain membuatnya berhenti bekerja.',
                    );
                }

                $this->periksaKolomMaster($validator, $index, $field, $tipe);

                // Angka di belakang koma hanya berarti pada kolom desimal.
                // Bilangan bulat selalu nol, dan teks tidak punya koma.
                if ($tipe !== TemplateField::TIPE_DECIMAL && ($field['desimal'] ?? null) !== null) {
                    $validator->errors()->add(
                        "fields.{$index}.desimal",
                        'Angka di belakang koma hanya berlaku untuk kolom angka desimal.',
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
     * Aturan khusus kolom yang mengambil pilihannya dari daftar master.
     *
     * @param  array<string, mixed>  $field
     */
    private function periksaKolomMaster(
        Validator $validator,
        int $index,
        array $field,
        string $tipe,
    ): void {
        $jenisId = $field['master_type_id'] ?? null;
        $indukKunci = $field['master_induk_key'] ?? null;

        if ($tipe !== TemplateField::TIPE_MASTER) {
            if ($jenisId !== null) {
                $validator->errors()->add(
                    "fields.{$index}.master_type_id",
                    'Daftar master hanya berlaku untuk kolom bertipe pilihan dari daftar master.',
                );
            }

            return;
        }

        if ($jenisId === null) {
            $validator->errors()->add(
                "fields.{$index}.master_type_id",
                'Daftar master belum dipilih.',
            );

            return;
        }

        $jenis = MasterType::find($jenisId);

        if ($jenis === null) {
            return;
        }

        /*
         * Kolom penyaring hanya masuk akal bila daftarnya memang berinduk, dan
         * kolom yang ditunjuknya harus benar-benar ada pada template yang sama
         * serta mengambil pilihannya dari daftar induk itu. Tanpa pemeriksaan
         * ini, penyaringan gagal diam-diam saat laporan diisi: daftarnya
         * tampil kosong tanpa ada yang menjelaskan kenapa.
         */
        if ($indukKunci === null || $indukKunci === '') {
            return;
        }

        if (! $jenis->berinduk()) {
            $validator->errors()->add(
                "fields.{$index}.master_induk_key",
                "Daftar {$jenis->name} tidak berinduk, jadi kolom penyaringnya harus dikosongkan.",
            );

            return;
        }

        $penyaring = collect($this->input('fields', []))
            ->first(fn ($lain) => ($lain['key'] ?? null) === $indukKunci);

        if ($penyaring === null) {
            $validator->errors()->add(
                "fields.{$index}.master_induk_key",
                'Kolom penyaring tidak ada pada template ini.',
            );

            return;
        }

        if ((int) ($penyaring['master_type_id'] ?? 0) !== (int) $jenis->parent_type_id) {
            $validator->errors()->add(
                "fields.{$index}.master_induk_key",
                'Kolom penyaring harus mengambil pilihannya dari daftar induk.',
            );
        }
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
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
            'fields.required' => 'Template harus punya minimal satu kolom.',
            'fields.min' => 'Template harus punya minimal satu kolom.',
            'fields.*.key.regex' => 'Kunci kolom diawali huruf kecil, hanya huruf kecil, angka, dan garis bawah.',
        ];
    }
}
