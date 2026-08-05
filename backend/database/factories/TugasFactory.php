<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Tugas;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tugas>
 */
class TugasFactory extends Factory
{
    protected $model = Tugas::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => 'Tugas '.$this->faker->unique()->words(2, true),
            'description' => null,
            'department_id' => Department::factory(),
            'penanggung_jawab_id' => null,
            'status' => Tugas::STATUS_BELUM_MULAI,
            'prioritas' => null,
            'target_selesai' => null,
            'urutan' => 0,
            'dibuat_oleh_id' => User::factory(),
        ];
    }

    public function dalamProses(): static
    {
        return $this->state(fn () => ['status' => Tugas::STATUS_DALAM_PROSES]);
    }

    public function selesai(): static
    {
        return $this->state(fn () => ['status' => Tugas::STATUS_SELESAI]);
    }
}
