<?php

namespace App\Http\Requests;

use App\Models\Attachment;
use App\Models\DailyReport;
use App\Support\JenisLampiran;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

class LampiranRequest extends FormRequest
{
    public function authorize(): bool
    {
        $laporan = $this->route('laporan');

        return $laporan instanceof DailyReport
            && $this->user()->can('create', [Attachment::class, $laporan]);
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
                'max:'.(int) (JenisLampiran::MAKS_BYTE / 1024),

                /*
                 * `mimes` memeriksa ekstensi yang **ditebak dari isi berkas**,
                 * bukan ekstensi yang ditulis pengguna. Berkas skrip yang
                 * dinamai ulang menjadi .jpg gagal di sini.
                 */
                'mimes:'.implode(',', JenisLampiran::ekstensi()),

                // Tipe isi diperiksa terpisah: dua lapis yang saling menutup.
                'mimetypes:'.implode(',', JenisLampiran::tipeIsi()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['berkas' => 'lampiran'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'berkas.mimes' => 'Jenis berkas tidak diterima. Yang dapat dilampirkan: '
                .JenisLampiran::label().'.',
            'berkas.mimetypes' => 'Isi berkas tidak sesuai dengan jenisnya.',
            'berkas.max' => 'Ukuran lampiran paling besar 10 MB.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $berkas = $this->file('berkas');

            if (! $berkas instanceof UploadedFile || ! $berkas->isValid()) {
                return;
            }

            /*
             * Ekstensi yang ditulis pengguna harus cocok dengan isi berkasnya.
             * Aturan bawaan menerima .docx berisi PDF karena keduanya ada di
             * daftar; padahal berkas semacam itu selalu salah, dan hampir
             * selalu disengaja.
             */
            if (! JenisLampiran::cocok(
                (string) $berkas->getClientOriginalExtension(),
                (string) $berkas->getMimeType(),
            )) {
                $validator->errors()->add(
                    'berkas',
                    'Isi berkas tidak sesuai dengan ekstensinya.',
                );
            }

            $laporan = $this->route('laporan');

            if (
                $laporan instanceof DailyReport
                && $laporan->attachments()->count() >= JenisLampiran::MAKS_PER_LAPORAN
            ) {
                $validator->errors()->add(
                    'berkas',
                    'Satu laporan paling banyak memuat '
                        .JenisLampiran::MAKS_PER_LAPORAN.' lampiran.',
                );
            }
        });
    }
}
