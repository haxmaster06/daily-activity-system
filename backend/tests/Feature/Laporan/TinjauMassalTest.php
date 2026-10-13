<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\User;
use App\Notifications\LaporanDitinjau;
use Database\Seeders\DepartmentSeeder;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

/*
 * Tandai tinjau sekaligus. Peninjau membersihkan antrean berisi banyak laporan
 * yang hanya perlu ditandai "sudah dibaca". Yang harus dijaga: yang tak
 * memenuhi syarat dilewati beserta alasannya — bukan menggagalkan semuanya —
 * dan tak satu pun laporan di luar wewenang peninjau ikut tertandai.
 */

function departemenTinjau(): Department
{
    test()->seed(DepartmentSeeder::class);

    return Department::where('code', 'PRODUKSI')->firstOrFail();
}

function laporanBerstatus(User $pemilik, string $status = DailyReport::STATUS_DIKIRIM): DailyReport
{
    return DailyReport::create([
        'user_id' => $pemilik->id,
        'department_id' => $pemilik->department_id,
        'report_date' => now()->subDays(random_int(1, 60))->toDateString(),
        'status' => $status,
    ]);
}

it('menandai beberapa laporan dikirim jadi ditinjau sekaligus', function (): void {
    Notification::fake();
    $dep = departemenTinjau();
    $peninjau = User::factory()->supervisor()->create(['department_id' => $dep->id]);

    $laporan = collect(range(1, 3))->map(
        fn () => laporanBerstatus(User::factory()->staff()->create(['department_id' => $dep->id])),
    );

    Sanctum::actingAs($peninjau);

    $this->postJson('/api/laporan/tinjau-massal', ['laporan_id' => $laporan->pluck('id')->all()])
        ->assertOk()
        ->assertJsonPath('data.ditinjau', 3)
        ->assertJsonPath('data.dilewati', []);

    expect(
        DailyReport::whereIn('id', $laporan->pluck('id'))
            ->where('status', DailyReport::STATUS_DITINJAU)
            ->count(),
    )->toBe(3);
    Notification::assertSentTimes(LaporanDitinjau::class, 3);
});

it('melewati yang tak memenuhi syarat dengan alasannya, meninjau sisanya', function (): void {
    $dep = departemenTinjau();
    $peninjau = User::factory()->supervisor()->create(['department_id' => $dep->id]);

    $sah = laporanBerstatus(User::factory()->staff()->create(['department_id' => $dep->id]));
    $sendiri = laporanBerstatus($peninjau);
    $draf = laporanBerstatus(
        User::factory()->staff()->create(['department_id' => $dep->id]),
        DailyReport::STATUS_DRAF,
    );
    $sudah = laporanBerstatus(
        User::factory()->staff()->create(['department_id' => $dep->id]),
        DailyReport::STATUS_DITINJAU,
    );

    Sanctum::actingAs($peninjau);

    $res = $this->postJson('/api/laporan/tinjau-massal', [
        'laporan_id' => [$sah->id, $sendiri->id, $draf->id, $sudah->id],
    ])->assertOk()->assertJsonPath('data.ditinjau', 1);

    expect($res->json('data.dilewati'))->toHaveCount(3);
    expect($sah->fresh()->status)->toBe(DailyReport::STATUS_DITINJAU);
    // Laporan sendiri tak boleh ikut tertandai.
    expect($sendiri->fresh()->status)->toBe(DailyReport::STATUS_DIKIRIM);
});

it('melewati laporan di luar jangkauan peninjau', function (): void {
    $dep = departemenTinjau();
    $lain = Department::where('code', 'QC')->firstOrFail();
    $peninjau = User::factory()->supervisor()->create(['department_id' => $dep->id]);
    $luar = laporanBerstatus(User::factory()->staff()->create(['department_id' => $lain->id]));

    Sanctum::actingAs($peninjau);

    $this->postJson('/api/laporan/tinjau-massal', ['laporan_id' => [$luar->id]])
        ->assertOk()
        ->assertJsonPath('data.ditinjau', 0);

    expect($luar->fresh()->status)->toBe(DailyReport::STATUS_DIKIRIM);
});

it('menolak pengguna tanpa izin meninjau', function (): void {
    $dep = departemenTinjau();
    Sanctum::actingAs(User::factory()->staff()->create(['department_id' => $dep->id]));

    $this->postJson('/api/laporan/tinjau-massal', ['laporan_id' => [1]])
        ->assertForbidden();
});

it('menolak daftar laporan kosong', function (): void {
    $dep = departemenTinjau();
    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $dep->id]));

    $this->postJson('/api/laporan/tinjau-massal', ['laporan_id' => []])
        ->assertStatus(422);
});
