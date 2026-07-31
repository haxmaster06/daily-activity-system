<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'department_id', 'role_id', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Role selalu ikut dimuat.
     *
     * Hampir setiap pemeriksaan izin membaca role pengguna, termasuk Policy
     * yang berjalan sebelum controller sempat melakukan eager loading.
     * Tanpa ini, `preventLazyLoading` akan menggagalkan permintaan. Tabel
     * roles hanya berisi empat baris sehingga biayanya dapat diabaikan.
     *
     * @var list<string>
     */
    protected $with = ['role'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * @return HasMany<DailyReport, $this>
     */
    public function laporan(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    public function hasRole(string $slug): bool
    {
        return $this->role?->slug === $slug;
    }

    public function isAdministrator(): bool
    {
        return $this->hasRole(Role::ADMINISTRATOR);
    }

    /**
     * Apakah user berada pada level role tertentu atau di atasnya.
     *
     * Dipakai Policy agar pemeriksaan izin tidak menuliskan daftar role
     * berulang kali di banyak tempat.
     */
    public function hasLevelAtLeast(int $level): bool
    {
        return ($this->role?->level ?? 0) >= $level;
    }

    /**
     * Melihat laporan seluruh anggota departemennya.
     */
    public function canMonitorTeam(): bool
    {
        return $this->hasLevelAtLeast(Role::LEVEL_SUPERVISOR);
    }

    /**
     * Melihat laporan lintas departemen.
     */
    public function canSeeAllDepartments(): bool
    {
        return $this->hasLevelAtLeast(Role::LEVEL_MANAGER);
    }
}
