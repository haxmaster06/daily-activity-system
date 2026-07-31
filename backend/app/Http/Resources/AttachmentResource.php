<?php

namespace App\Http\Resources;

use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Attachment
 */
class AttachmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nama' => $this->original_name,
            'tipe' => $this->mime_type,
            'ukuran' => $this->size_bytes,
            'diunggah_pada' => $this->created_at?->toIso8601String(),
            'pengunggah' => $this->whenLoaded(
                'pengunggah',
                fn () => $this->pengunggah?->name,
            ),

            /*
             * `path` sengaja tidak pernah dikirim. Itu lokasi di disk, bukan
             * alamat — dan membocorkannya memberi petunjuk untuk menebak berkas
             * milik orang lain. Unduhan selalu lewat /api/lampiran/{id}.
             */
        ];
    }
}
