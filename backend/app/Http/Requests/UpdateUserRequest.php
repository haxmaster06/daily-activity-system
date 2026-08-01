<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MenerimaPenetapanRole;
use App\Models\User;
use App\Rules\BukanDepartemenSistem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    use MenerimaPenetapanRole;

    public function authorize(): bool
    {
        $target = $this->route('user');

        return $target instanceof User && $this->user()->can('update', $target);
    }

    /**
     * Kata sandi tidak diubah lewat jalur ini — ada endpoint tersendiri
     * (`atur-ulang-kata-sandi`) agar tindakan itu tercatat terpisah di audit.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var User $target */
        $target = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($target->id),
            ],
            'department_id' => [
                'required', 'integer', 'exists:departments,id',

                /*
                 * Akun sistem dikecualikan: departemennya memang departemen
                 * sistem. Tanpa pengecualian ini, menyunting nama atau email
                 * akun itu ditolak karena departemennya sendiri dianggap
                 * pilihan terlarang — dan tidak ada pilihan lain yang sah
                 * untuknya.
                 */
                ...($target->is_system ? [] : [new BukanDepartemenSistem]),
            ],

            // Boleh tidak disertakan: penetapan peran punya layarnya sendiri.
            ...$this->aturanPenetapan(wajib: false),
        ];
    }

    /**
     * Kolom milik tabel users saja — penetapan peran disimpan terpisah.
     *
     * @return array<string, mixed>
     */
    public function atributPengguna(): array
    {
        return $this->safe()->only(['name', 'email', 'department_id']);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'email' => 'email',
            'department_id' => 'departemen',
            ...$this->labelPenetapan(),
        ];
    }
}
