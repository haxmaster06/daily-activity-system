<?php

use App\Models\Permission;
use App\Models\User;
use App\Support\KatalogIzin;
use App\Support\KehadiranReverb;
use Laravel\Sanctum\Sanctum;

/*
 * Kehadiran pada Manajemen Pengguna.
 *
 * Dibaca dari daftar channel yang sedang terisi di Reverb — tiap pengguna yang
 * masuk sudah berlangganan channel notifikasi pribadinya, dan langganan itu
 * hidup persis selama tabnya terbuka.
 *
 * Reverb-nya sendiri dipalsukan di sini: yang diuji adalah siapa yang boleh
 * melihat hasilnya dan apa yang terjadi ketika Reverb tidak menjawab, bukan
 * protokol Pusher.
 */

function palsukanKehadiran(array $id): void
{
    $palsu = new class($id) extends KehadiranReverb
    {
        public function __construct(private array $id) {}

        public function idPenggunaOnline(): array
        {
            return $this->id;
        }
    };

    app()->instance(KehadiranReverb::class, $palsu);
}

/*
 * Yang dapat membuka Manajemen Pengguna hanyalah pemegang `pengguna.lihat`,
 * dan bawaannya cuma Administrator. Karena itu kelayakan melihat kehadiran
 * diuji dengan mencabut izin kehadirannya saja — bukan dengan peran lain, yang
 * akan tertahan lebih dulu di 403 pada daftarnya sendiri dan membuat test ini
 * lulus tanpa pernah menyentuh apa yang dimaksudkan.
 */
it('menyembunyikan kehadiran dari yang tidak berizin', function (): void {
    palsukanKehadiran([1, 2, 3]);

    $admin = User::factory()->administrator()->create();

    $izin = Permission::where('key', KatalogIzin::PENGGUNA_LIHAT_KEHADIRAN)
        ->firstOrFail();
    $admin->roleUtama()?->permissions()->detach($izin->id);

    Sanctum::actingAs($admin->fresh());

    $baris = $this->getJson('/api/pengguna')->assertOk()->json('data.0');

    /*
     * Absen sama sekali, bukan bernilai false — false adalah pernyataan bahwa
     * orangnya sedang tidak online, dan itu tetap membocorkan sesuatu.
     */
    expect($baris)->not->toHaveKey('sedang_online')
        ->and($baris)->not->toHaveKey('masuk_terakhir');
});

it('menampilkan kehadiran kepada yang berizin', function (): void {
    $admin = User::factory()->administrator()->create();
    $online = User::factory()->staff()->create();
    $offline = User::factory()->staff()->create();

    palsukanKehadiran([$online->id]);
    Sanctum::actingAs($admin);

    $daftar = collect($this->getJson('/api/pengguna')->assertOk()->json('data'))
        ->keyBy('id');

    expect($daftar[$online->id]['sedang_online'])->toBeTrue()
        ->and($daftar[$offline->id]['sedang_online'])->toBeFalse();
});

/*
 * Reverb mati bukan berarti semua orang offline — tetapi juga bukan alasan
 * mematikan Manajemen Pengguna. Tanpa test ini, satu container yang tumbang
 * membuat layar pengelolaan pengguna ikut tidak dapat dibuka.
 */
it('tetap melayani daftar pengguna saat Reverb tidak dapat dihubungi', function (): void {
    $gagal = new class extends KehadiranReverb
    {
        public function idPenggunaOnline(): array
        {
            return [];
        }
    };

    app()->instance(KehadiranReverb::class, $gagal);

    $admin = User::factory()->administrator()->create();
    User::factory()->staff()->count(2)->create();
    Sanctum::actingAs($admin);

    $data = $this->getJson('/api/pengguna')->assertOk()->json('data');

    expect($data)->toHaveCount(3)
        ->and(collect($data)->every(fn ($baris) => $baris['sedang_online'] === false))->toBeTrue();
});
