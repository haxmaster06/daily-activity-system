<?php

namespace Database\Factories;

use App\Models\MasterType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<MasterType>
 */
class MasterTypeFactory extends Factory
{
    protected $model = MasterType::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $nama = 'Daftar '.$this->faker->unique()->word();

        return [
            'slug' => Str::slug($nama, '_'),
            'name' => $nama,
            'description' => null,
            'parent_type_id' => null,
            'is_system' => false,
            'sort_order' => 0,
        ];
    }

    /** Jenis bawaan sistem — tidak dapat dihapus. */
    public function sistem(): static
    {
        return $this->state(fn () => ['is_system' => true]);
    }
}
