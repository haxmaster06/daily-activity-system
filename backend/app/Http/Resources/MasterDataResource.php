<?php

namespace App\Http\Resources;

use App\Models\MasterData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MasterData
 */
class MasterDataResource extends JsonResource
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
            'urutan' => $this->sort_order,
            'induk_id' => $this->parent_id,
            'induk' => $this->whenLoaded(
                'induk',
                fn () => $this->induk === null
                    ? null
                    : ['id' => $this->induk->id, 'kode' => $this->induk->code, 'nama' => $this->induk->name],
            ),
            'data' => $this->data,
        ];
    }
}
