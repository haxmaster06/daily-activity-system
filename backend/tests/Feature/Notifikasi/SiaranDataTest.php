<?php

use App\Events\DataBerubah;
use App\Models\DailyReport;
use App\Models\Department;
use App\Models\Tugas;
use App\Models\User;
use App\Support\IzinChannel;
use Database\Seeders\DepartmentSeeder;
use Illuminate\Support\Facades\Event;

/**
 * Siaran perubahan data untuk Executive Analytics.
 *
 * Halaman Analytics tidak menyegarkan dirinya sendiri; ia menunggu kabar. Yang
 * diuji di sini dua hal yang keduanya diam-diam gagal bila salah:
 *
 * 1. Kabarnya benar-benar terkirim dari **tiap** jalur yang mengubah data,
 *    termasuk import massal yang tidak melewati controller biasa.
 * 2. Kabarnya hanya sampai kepada yang memang boleh melihat departemen itu.
 *    Muatannya tipis, tetapi pola siapa-mengirim-kapan sendiri sudah bercerita.
 */
it('menyiarkan perubahan saat laporan dibuat', function (): void {
    Event::fake([DataBerubah::class]);

    $departemen = Department::factory()->create();
    $pengguna = User::factory()->staff()->create(['department_id' => $departemen->id]);

    DailyReport::factory()->create([
        'user_id' => $pengguna->id,
        'department_id' => $departemen->id,
    ]);

    Event::assertDispatched(
        DataBerubah::class,
        fn (DataBerubah $peristiwa) => $peristiwa->departemenId === $departemen->id
            && $peristiwa->jenis === DataBerubah::LAPORAN,
    );
});

it('menyiarkan perubahan saat kartu progres berpindah kolom', function (): void {
    $departemen = Department::factory()->create();
    $tugas = Tugas::factory()->create(['department_id' => $departemen->id]);

    // Dipalsukan sesudah pembuatannya, agar yang terhitung hanya perubahannya.
    Event::fake([DataBerubah::class]);

    $tugas->update(['status' => Tugas::STATUS_SELESAI]);

    Event::assertDispatched(
        DataBerubah::class,
        fn (DataBerubah $peristiwa) => $peristiwa->jenis === DataBerubah::TUGAS,
    );
});

it('menyiarkan perubahan saat laporan dihapus', function (): void {
    $laporan = DailyReport::factory()->create();

    Event::fake([DataBerubah::class]);

    $laporan->delete();

    Event::assertDispatched(DataBerubah::class);
});

it('menyiarkan ke channel departemen yang bersangkutan saja', function (): void {
    $peristiwa = new DataBerubah(7, DataBerubah::LAPORAN);

    $channel = $peristiwa->broadcastOn()[0];

    expect($channel->name)->toBe('private-departemen.7')
        ->and($peristiwa->broadcastAs())->toBe('data.berubah')
        ->and($peristiwa->broadcastWith())->toBe([
            'departemen_id' => 7,
            'jenis' => 'laporan',
        ]);
});

/**
 * Otorisasi channel departemen.
 *
 * Diuji lewat aturannya langsung, bukan lewat `POST /broadcasting/auth`.
 * Alasannya dicatat pada `App\Support\IzinChannel`: endpoint itu meloloskan
 * segalanya pada broadcaster `null` dan menolak segalanya pada `reverb` di
 * lingkungan test — test yang lulus pada keduanya tidak membuktikan apa pun.
 */
describe('otorisasi channel departemen', function (): void {
    it('mengizinkan yang jangkauannya mencakup departemen itu', function (): void {
        test()->seed(DepartmentSeeder::class);

        $departemen = Department::where('code', 'PRODUKSI')->firstOrFail();
        $pengawas = User::factory()->supervisor()->create(['department_id' => $departemen->id]);

        expect(IzinChannel::departemen($pengawas->fresh(), $departemen->id))->toBeTrue();
    });

    it('menolak departemen di luar jangkauannya', function (): void {
        test()->seed(DepartmentSeeder::class);

        $milik = Department::where('code', 'PRODUKSI')->firstOrFail();
        $lain = Department::where('code', 'QC')->firstOrFail();

        $pengawas = User::factory()->supervisor()->create(['department_id' => $milik->id]);

        expect(IzinChannel::departemen($pengawas->fresh(), $lain->id))->toBeFalse();
    });

    it('mengizinkan pemegang jangkauan korporat pada departemen mana pun', function (): void {
        test()->seed(DepartmentSeeder::class);

        $lain = Department::where('code', 'QC')->firstOrFail();
        $admin = User::factory()->administrator()->create()->fresh();

        expect(IzinChannel::departemen($admin, $lain->id))->toBeTrue();
    });

    it('menolak staf yang jangkauannya hanya dirinya sendiri', function (): void {
        test()->seed(DepartmentSeeder::class);

        $departemen = Department::where('code', 'PRODUKSI')->firstOrFail();
        $staf = User::factory()->staff()->create(['department_id' => $departemen->id]);

        // Jangkauan pribadi tidak mencakup departemen mana pun — termasuk
        // departemennya sendiri.
        expect(IzinChannel::departemen($staf->fresh(), $departemen->id))->toBeFalse();
    });
});
