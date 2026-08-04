<?php

namespace App\Http\Resources;

use App\Models\ReportTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReportTemplate
 */
class ReportTemplateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kode' => $this->code,
            'nama' => $this->name,
            'keterangan' => $this->description,
            'aktif' => $this->is_active,
            'bentuk_pengisian' => $this->bentuk_pengisian,
            'urutan' => $this->sort_order,
            'versi' => $this->version,
            'berlaku_umum' => $this->department_id === null,
            'departemen' => $this->whenLoaded('department', fn () => [
                'id' => $this->department?->id,
                'kode' => $this->department?->code,
                'nama' => $this->department?->name,
            ]),
            'jumlah_kolom' => $this->whenCounted('fields'),
            'kolom' => TemplateFieldResource::collection($this->whenLoaded('fields')),
        ];
    }
}
