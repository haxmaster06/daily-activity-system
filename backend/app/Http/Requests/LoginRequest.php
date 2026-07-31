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

    /**
     * Lama diam yang ditoleransi sebelum sesi berakhir.
     *
     * Bukan umur token sejak dibuat: selama aplikasi dipakai, masa berlakunya
     * digeser terus oleh middleware `PerpanjangSesi`.
     */
    public function masaBerlakuMenit(): int
    {
        return $this->boolean('ingat')
            ? (int) config('dams.sesi.menit_diingat', 10080)
            : (int) config('dams.sesi.menit', 720);
    }
}
