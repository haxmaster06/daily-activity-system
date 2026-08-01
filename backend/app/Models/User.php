<?php

namespace App\Models;

use App\Support\JangkauanData;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'department_id', 'role_id', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Peran dan izinnya selalu ikut dimuat.
     *
     * Hampir setiap pemeriksaan izin membacanya, termasuk Policy yang berjalan
     * sebelum controller sempat melakukan eager loading. Tanpa ini,
     * `preventLazyLoading` akan menggagalkan permintaan.
     *
     * Biayanya dua query tambahan **per query**, bukan per baris: daftar 100
     * pengguna tetap naik dari tiga menjadi lima query.
     *
     * `role` masih ikut selama kolom `users.role_id` belum dicabut — beberapa
     * bagian masih membacanya, dan mencabutnya lebih awal akan mematahkannya
     * di tengah peralihan.
     *
     * @var list<string>
     */
    protected $with = ['role', 'roles.permissions'];

    /** Hasil hitungan yang dipakai berkali-kali dalam satu permintaan. */
    private ?Collection $izinTersimpan = null;

    private ?JangkauanData $jangkauanTersimpan = null;

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

    /**
     * Lampiran yang pernah diunggahnya.
     *
     * @return HasMany<Attachment, $this>
     */
    public function lampiran(): HasMany
    {
        return $this->hasMany(Attachment::class, 'uploaded_by');
    }

    /**
     * Apakah akun ini dapat dihapus permanen.
     *
     * Hanya akun yang belum meninggalkan jejak apa pun. Laporan dan lampiran
     * merujuk penyusunnya lewat kunci asing `restrictOnDelete`; menghapus
     * akunnya berarti ikut menghapus atau memutus catatan yang harus tetap
     * utuh. Untuk akun yang sudah dipakai, yang benar adalah menonaktifkannya.
     */
    public function dapatDihapus(): bool
    {
        return $this->laporan()->doesntExist() && $this->lampiran()->doesntExist();
    }

    /**
     * Peran yang dipegang, beserta jangkauan tiap penetapannya.
     *
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withPivot(['id', 'scope_level', 'department_id'])
            ->withTimestamps();
    }

    /**
     * Apakah pengguna memegang sebuah izin.
     *
     * Namanya bukan `can()`: nama itu milik `Authorizable` dan dipakai seluruh
     * `authorize()` serta Policy. Menimpanya akan mematahkan otorisasi
     * Laravel di seluruh aplikasi.
     */
    public function boleh(string $izin): bool
    {
        return $this->daftarIzin()->contains($izin);
    }

    /**
     * @param  array<int, string>  $izin
     */
    public function bolehSalahSatu(array $izin): bool
    {
        return $this->daftarIzin()->intersect($izin)->isNotEmpty();
    }

    /**
     * Gabungan izin dari seluruh peran yang dipegang.
     *
     * @return Collection<int, string>
     */
    public function daftarIzin(): Collection
    {
        return $this->izinTersimpan ??= $this->roles
            ->flatMap(fn (Role $peran) => $peran->permissions->pluck('key'))
            ->unique()
            ->values();
    }

    public function jangkauan(): JangkauanData
    {
        return $this->jangkauanTersimpan ??= JangkauanData::untuk($this);
    }

    /**
     * Peran utama, dipakai untuk pelabelan dan untuk cermin `users.role_id`.
     *
     * Urutan pemutusnya harus pasti. Bila tidak, peran yang ditampilkan dapat
     * berganti-ganti antar permintaan untuk orang yang memegang dua peran pada
     * jangkauan yang sama.
     */
    public function roleUtama(): ?Role
    {
        return $this->roles
            ->sortBy([
                fn (Role $a, Role $b) => (int) $b->pivot->scope_level <=> (int) $a->pivot->scope_level,
                fn (Role $a, Role $b) => (int) $b->level <=> (int) $a->level,
                fn (Role $a, Role $b) => (int) $a->getKey() <=> (int) $b->getKey(),
            ])
            ->first();
    }

    /**
     * Menyetel ulang seluruh penetapan peran.
     *
     * Penetapan dinormalkan lebih dulu: `department_id` dikosongkan pada
     * jangkauan Pribadi dan Korporat, lalu kombinasi kembar dibuang. Indeks
     * unik di basis data tidak dapat melakukannya — MySQL menganggap NULL
     * berbeda satu sama lain, sehingga penetapan berdepartemen kosong tetap
     * bisa masuk dua kali.
     *
     * @param  array<int, array{role_id: int|string, scope_level: int|string, department_id?: int|string|null}>  $penetapan
     */
    public function syncRoles(array $penetapan): void
    {
        $bersih = [];

        foreach ($penetapan as $satu) {
            $level = (int) $satu['scope_level'];

            $departemen = $level === JangkauanData::DEPARTEMEN
                ? ($satu['department_id'] ?? null)
                : null;

            $departemen = $departemen === null ? null : (int) $departemen;

            $bersih[(int) $satu['role_id'].'|'.$level.'|'.($departemen ?? '')] = [
                'role_id' => (int) $satu['role_id'],
                'scope_level' => $level,
                'department_id' => $departemen,
            ];
        }

        /*
         * Pivot dikerjakan langsung, bukan lewat `sync()`.
         *
         * `sync()` mengunci baris berdasarkan id peran saja, sehingga dua
         * penetapan peran yang sama dengan departemen berbeda akan runtuh
         * menjadi satu — padahal justru itu yang harus bisa dinyatakan.
         */
        $kunci = fn (array $satu) => $satu['role_id'].':'.$satu['scope_level'].':'
            .($satu['department_id'] ?? 'x');

        $diinginkan = collect($bersih)->keyBy($kunci);

        $sekarang = DB::table('role_user')
            ->where('user_id', $this->getKey())
            ->get()
            ->keyBy(fn ($baris) => $kunci([
                'role_id' => (int) $baris->role_id,
                'scope_level' => (int) $baris->scope_level,
                'department_id' => $baris->department_id === null ? null : (int) $baris->department_id,
            ]));

        $dihapus = $sekarang->keys()->diff($diinginkan->keys());

        if ($dihapus->isNotEmpty()) {
            DB::table('role_user')
                ->whereIn('id', $sekarang->only($dihapus->all())->pluck('id'))
                ->delete();
        }

        $baru = $diinginkan->except($sekarang->keys()->all())
            ->map(fn (array $satu) => [
                ...$satu,
                'user_id' => $this->getKey(),
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->values()
            ->all();

        if ($baru !== []) {
            DB::table('role_user')->insert($baru);
        }

        $this->unsetRelation('roles')->load('roles.permissions');
        $this->lupakanIzin();

        // Cermin peran utama. Dipertahankan sampai kolomnya dicabut, supaya
        // kode lama tetap menemukan kebenarannya bila rilis ini di-rollback.
        $this->forceFill(['role_id' => $this->roleUtama()?->getKey()])->save();
    }

    public function lupakanIzin(): void
    {
        $this->izinTersimpan = null;
        $this->jangkauanTersimpan = null;
    }

    /**
     * @deprecated Jangan dipakai untuk memutuskan izin — pakai `boleh()`.
     *             Slug hanya identitas peran, bukan hak akses.
     */
    public function hasRole(string $slug): bool
    {
        return $this->roles->contains('slug', $slug);
    }

    /**
     * @deprecated Jangan dipakai untuk memutuskan izin — pakai `boleh()`.
     */
    public function isAdministrator(): bool
    {
        return $this->hasRole(Role::ADMINISTRATOR);
    }
}
