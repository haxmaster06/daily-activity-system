<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'ingat' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'email' => 'email',
            'password' => 'kata sandi',
            'ingat' => 'ingat saya',
        ];
    }

    /** Masa berlaku token: lebih panjang bila pengguna memilih "Ingat saya". */
    public function masaBerlakuMenit(): int
    {
        return $this->boolean('ingat')
            ? (int) config('sanctum.expiration_remembered', 10080)
            : (int) config('sanctum.expiration', 480);
    }
}
