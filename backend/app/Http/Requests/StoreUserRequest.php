<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MenerimaPenetapanRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    use MenerimaPenetapanRole;

    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'is_active' => ['sometimes', 'boolean'],
            ...$this->aturanPenetapan(),
        ];
    }

    /**
     * Kolom milik tabel users saja — penetapan peran disimpan terpisah.
     *
     * @return array<string, mixed>
     */
    public function atributPengguna(): array
    {
        return $this->safe()->only(['name', 'email', 'password', 'department_id', 'is_active']);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'email' => 'email',
            'password' => 'kata sandi',
            'department_id' => 'departemen',
            'is_active' => 'status',
            ...$this->labelPenetapan(),
        ];
    }
}
