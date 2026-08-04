<?php

namespace App\Http\Resources;

use App\Models\TemplateField;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TemplateField
 */
class TemplateFieldResource extends JsonResource
{
    /**
     * Bentuk kolom yang dipakai frontend untuk merender form dinamis.
     *
     * `kunci` sengaja ikut dikirim karena dibutuhkan sebagai penanda nilai di
     * dalam data laporan — bukan untuk ditampilkan ke user. Yang tampil di
     * layar adalah `label` (standarisasi §26).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kunci' => $this->key,
            'label' => $this->label,
            'grup' => $this->group_label,
            'tipe' => $this->type,
            'wajib' => $this->is_required,
            'urutan' => $this->sort_order,
            'satuan' => $this->unit,
            'placeholder' => $this->placeholder,
            'bantuan' => $this->help_text,
            'pilihan' => $this->options,
            'sumber_master' => $this->lookup_source,
            'rumus' => $this->computed_from,
            'nilai_min' => $this->min_value === null ? null : (float) $this->min_value,
            'nilai_maks' => $this->max_value === null ? null : (float) $this->max_value,
            'desimal' => $this->desimal,
            'master_jenis_id' => $this->master_type_id,
            'master_jenis' => $this->whenLoaded(
                'jenisMaster',
                fn () => $this->jenisMaster === null ? null : [
                    'id' => $this->jenisMaster->id,
                    'slug' => $this->jenisMaster->slug,
                    'nama' => $this->jenisMaster->name,
                    'induk_id' => $this->jenisMaster->parent_type_id,
                ],
            ),
            'master_induk_kunci' => $this->master_induk_key,
        ];
    }
}
