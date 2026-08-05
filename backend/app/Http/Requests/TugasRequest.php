<?php

namespace App\Http\Requests;

use App\Models\Tugas;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TugasRequest extends FormRequest
{
    public function authorize(): bool
    {
        $tugas = $this->route('tugas');

        return $tugas instanceof Tugas
            ? $this->user()->can('update', $tugas)
            : $this->user()->can('create', Tugas::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'penanggung_jawab_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['sometimes', 'string', Rule::in(array_keys(Tugas::STATUS))],
            'prioritas' => ['nullable', 'string', Rule::in(array_keys(Tugas::PRIORITAS))],
            'target_selesai' => ['nullable', 'date'],
            // Laporan yang menjadi bukti pengerjaannya.
            'laporan_id' => ['sometimes', 'array', 'max:30'],
            'laporan_id.*' => ['integer', 'exists:daily_reports,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $pengguna = $this->user();
            $departemenId = $this->integer('department_id');
            $jangkauan = $pengguna->jangkauan();

            /*
             * Jangkauan Pribadi boleh membuat kartu di departemennya sendiri.
             *
             * `mencakupDepartemen()` selalu bernilai salah pada tingkat
             * Pribadi — daftar departemennya memang kosong. Tanpa pengecualian
             * ini, Staf tidak dapat membuat satu kartu pun, padahal memasukkan
             * progres harian justru pekerjaan mereka dan izin `tugas.kelola`
             * sudah menjadi bawaannya. Laporan harian memakai aturan yang
             * sama: `department_id` disalin dari departemen penyusunnya.
             */
            $departemenSendiri = $pengguna->department_id !== null
                && (int) $pengguna->department_id === $departemenId;

            /*
             * Membuat kartu di departemen lain sama saja menembus jangkauan
             * data lewat pintu belakang: kartunya tidak terlihat oleh
             * pembuatnya, tetapi terhitung pada Analytics departemen itu.
             */
            if (! $jangkauan->korporat() && ! $departemenSendiri && ! $jangkauan->mencakupDepartemen($departemenId)) {
                $validator->errors()->add(
                    'department_id',
                    'Departemen tersebut di luar jangkauan Anda.',
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'title' => 'judul',
            'description' => 'keterangan',
            'department_id' => 'departemen',
            'penanggung_jawab_id' => 'penanggung jawab',
            'target_selesai' => 'target selesai',
        ];
    }
}
