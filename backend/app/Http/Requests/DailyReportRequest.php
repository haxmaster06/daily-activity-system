<?php

namespace App\Http\Requests;

use App\Models\DailyReport;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi kerangka laporan.
 *
 * Isian tiap baris **tidak** divalidasi di sini — bentuknya berbeda tiap
 * template dan disusun `ValidasiIsianTemplate` dari definisi kolomnya.
 */
class DailyReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        $laporan = $this->route('laporan');

        return $laporan instanceof DailyReport
            ? $this->user()->can('update', $laporan)
            : $this->user()->can('create', DailyReport::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            // Tanggal hanya ditentukan saat laporan dibuat; setelah itu tetap.
            'report_date' => ['required_without:_metode_ubah', 'date', 'before_or_equal:today'],

            'sections' => ['required', 'array', 'min:1', 'max:10'],
            'sections.*.report_template_id' => ['required', 'integer', 'exists:report_templates,id'],
            'sections.*.items' => ['required', 'array', 'min:1', 'max:200'],
            'sections.*.items.*' => ['required', 'array'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'report_date' => 'tanggal laporan',
            'sections' => 'bagian laporan',
            'sections.*.report_template_id' => 'template',
            'sections.*.items' => 'baris isian',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'report_date.before_or_equal' => 'Laporan tidak dapat dibuat untuk tanggal yang belum terjadi.',
            'sections.required' => 'Pilih minimal satu template laporan.',
            'sections.min' => 'Pilih minimal satu template laporan.',
            'sections.*.items.required' => 'Setiap bagian harus punya minimal satu baris.',
            'sections.*.items.min' => 'Setiap bagian harus punya minimal satu baris.',
        ];
    }
}
