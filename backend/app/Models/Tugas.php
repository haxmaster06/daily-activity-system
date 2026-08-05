<?php

namespace App\Models;

use App\Events\DataBerubah;
use App\Models\Concerns\MenyiarkanPerubahan;
use Database\Factories\TugasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Kartu pada papan progres harian.
 *
 * Berumur lintas hari, tidak seperti baris laporan yang terikat satu tanggal.
 * Dapat ditautkan ke laporan harian sebagai bukti pengerjaannya.
 */
#[Fillable([
    'title', 'description', 'department_id', 'penanggung_jawab_id',
    'status', 'prioritas', 'target_selesai', 'urutan',
])]
class Tugas extends Model
{
    /** @use HasFactory<TugasFactory> */
    use HasFactory;

    use MenyiarkanPerubahan;

    protected $table = 'tugas';

    public const STATUS_BELUM_MULAI = 'belum_mulai';

    public const STATUS_DALAM_PROSES = 'dalam_proses';

    public const STATUS_SELESAI = 'selesai';

    /**
     * Kolom papan, berurut sesuai tampilnya.
     *
     * Kosakatanya **sama persis** dengan `daily_report_items.progress_status`.
     * Executive Analytics menghitung keduanya berdampingan; dua istilah untuk
     * hal yang sama akan membuatnya diam-diam menghitung dua hal berbeda
     * sebagai satu.
     *
     * @var array<string, string>
     */
    public const STATUS = [
        self::STATUS_BELUM_MULAI => 'Belum Mulai',
        self::STATUS_DALAM_PROSES => 'Dalam Proses',
        self::STATUS_SELESAI => 'Selesai',
    ];

    /** @var array<string, string> */
    public const PRIORITAS = [
        'rendah' => 'Rendah',
        'sedang' => 'Sedang',
        'tinggi' => 'Tinggi',
    ];

    protected function casts(): array
    {
        return [
            'target_selesai' => 'immutable_date',
            'urutan' => 'integer',
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
     * @return BelongsTo<User, $this>
     */
    public function penanggungJawab(): BelongsTo
    {
        return $this->belongsTo(User::class, 'penanggung_jawab_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh_id');
    }

    /**
     * Laporan harian yang menjadi bukti pengerjaannya.
     *
     * @return BelongsToMany<DailyReport, $this>
     */
    public function laporan(): BelongsToMany
    {
        return $this->belongsToMany(DailyReport::class, 'tugas_laporan', 'tugas_id', 'daily_report_id');
    }

    /**
     * Membatasi tugas yang boleh dilihat seorang pengguna.
     *
     * **Satu-satunya tempat aturan jangkauan tugas ditulis**, mengikuti
     * `DailyReport::scopeVisibleTo()`. Controller tidak boleh menyusun
     * pembatasan sendiri — aturan yang tersebar pasti berbeda di salah satunya,
     * dan yang berbeda itu menjadi kebocoran data.
     *
     * - Pribadi    : tugas yang ia buat atau ia tanggung
     * - Departemen : ditambah tugas pada departemen yang tercakup penetapannya
     * - Korporat   : seluruh tugas
     *
     * @param  Builder<Tugas>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $jangkauan = $user->jangkauan();

        if ($jangkauan->korporat()) {
            return;
        }

        $departemen = $jangkauan->departemenId;

        /*
         * Kurungnya wajib. Tanpa closure pembungkus, `orWhereIn` lepas dari
         * seluruh penyaringan lain pada query pemanggil — status, pencarian,
         * departemen yang diminta — dan mengembalikan seluruh tugas departemen
         * itu. Cacat yang sama pernah ada pada laporan.
         */
        $query->where(function (Builder $sub) use ($user, $departemen): void {
            $sub->where('dibuat_oleh_id', $user->getKey())
                ->orWhere('penanggung_jawab_id', $user->getKey());

            if ($departemen !== []) {
                $sub->orWhereIn('department_id', $departemen);
            }
        });
    }

    public function lewatTarget(): bool
    {
        return $this->target_selesai !== null
            && $this->status !== self::STATUS_SELESAI
            && $this->target_selesai->isPast();
    }

    protected function jenisSiaran(): string
    {
        return DataBerubah::TUGAS;
    }
}
