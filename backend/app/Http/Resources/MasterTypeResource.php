<?php

namespace App\Http\Resources;

use App\Models\MasterType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MasterType
 */
class MasterTypeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'nama' => $this->name,
            'keterangan' => $this->description,
            'sistem' => $this->is_system,
            'urutan' => $this->sort_order,
            /*
             * Departemen yang berwenang mengelola isinya. Kosong berarti
             * terbuka bagi seluruh pemegang `master.kelola` — lihat
             * MasterDataPolicy.
             */
            'departemen_pengelola' => $this->whenLoaded(
                'departemenPengelola',
                fn () => $this->departemenPengelola
                    ->map(fn ($satu) => ['id' => $satu->id, 'nama' => $satu->name])
                    ->values(),
            ),
            'boleh_kelola_isi' => $request->user()?->can('create', [\App\Models\MasterData::class, $this->resource]) ?? false,
            'induk' => $this->whenLoaded(
                'induk',
                fn () => $this->induk === null
                    ? null
                    : ['id' => $this->induk->id, 'slug' => $this->induk->slug, 'nama' => $this->induk->name],
            ),
            'induk_id' => $this->parent_type_id,
            'jumlah_isi' => $this->whenCounted('isi'),
        ];
    }
}
