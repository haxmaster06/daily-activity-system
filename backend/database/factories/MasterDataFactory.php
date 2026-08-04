<?php

namespace Database\Factories;

use App\Models\MasterData;
use App\Models\MasterType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MasterData>
 */
class MasterDataFactory extends Factory
{
    protected $model = MasterData::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $nama = ucfirst($this->faker->unique()->words(2, true));

        return [
            'master_type_id' => MasterType::factory(),
            'code' => Str::upper(Str::slug($nama, '_')),
            'name' => $nama,
            'parent_id' => null,
            'description' => null,
            'data' => null,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function nonaktif(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
