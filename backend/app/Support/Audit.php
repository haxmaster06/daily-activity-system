<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

/**
 * Pencatat jejak audit (non-fungsional §11).
 *
 * Dipanggil dari controller setelah perubahan berhasil disimpan.
 *
 * Nilai sensitif tidak pernah ikut tercatat — daftar kolom yang disaring ada
 * pada `KOLOM_SENSITIF` (non-fungsional §12).
 */
final class Audit
{
    public const MODUL_PENGGUNA = 'pengguna';

    public const MODUL_DEPARTEMEN = 'departemen';

    public const MODUL_TEMPLATE = 'template';

    public const MODUL_LAPORAN = 'laporan';

    public const AKSI_DIBUAT = 'dibuat';

    public const AKSI_DIPERBARUI = 'diperbarui';

    public const AKSI_DIHAPUS = 'dihapus';

    public const AKSI_DIAKTIFKAN = 'diaktifkan';

    public const AKSI_DINONAKTIFKAN = 'dinonaktifkan';

    public const AKSI_SANDI_DIATUR_ULANG = 'kata sandi diatur ulang';

    /**
     * @var list<string>
     */
    private const KOLOM_SENSITIF = [
        'password',
        'password_confirmation',
        'remember_token',
        'token',
        'api_token',
        'secret',
    ];

    /**
     * @param  array<string, mixed>|null  $changes
     */
    public static function catat(
        string $action,
        string $module,
        string $description,
        ?Model $auditable = null,
        ?array $changes = null,
    ): AuditLog {
        $pelaku = Request::user();

        return AuditLog::create([
            'user_id' => $pelaku?->getAuthIdentifier(),
            'user_name' => $pelaku?->name,
            'action' => $action,
            'module' => $module,
            'auditable_type' => $auditable?->getMorphClass(),
            'auditable_id' => $auditable?->getKey(),
            'description' => mb_substr($description, 0, 255),
            'changes' => $changes === null ? null : self::saring($changes),
            'ip_address' => Request::ip(),
            'user_agent' => mb_substr((string) Request::userAgent(), 0, 255),
        ]);
    }

    /**
     * Selisih nilai sebelum dan sesudah, hanya untuk kolom yang benar-benar berubah.
     *
     * @param  array<string, mixed>  $sebelum
     * @param  array<string, mixed>  $sesudah
     * @return array<string, array{sebelum: mixed, sesudah: mixed}>
     */
    public static function selisih(array $sebelum, array $sesudah): array
    {
        $hasil = [];

        foreach ($sesudah as $kolom => $nilaiBaru) {
            $nilaiLama = $sebelum[$kolom] ?? null;

            if ($nilaiLama != $nilaiBaru) {
                $hasil[$kolom] = ['sebelum' => $nilaiLama, 'sesudah' => $nilaiBaru];
            }
        }

        return $hasil;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function saring(array $data): array
    {
        foreach ($data as $kunci => $nilai) {
            if (in_array($kunci, self::KOLOM_SENSITIF, true)) {
                $data[$kunci] = '[disaring]';

                continue;
            }

            if (is_array($nilai)) {
                $data[$kunci] = self::saring($nilai);
            }
        }

        return $data;
    }
}
