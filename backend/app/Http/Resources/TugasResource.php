<?php

namespace App\Http\Resources;

use App\Models\Tugas;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Tugas
 */
class TugasResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'judul' => $this->title,
            'keterangan' => $this->description,
            'status' => $this->status,
            'label_status' => Tugas::STATUS[$this->status] ?? $this->status,
            'prioritas' => $this->prioritas,
            'label_prioritas' => $this->prioritas === null
                ? null
                : (Tugas::PRIORITAS[$this->prioritas] ?? $this->prioritas),
            'target_selesai' => $this->target_selesai?->toDateString(),
            'lewat_target' => $this->lewatTarget(),
            'urutan' => $this->urutan,
            'departemen' => [
                'id' => $this->department_id,
                'nama' => $this->whenLoaded('department', fn () => $this->department?->name),
            ],
            'penanggung_jawab' => $this->whenLoaded(
                'penanggungJawab',
                fn () => $this->penanggungJawab === null ? null : [
                    'id' => $this->penanggungJawab->id,
                    'nama' => $this->penanggungJawab->name,
                ],
            ),
            'laporan' => $this->whenLoaded(
                'laporan',
                fn () => $this->laporan
                    ->map(fn ($satu) => [
                        'id' => $satu->id,
                        'tanggal' => $satu->report_date->toDateString(),
                    ])
                    ->all(),
            ),
            'jumlah_laporan' => $this->whenCounted('laporan'),
        ];
    }
}
