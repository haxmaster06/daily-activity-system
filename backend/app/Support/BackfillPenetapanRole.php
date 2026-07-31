<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Memindahkan `users.role_id` menjadi baris penetapan di `role_user`.
 *
 * Dipisahkan dari migration-nya supaya bagian paling berisiko pada rilis ini
 * dapat diuji — migration sendiri praktis tidak dapat diuji.
 *
 * Pemetaan level lama ke jangkauan meniru perilaku sebelumnya persis:
 * Manager dan Administrator melihat seluruh departemen, Supervisor melihat
 * departemennya sendiri, sisanya hanya data sendiri. `department_id` selalu
 * dibiarkan kosong, yang berarti "mengikuti departemen pengguna" — dan itulah
 * yang dibaca `scopeVisibleTo` sebelum perubahan ini.
 */
final class BackfillPenetapanRole
{
    /**
     * @return array{diisi: int, tanpa_role: int}
     */
    public static function jalankan(): array
    {
        $levelPeran = DB::table('roles')->pluck('level', 'id');
        $diisi = 0;

        DB::table('users')
            ->whereNotNull('role_id')
            ->orderBy('id')
            ->chunkById(500, function ($baris) use ($levelPeran, &$diisi): void {
                foreach ($baris as $pengguna) {
                    $level = (int) ($levelPeran[$pengguna->role_id] ?? 0);

                    $jangkauan = match (true) {
                        $level >= 30 => JangkauanData::KORPORAT,
                        $level >= 20 => JangkauanData::DEPARTEMEN,
                        default => JangkauanData::PERSONAL,
                    };

                    // Kunci alami penuh: dijalankan ulang tidak menghasilkan
                    // baris kedua.
                    DB::table('role_user')->updateOrInsert(
                        [
                            'user_id' => $pengguna->id,
                            'role_id' => $pengguna->role_id,
                            'scope_level' => $jangkauan,
                            'department_id' => null,
                        ],
                        ['updated_at' => now(), 'created_at' => now()],
                    );

                    $diisi++;
                }
            });

        return [
            'diisi' => $diisi,
            // Akun tanpa role berakhir tanpa penetapan sama sekali, sehingga
            // jangkauannya Pribadi dan tidak memegang izin apa pun. Dilaporkan,
            // bukan diam-diam diberi peran.
            'tanpa_role' => DB::table('users')->whereNull('role_id')->count(),
        ];
    }

    /**
     * Menghapus baris yang tidak dapat dibedakan dari hasil backfill.
     *
     * Penetapan yang dibuat manual lewat layar tidak tersentuh: bentuknya
     * berbeda — `department_id` terisi, atau `role_id` tidak sama dengan
     * `users.role_id`, atau jangkauannya tidak sesuai pemetaan level.
     */
    public static function balikkan(): int
    {
        $levelPeran = DB::table('roles')->pluck('level', 'id');
        $dihapus = 0;

        DB::table('users')
            ->whereNotNull('role_id')
            ->orderBy('id')
            ->chunkById(500, function ($baris) use ($levelPeran, &$dihapus): void {
                foreach ($baris as $pengguna) {
                    $level = (int) ($levelPeran[$pengguna->role_id] ?? 0);

                    $jangkauan = match (true) {
                        $level >= 30 => JangkauanData::KORPORAT,
                        $level >= 20 => JangkauanData::DEPARTEMEN,
                        default => JangkauanData::PERSONAL,
                    };

                    $dihapus += DB::table('role_user')
                        ->where('user_id', $pengguna->id)
                        ->where('role_id', $pengguna->role_id)
                        ->where('scope_level', $jangkauan)
                        ->whereNull('department_id')
                        ->delete();
                }
            });

        return $dihapus;
    }
}
