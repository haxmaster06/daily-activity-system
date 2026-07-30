<?php

namespace App\Http\Resources;

use App\Models\DailyReportSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DailyReportSection
 */
class DailyReportSectionResource extends JsonResource
{
    /**
     * Definisi kolom ikut dikirim bersama isinya.
     *
     * Tanpa itu, frontend tidak punya keterangan apa pun atas kunci di dalam
     * `data` — kunci itu penanda teknis dan tidak boleh ditampilkan sebagai
     * label (standarisasi §26).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'urutan' => $this->sort_order,
            'template' => $this->whenLoaded('template', fn () => [
                'id' => $this->template->id,
                'kode' => $this->template->code,
                'nama' => $this->template->name,
                'kolom' => TemplateFieldResource::collection($this->template->fields),
            ]),
            'baris' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'urutan' => $item->sort_order,
                'status' => $item->progress_status,
                'nilai' => $item->data,
            ])),
        ];
    }
}
