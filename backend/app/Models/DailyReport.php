<?php

namespace App\Models;

use Database\Factories\DailyReportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'department_id', 'report_date', 'status'])]
class DailyReport extends Model
{
    /** @use HasFactory<DailyReportFactory> */
    use HasFactory;

    public const STATUS_DRAF = 'draf';

    public const STATUS_DIKIRIM = 'dikirim';

    public const STATUS_DITINJAU = 'ditinjau';

    /**
     * Label Bahasa Indonesia tiap status (standarisasi §26).
     *
     * @var array<string, string>
     */
    public const LABEL_STATUS = [
        self::STATUS_DRAF => 'Draf',
        self::STATUS_DIKIRIM => 'Dikirim',
        self::STATUS_DITINJAU => 'Ditinjau',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function peninjau(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * @return HasMany<DailyReportSection, $this>
     */
    public function sections(): HasMany
    {
        return $this->hasMany(DailyReportSection::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * Membatasi laporan yang boleh dilihat seorang pengguna.
     *
     * **Satu-satunya tempat aturan jangkauan data laporan ditulis.** Controller
     * tidak boleh menyusun pembatasan role sendiri — aturan yang tersebar di
     * banyak tempat pasti berbeda di salah satunya, dan yang berbeda itu jadi
     * kebocoran data (CLAUDE.md, Aturan API).
     *
     * - Staff      : laporannya sendiri
     * - Supervisor : seluruh anggota departemennya
     * - Manager    : seluruh departemen
     * - Administrator: seluruh departemen
     *
     * @param  Builder<DailyReport>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if ($user->canSeeAllDepartments()) {
            return;
        }

        if ($user->canMonitorTeam()) {
            $query->where('department_id', $user->department_id);

            return;
        }

        $query->where('user_id', $user->getKey());
    }

    /**
     * @param  Builder<DailyReport>  $query
     */
    public function scopeDalamRentang(Builder $query, ?string $dari, ?string $sampai): void
    {
        $query->when($dari, fn ($sub) => $sub->whereDate('report_date', '>=', $dari))
            ->when($sampai, fn ($sub) => $sub->whereDate('report_date', '<=', $sampai));
    }

    /** Laporan yang masih draf boleh disunting pemiliknya. */
    public function masihDraf(): bool
    {
        return $this->status === self::STATUS_DRAF;
    }

    public function sudahDikirim(): bool
    {
        return in_array($this->status, [self::STATUS_DIKIRIM, self::STATUS_DITINJAU], true);
    }
}
