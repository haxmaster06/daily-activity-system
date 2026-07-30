<?php

namespace Database\Factories;

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyReport>
 */
class DailyReportFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'department_id' => Department::factory(),
            'report_date' => now()->toDateString(),
            'status' => DailyReport::STATUS_DRAF,
        ];
    }

    public function dikirim(): static
    {
        return $this->state(fn () => [
            'status' => DailyReport::STATUS_DIKIRIM,
            'submitted_at' => now(),
        ]);
    }

    /** Laporan milik pengguna tertentu, sekaligus mengikuti departemennya. */
    public function milik(User $user): static
    {
        return $this->state(fn () => [
            'user_id' => $user->id,
            'department_id' => $user->department_id,
        ]);
    }
}
