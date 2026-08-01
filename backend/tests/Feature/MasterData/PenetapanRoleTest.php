<?php

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use App\Support\JangkauanData;
use Database\Factories\RoleFactory;
use Laravel\Sanctum\Sanctum;

function pengelola(): User
{
    $admin = User::factory()->administrator()->create([
        'department_id' => Department::factory(),
    ]);

    // Selalu ada pengelola cadangan supaya penjaga tidak ikut bicara.
    User::factory()->administrator()->create(['department_id' => Department::factory()]);

    Sanctum::actingAs($admin);

    return $admin;
}

it('memberi satu pengguna beberapa peran sekaligus', function (): void {
    pengelola();

    $produksi = Department::factory()->create(['code' => 'PROD_P', 'name' => 'Produksi']);
    $qc = Department::factory()->create(['code' => 'QC_P', 'name' => 'QC']);

    $target = User::factory()->staff()->create(['department_id' => $produksi->id]);

    $staff = RoleFactory::slug(Role::STAFF);
    $supervisor = RoleFactory::slug(Role::SUPERVISOR);

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'department_id' => $produksi->id,
        'penetapan' => [
            ['role_id' => $staff->id, 'scope_level' => JangkauanData::PERSONAL, 'department_id' => null],
            ['role_id' => $supervisor->id, 'scope_level' => JangkauanData::DEPARTEMEN, 'department_id' => $produksi->id],
            ['role_id' => $supervisor->id, 'scope_level' => JangkauanData::DEPARTEMEN, 'department_id' => $qc->id],
        ],
    ])->assertOk();

    $segar = $target->fresh();

    expect($segar->roles)->toHaveCount(3)
        ->and($segar->jangkauan()->level)->toBe(JangkauanData::DEPARTEMEN)
        ->and($segar->jangkauan()->departemenId)->toBe(collect([$produksi->id, $qc->id])->sort()->values()->all());
});

it('menyamakan cermin role_id dengan peran utama', function (): void {
    pengelola();

    $departemen = Department::factory()->create(['code' => 'PROD_P2']);
    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);

    $staff = RoleFactory::slug(Role::STAFF);
    $manager = RoleFactory::slug(Role::MANAGER);

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'department_id' => $departemen->id,
        'penetapan' => [
            ['role_id' => $staff->id, 'scope_level' => JangkauanData::PERSONAL, 'department_id' => null],
            ['role_id' => $manager->id, 'scope_level' => JangkauanData::KORPORAT, 'department_id' => null],
        ],
    ])->assertOk();

    // Jangkauan tertinggi yang menentukan peran utama.
    expect($target->fresh()->role_id)->toBe($manager->id);
});

it('menolak departemen pada jangkauan Pribadi dan Korporat', function (): void {
    pengelola();

    $departemen = Department::factory()->create(['code' => 'PROD_P3']);
    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $staff = RoleFactory::slug(Role::STAFF);

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'department_id' => $departemen->id,
        'penetapan' => [
            ['role_id' => $staff->id, 'scope_level' => JangkauanData::PERSONAL, 'department_id' => $departemen->id],
        ],
    ])->assertStatus(422)
        ->assertJsonStructure(['errors' => ['penetapan.0.department_id']]);
});

it('membuang penetapan kembar', function (): void {
    pengelola();

    $departemen = Department::factory()->create(['code' => 'PROD_P4']);
    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $staff = RoleFactory::slug(Role::STAFF);

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'department_id' => $departemen->id,
        'penetapan' => [
            ['role_id' => $staff->id, 'scope_level' => JangkauanData::PERSONAL, 'department_id' => null],
            ['role_id' => $staff->id, 'scope_level' => JangkauanData::PERSONAL, 'department_id' => null],
        ],
    ])->assertOk();

    // Indeks unik MySQL tidak menangkapnya karena NULL dianggap berbeda.
    expect($target->fresh()->roles)->toHaveCount(1);
});

it('masih menerima role_id tunggal sebagai bentuk lama', function (): void {
    pengelola();

    $departemen = Department::factory()->create(['code' => 'PROD_P5']);
    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $supervisor = RoleFactory::slug(Role::SUPERVISOR);

    $this->putJson("/api/pengguna/{$target->id}", [
        'name' => $target->name,
        'email' => $target->email,
        'department_id' => $departemen->id,
        'role_id' => $supervisor->id,
    ])->assertOk();

    $segar = $target->fresh();

    // Jangkauannya diambil dari bawaan perannya.
    expect($segar->roles->pluck('slug')->all())->toBe([Role::SUPERVISOR])
        ->and($segar->jangkauan()->level)->toBe(JangkauanData::DEPARTEMEN)
        ->and($segar->jangkauan()->departemenId)->toBe([$departemen->id]);
});

it('mengirim jangkauan dan izin hanya untuk dirinya sendiri', function (): void {
    $admin = pengelola();

    $sendiri = $this->getJson('/api/me')->assertOk()->json('data');

    expect($sendiri['jangkauan']['label'])->toBe('Korporat')
        ->and($sendiri['izin'])->toBeArray();

    $daftar = collect($this->getJson('/api/pengguna')->assertOk()->json('data'));
    $oranglain = $daftar->firstWhere('id', '!=', $admin->id);

    // Susunan hak akses orang lain bukan urusan siapa pun.
    expect($oranglain)->not->toHaveKey('izin')
        ->and($oranglain)->not->toHaveKey('jangkauan');
});

it('menyimpan penetapan lewat endpoint tersendiri', function (): void {
    pengelola();

    $departemen = Department::factory()->create(['code' => 'PROD_P6']);
    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);

    $supervisor = RoleFactory::slug(Role::SUPERVISOR);

    /*
     * Layar Penetapan Peran memakai jalur ini, bukan PUT /api/pengguna/{id}.
     * Sebelum ada uji ini, satu import yang tertinggal membuat endpoint-nya
     * gagal total sementara seluruh rangkaian test tetap hijau.
     */
    $this->putJson("/api/pengguna/{$target->id}/penetapan", [
        'penetapan' => [
            [
                'role_id' => $supervisor->id,
                'scope_level' => JangkauanData::DEPARTEMEN,
                'department_id' => $departemen->id,
            ],
        ],
    ])->assertOk();

    $segar = $target->fresh();

    expect($segar->roles->pluck('slug')->all())->toBe([Role::SUPERVISOR])
        ->and($segar->jangkauan()->departemenId)->toBe([$departemen->id]);
});

it('menolak penetapan lewat endpoint tersendiri tanpa izin mengelola', function (): void {
    $departemen = Department::factory()->create(['code' => 'PROD_P7']);
    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $departemen->id]));

    $target = User::factory()->staff()->create(['department_id' => $departemen->id]);

    $this->putJson("/api/pengguna/{$target->id}/penetapan", [
        'penetapan' => [
            ['role_id' => RoleFactory::slug(Role::STAFF)->id, 'scope_level' => 1, 'department_id' => null],
        ],
    ])->assertStatus(403);
});
