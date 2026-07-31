<?php

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Support\JangkauanData;
use Database\Factories\RoleFactory;
use Laravel\Sanctum\Sanctum;

/**
 * Jangkauan data laporan (CLAUDE.md, Aturan API).
 *
 * Daftar dan detail harus sepakat: laporan yang tidak muncul di daftar juga
 * tidak boleh dapat dibuka lewat alamat langsung. Kebocoran justru sering
 * lahir dari kedua jalur yang aturannya berbeda.
 */
function susunLaporanLintasDepartemen(): array
{
    $produksi = Department::factory()->create(['code' => 'PRODUKSI_UJI', 'name' => 'Produksi']);
    $qc = Department::factory()->create(['code' => 'QC_UJI', 'name' => 'QC']);

    $staffProduksi = User::factory()->staff()->create(['department_id' => $produksi->id]);
    $rekanProduksi = User::factory()->staff()->create(['department_id' => $produksi->id]);
    $staffQc = User::factory()->staff()->create(['department_id' => $qc->id]);

    return [
        'produksi' => $produksi,
        'qc' => $qc,
        'staffProduksi' => $staffProduksi,
        'laporanSendiri' => DailyReport::factory()->milik($staffProduksi)
            ->create(['report_date' => '2026-07-01']),
        'laporanRekan' => DailyReport::factory()->milik($rekanProduksi)
            ->create(['report_date' => '2026-07-02']),
        'laporanDepartemenLain' => DailyReport::factory()->milik($staffQc)
            ->create(['report_date' => '2026-07-03']),
    ];
}

it('Staff hanya melihat laporannya sendiri', function (): void {
    $data = susunLaporanLintasDepartemen();
    Sanctum::actingAs($data['staffProduksi']);

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    expect($id)->toContain($data['laporanSendiri']->id)
        ->not->toContain($data['laporanRekan']->id)
        ->not->toContain($data['laporanDepartemenLain']->id);
});

it('Staff tidak dapat membuka laporan rekan lewat alamat langsung', function (): void {
    $data = susunLaporanLintasDepartemen();
    Sanctum::actingAs($data['staffProduksi']);

    $this->getJson("/api/laporan/{$data['laporanRekan']->id}")->assertForbidden();
});

it('Supervisor melihat seluruh laporan departemennya, bukan departemen lain', function (): void {
    $data = susunLaporanLintasDepartemen();

    Sanctum::actingAs(
        User::factory()->supervisor()->create(['department_id' => $data['produksi']->id]),
    );

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    expect($id)->toContain($data['laporanSendiri']->id, $data['laporanRekan']->id)
        ->not->toContain($data['laporanDepartemenLain']->id);
});

it('Supervisor ditolak membuka laporan departemen lain', function (): void {
    $data = susunLaporanLintasDepartemen();

    Sanctum::actingAs(
        User::factory()->supervisor()->create(['department_id' => $data['produksi']->id]),
    );

    $this->getJson("/api/laporan/{$data['laporanDepartemenLain']->id}")->assertForbidden();
});

it('Manager melihat laporan seluruh departemen', function (): void {
    $data = susunLaporanLintasDepartemen();
    Sanctum::actingAs(User::factory()->manager()->create());

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    expect($id)->toContain(
        $data['laporanSendiri']->id,
        $data['laporanRekan']->id,
        $data['laporanDepartemenLain']->id,
    );
});

it('Administrator melihat laporan seluruh departemen', function (): void {
    $data = susunLaporanLintasDepartemen();
    Sanctum::actingAs(User::factory()->administrator()->create());

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    expect($id)->toContain($data['laporanDepartemenLain']->id);
});

it('menyaring laporan berdasarkan rentang tanggal', function (): void {
    $data = susunLaporanLintasDepartemen();
    Sanctum::actingAs(User::factory()->manager()->create());

    $id = collect(
        $this->getJson('/api/laporan?dari=2026-07-02&sampai=2026-07-03')->json('data'),
    )->pluck('id');

    expect($id)->toContain($data['laporanRekan']->id, $data['laporanDepartemenLain']->id)
        ->not->toContain($data['laporanSendiri']->id);
});

it('Supervisor dapat menandai laporan anggota sudah ditinjau', function (): void {
    $data = susunLaporanLintasDepartemen();
    $data['laporanRekan']->forceFill([
        'status' => DailyReport::STATUS_DIKIRIM,
        'submitted_at' => now(),
    ])->save();

    $supervisor = User::factory()->supervisor()->create([
        'department_id' => $data['produksi']->id,
    ]);
    Sanctum::actingAs($supervisor);

    $this->postJson("/api/laporan/{$data['laporanRekan']->id}/tinjau", [
        'catatan' => 'Sudah sesuai.',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'ditinjau')
        ->assertJsonPath('data.catatan_tinjauan', 'Sudah sesuai.');
});

it('menolak meninjau laporan sendiri', function (): void {
    $supervisor = User::factory()->supervisor()->create();
    $laporan = DailyReport::factory()->milik($supervisor)->dikirim()->create();

    Sanctum::actingAs($supervisor);

    // Meninjau laporan sendiri membuat tinjauannya tidak berarti apa-apa.
    $this->postJson("/api/laporan/{$laporan->id}/tinjau")->assertForbidden();
});

it('menolak Staff meninjau laporan siapa pun', function (): void {
    $data = susunLaporanLintasDepartemen();
    $data['laporanRekan']->forceFill(['status' => DailyReport::STATUS_DIKIRIM])->save();

    Sanctum::actingAs($data['staffProduksi']);

    $this->postJson("/api/laporan/{$data['laporanRekan']->id}/tinjau")->assertForbidden();
});

it('menolak meninjau laporan yang masih draf', function (): void {
    $data = susunLaporanLintasDepartemen();

    Sanctum::actingAs(
        User::factory()->supervisor()->create(['department_id' => $data['produksi']->id]),
    );

    // Draf belum selesai dikerjakan; meninjaunya tidak punya arti.
    $this->postJson("/api/laporan/{$data['laporanRekan']->id}/tinjau")->assertForbidden();
});

/*
 * Jangkauan sejak berpindah ke penetapan peran: satu orang dapat memantau
 * beberapa departemen, dan yang tidak memegang penetapan apa pun tidak
 * memperoleh apa-apa.
 */

it('melihat seluruh departemen yang tercakup penetapannya', function (): void {
    $data = susunLaporanLintasDepartemen();

    $pemantau = User::factory()->supervisor()->create([
        'department_id' => $data['produksi']->id,
    ]);

    $supervisor = RoleFactory::slug(Role::SUPERVISOR);

    $pemantau->syncRoles([
        ['role_id' => $supervisor->id, 'scope_level' => JangkauanData::DEPARTEMEN, 'department_id' => $data['produksi']->id],
        ['role_id' => $supervisor->id, 'scope_level' => JangkauanData::DEPARTEMEN, 'department_id' => $data['qc']->id],
    ]);

    Sanctum::actingAs($pemantau->fresh());

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    expect($id)->toContain($data['laporanRekan']->id)
        ->toContain($data['laporanDepartemenLain']->id);
});

it('memakai jangkauan tertinggi bila penetapannya bercampur', function (): void {
    $data = susunLaporanLintasDepartemen();

    $pengguna = User::factory()->staff()->create(['department_id' => $data['produksi']->id]);

    $staff = RoleFactory::slug(Role::STAFF);
    $supervisor = RoleFactory::slug(Role::SUPERVISOR);

    $pengguna->syncRoles([
        ['role_id' => $staff->id, 'scope_level' => JangkauanData::PERSONAL, 'department_id' => null],
        ['role_id' => $supervisor->id, 'scope_level' => JangkauanData::DEPARTEMEN, 'department_id' => $data['produksi']->id],
    ]);

    Sanctum::actingAs($pengguna->fresh());

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    // Peran tambahan menambah akses, tidak menguranginya.
    expect($id)->toContain($data['laporanRekan']->id)
        ->not->toContain($data['laporanDepartemenLain']->id);
});

it('tidak memberi akses apa pun kepada pengguna tanpa penetapan peran', function (): void {
    $data = susunLaporanLintasDepartemen();

    $tanpaPeran = User::factory()->create(['department_id' => $data['produksi']->id]);
    $tanpaPeran->syncRoles([]);

    Sanctum::actingAs($tanpaPeran->fresh());

    // Deny by default: belum diatur berarti belum boleh apa-apa.
    $this->getJson('/api/laporan')->assertForbidden();
});

it('tetap menampilkan laporan sendiri setelah pengguna dipindah departemen', function (): void {
    $data = susunLaporanLintasDepartemen();

    // Laporan menyimpan departemen saat dibuat dan tidak ikut berpindah.
    $data['staffProduksi']->forceFill(['department_id' => $data['qc']->id])->save();

    Sanctum::actingAs($data['staffProduksi']->fresh());

    $id = collect($this->getJson('/api/laporan')->json('data'))->pluck('id');

    expect($id)->toContain($data['laporanSendiri']->id);
});
