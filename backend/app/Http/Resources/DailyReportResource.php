<?php

namespace App\Http\Resources;

use App\Models\DailyReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DailyReport
 */
class DailyReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // ISO 8601 karena ini payload API; pemformatan Bahasa Indonesia
            // dikerjakan frontend lewat lib/format.ts (CLAUDE.md).
            'tanggal' => $this->report_date->toDateString(),
            'status' => $this->status,
            'label_status' => DailyReport::LABEL_STATUS[$this->status] ?? $this->status,
            'dikirim_pada' => $this->submitted_at?->toIso8601String(),
            'ditinjau_pada' => $this->reviewed_at?->toIso8601String(),
            'catatan_tinjauan' => $this->review_note,
            'dapat_disunting' => $this->masihDraf(),

            'penyusun' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'nama' => $this->user->name,
            ]),
            'departemen' => $this->whenLoaded('department', fn () => [
                'id' => $this->department->id,
                'nama' => $this->department->name,
            ]),
            'peninjau' => $this->whenLoaded('peninjau', fn () => $this->peninjau === null ? null : [
                'id' => $this->peninjau->id,
                'nama' => $this->peninjau->name,
            ]),

            'lampiran' => AttachmentResource::collection($this->whenLoaded('attachments')),

            'jumlah_bagian' => $this->whenCounted('sections'),
            'bagian' => DailyReportSectionResource::collection($this->whenLoaded('sections')),
        ];
    }
}
