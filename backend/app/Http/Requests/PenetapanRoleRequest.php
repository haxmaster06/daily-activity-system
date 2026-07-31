<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MenerimaPenetapanRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Mengatur penetapan peran seorang pengguna.
 *
 * Terpisah dari penyuntingan identitas: penetapan adalah kumpulan baris yang
 * jumlahnya berubah-ubah, bukan sekumpulan kolom tetap.
 */
class PenetapanRoleRequest extends FormRequest
{
    use MenerimaPenetapanRole;

    public function authorize(): bool
    {
        $target = $this->route('user');

        return $target instanceof User && $this->user()->can('update', $target);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return $this->aturanPenetapan();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->labelPenetapan();
    }
}
