<?php

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AdministratorSeeder;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;

// Seeder master data wajib idempotent — lihat ADR-008.

it('membuat empat role dengan tingkatan yang menaik', function (): void {
    $this->seed(RoleSeeder::class);

    expect(Role::count())->toBe(4);

    $level = Role::orderBy('level')->pluck('level', 'slug')->all();

    expect($level)->toBe([
        'staff' => 10,
        'supervisor' => 20,
        'manager' => 30,
        'administrator' => 40,
    ]);
});

it('membuat departemen dari PRD dan temuan berkas klien', function (): void {
    $this->seed(DepartmentSeeder::class);

    $kode = Department::pluck('code')->all();

    expect($kode)
        ->toContain('PRODUKSI', 'QA', 'QC', 'WAREHOUSE', 'DOC_CONTROL')
        ->toContain('EXIM', 'ICS', 'RETAIL_MND', 'GA_LEGAL');
});

it('tidak menggandakan data saat seeder dijalankan berulang', function (): void {
    $this->seed(RoleSeeder::class);
    $this->seed(DepartmentSeeder::class);

    $jumlahRole = Role::count();
    $jumlahDepartemen = Department::count();

    $this->seed(RoleSeeder::class);
    $this->seed(DepartmentSeeder::class);

    expect(Role::count())->toBe($jumlahRole);
    expect(Department::count())->toBe($jumlahDepartemen);
});

it('tidak menimpa perubahan administrator saat seeder dijalankan ulang', function (): void {
    $this->seed(RoleSeeder::class);
    $this->seed(DepartmentSeeder::class);
    $this->seed(AdministratorSeeder::class);

    $admin = User::where('email', 'admin@hbmcorp.co.id')->firstOrFail();
    $sandiSetelahDiubah = 'kata-sandi-yang-diganti-admin';
    $admin->forceFill(['password' => bcrypt($sandiSetelahDiubah)])->save();
    $hashTersimpan = $admin->fresh()->password;

    $this->seed(AdministratorSeeder::class);

    expect(User::where('email', 'admin@hbmcorp.co.id')->count())->toBe(1);
    expect($admin->fresh()->password)->toBe($hashTersimpan);
});

it('memberi administrator awal role administrator', function (): void {
    $this->seed(RoleSeeder::class);
    $this->seed(DepartmentSeeder::class);
    $this->seed(AdministratorSeeder::class);

    $admin = User::with('role')->where('email', 'admin@hbmcorp.co.id')->firstOrFail();

    expect($admin->isAdministrator())->toBeTrue();
    expect($admin->is_active)->toBeTrue();
});
