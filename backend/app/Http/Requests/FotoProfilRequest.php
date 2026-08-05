<?php

namespace App\Http\Requests;

use App\Support\FotoProfil;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

/**
 * Unggahan foto profil sendiri.
 *
 * Otorisasinya cukup "sedang masuk": yang diubah adalah foto pengguna itu
 * sendiri, dan tidak ada jalan mengarahkannya ke akun orang lain — jalurnya
 * selalu disusun dari `$request->user()`.
 */
class FotoProfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'foto' => [
                'required',
                /*
                 * `image` menolak apa pun yang bukan gambar yang dikenali PHP.
                 * `mimes` memeriksa ekstensi yang **ditebak dari isi berkas**,
                 * bukan yang ditulis pengguna; `mimetypes` memeriksa tipe isinya
                 * — dua lapis yang saling menutup, sama seperti lampiran.
                 */
                'image',
                'max:'.(int) (FotoProfil::MAKS_BYTE / 1024),
                'mimes:'.implode(',', FotoProfil::EKSTENSI),
                'mimetypes:'.implode(',', FotoProfil::TIPE_ISI),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['foto' => 'foto profil'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'foto.image' => 'Berkas yang dipilih bukan gambar.',
            'foto.mimes' => 'Jenis gambar tidak diterima. Yang dapat dipakai: '
                .FotoProfil::label().'.',
            'foto.mimetypes' => 'Isi berkas tidak sesuai dengan jenisnya.',
            'foto.max' => 'Ukuran foto paling besar 5 MB.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $berkas = $this->file('foto');

            if (! $berkas instanceof UploadedFile || ! $berkas->isValid()) {
                return;
            }

            /*
             * Gambar berukuran raksasa ditolak sebelum digambar ulang. Berkas
             * PNG 200 KB dapat memuai menjadi lebih dari satu gigabita begitu
             * dimuat ke memori, dan prosesnya mati membawa permintaan lain.
             */
            if (! FotoProfil::ukuranWajar((string) $berkas->getRealPath())) {
                $validator->errors()->add(
                    'foto',
                    'Ukuran gambar terlalu besar untuk diproses. Perkecil dulu, lalu unggah lagi.',
                );
            }
        });
    }
}
