<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Support\JangkauanData;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'department_id' => Department::factory(),
            'role_id' => RoleFactory::slug(Role::STAFF),
            'is_active' => true,
        ];
    }

    /**
     * Menetapkan peran ke pivot setelah pengguna dibuat.
     *
     * Test yang sudah ada menyetel `role_id` lewat state; penetapan di pivot
     * dibuat menyusul dengan jangkauan yang meniru tangga level lama, sehingga
     * 168 test tidak perlu disunting satu per satu.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (User $pengguna): void {
            if ($pengguna->role_id === null) {
                return;
            }

            // Level dibaca lewat query, bukan relasi: model yang baru dibuat
            // lolos dari `preventLazyLoading` karena `wasRecentlyCreated`, dan
            // mengandalkan celah itu menyembunyikan cacat eager loading.
            $level = (int) Role::whereKey($pengguna->role_id)->value('level');

            $jangkauan = match (true) {
                $level >= Role::LEVEL_MANAGER => JangkauanData::KORPORAT,
                $level >= Role::LEVEL_SUPERVISOR => JangkauanData::DEPARTEMEN,
                default => JangkauanData::PERSONAL,
            };

            $pengguna->roles()->syncWithoutDetaching([
                $pengguna->role_id => [
                    'scope_level' => $jangkauan,
                    'department_id' => null,
                ],
            ]);

            $pengguna->load('roles.permissions');
        });
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function nonaktif(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function staff(): static
    {
        return $this->berperan(Role::STAFF);
    }

    public function supervisor(): static
    {
        return $this->berperan(Role::SUPERVISOR);
    }

    public function manager(): static
    {
        return $this->berperan(Role::MANAGER);
    }

    public function administrator(): static
    {
        return $this->berperan(Role::ADMINISTRATOR);
    }

    private function berperan(string $slug): static
    {
        return $this->state(fn (array $attributes) => [
            'role_id' => RoleFactory::slug($slug),
        ]);
    }
}
