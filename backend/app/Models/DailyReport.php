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
     * Jangkauannya berasal dari penetapan peran pengguna:
     *
     * - Pribadi    : laporannya sendiri
     * - Departemen : laporannya sendiri, ditambah laporan pada departemen yang
     *                tercakup penetapannya — bisa lebih dari satu
     * - Korporat   : seluruh laporan
     *
     * @param  Builder<DailyReport>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $jangkauan = $user->jangkauan();

        if ($jangkauan->korporat()) {
            return;
        }

        $departemen = $jangkauan->departemenId;

        /*
         * Kurungnya wajib. Tanpa closure pembungkus, `orWhereIn` di dalamnya
         * lepas dari seluruh penyaringan lain pada query pemanggil — status,
         * rentang tanggal, kata pencarian — dan mengembalikan seluruh laporan
         * departemen itu.
         */
        $query->where(function (Builder $sub) use ($user, $departemen): void {
            /*
             * Laporan sendiri selalu terlihat, termasuk yang dibuat sebelum
             * pengguna dipindah departemen: `department_id` laporan disalin
             * saat laporan dibuat dan tidak ikut berpindah.
             */
            $sub->where('user_id', $user->getKey());

            if ($departemen !== []) {
                $sub->orWhereIn('department_id', $departemen);
            }
        });
    }

    /**
     * Menyaring laporan pada rentang tanggal.
     *
     * Memakai perbandingan langsung, **bukan** `whereDate()`. `report_date`
     * memang bertipe DATE, sehingga membungkusnya dengan `DATE()` tidak
     * mengubah hasil — tetapi membuat MySQL tidak dapat memakai kolom itu untuk
     * mempersempit pencarian. Terukur pada
     * `daily_reports_department_id_report_date_index`:
     *
     *   DATE(report_date) >= ?   → type=ref    (hanya departemen yang dipakai)
     *   report_date >= ?         → type=range  (departemen dan tanggal dipakai)
     *
     * Selisihnya belum terasa pada data pengembangan, dan akan terasa pada
     * arsip laporan bertahun-tahun.
     *
     * @param  Builder<DailyReport>  $query
     */
    public function scopeDalamRentang(Builder $query, ?string $dari, ?string $sampai): void
    {
        $query->when($dari, fn ($sub) => $sub->where('report_date', '>=', $dari))
            ->when($sampai, fn ($sub) => $sub->where('report_date', '<=', $sampai));
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
