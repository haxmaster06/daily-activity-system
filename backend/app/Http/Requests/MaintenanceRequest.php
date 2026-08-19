<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Otorisasi ditangani middleware `izin:sistem.maintenance` pada rutenya.
 */
class MaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'aktif' => ['required', 'boolean'],
            'pesan' => ['nullable', 'string', 'max:500'],
        ];
    }
}
