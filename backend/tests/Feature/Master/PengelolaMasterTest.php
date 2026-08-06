<?php

use App\Models\Department;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Models\Permission;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use App\Support\KatalogIzin;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Laravel\Sanctum\Sanctum;

/*
 * Daftar master yang salah tidak berhenti di satu layar — seluruh laporan yang
 * memilih dari sana ikut membawanya. Karena itu batas pengelolaannya diuji
 * dari dua arah: yang berwenang harus bisa, dan yang tidak harus ditolak.
 */

function jenisMaster(string $slug, ?Department $pengelola = null): MasterType
{
    $jenis = MasterType::create([
        'slug' => $slug,
        'name' => ucfirst($slug),
        'sort_order' => 1,
    ]);

    if ($pengelola !== null) {
        $jenis->departemenPengelola()->attach($pengelola);
    }

    return $jenis;
}

/**
 * Pengguna beserta izin master yang dibutuhkan.
 *
 * `IzinRoleSeeder` tidak ikut dijalankan di lingkungan test — hanya katalog
 * izinnya yang diisi — sehingga peran di sini berangkat tanpa izin apa pun.
 * Memberikannya di tempat ini membuat yang diuji benar-benar batas
 * departemennya, bukan ketiadaan izin yang kebetulan menghasilkan 403 yang
 * sama.
 */
function penggunaMaster(Department $departemen, string $peran = 'supervisor'): User
{
    $pengguna = User::factory()->{$peran}()->create(['department_id' => $departemen->id]);

    $pengguna->roles->first()?->permissions()->syncWithoutDetaching(
        Permission::whereIn('key', [KatalogIzin::MASTER_LIHAT, KatalogIzin::MASTER_KELOLA])
            ->pluck('id')
            ->all(),
    );

    return $pengguna->fresh();
}

function isiMaster(MasterType $jenis): MasterData
{
    return MasterData::create([
        'master_type_id' => $jenis->id,
        'code' => 'KODE-'.$jenis->id,
        'name' => 'Contoh',
        'is_active' => true,
    ]);
}

it('mengizinkan departemen pengelola menambah isi daftarnya', function (): void {
    $purchasing = Department::factory()->create(['code' => 'PURCH-UJI']);
    $jenis = jenisMaster('supplier-uji', $purchasing);

    Sanctum::actingAs(penggunaMaster($purchasing));

    $this->postJson("/api/master/{$jenis->slug}", ['name' => 'Supplier Baru'])
        ->assertCreated();
});

it('menolak departemen lain menambah isi daftar yang bukan wewenangnya', function (): void {
    $purchasing = Department::factory()->create(['code' => 'PURCH-UJI']);
    $produksi = Department::factory()->create(['code' => 'PROD-UJI']);
    $jenis = jenisMaster('supplier-uji', $purchasing);

    Sanctum::actingAs(penggunaMaster($produksi));

    $this->postJson("/api/master/{$jenis->slug}", ['name' => 'Supplier Selundupan'])
        ->assertForbidden();
});

it('menolak departemen lain menyunting maupun menghapus isinya', function (): void {
    $purchasing = Department::factory()->create(['code' => 'PURCH-UJI']);
    $produksi = Department::factory()->create(['code' => 'PROD-UJI']);
    $jenis = jenisMaster('supplier-uji', $purchasing);
    $baris = isiMaster($jenis);

    Sanctum::actingAs(penggunaMaster($produksi));

    $this->putJson("/api/master/{$jenis->slug}/{$baris->id}", ['name' => 'Diubah'])
        ->assertForbidden();
    $this->deleteJson("/api/master/{$jenis->slug}/{$baris->id}")
        ->assertForbidden();
});

/*
 * Kosong berarti terbuka. Tanpa aturan ini, memasang pembatasan akan mencabut
 * akses seluruh daftar yang sudah ada pada saat migration dijalankan.
 */
it('membiarkan daftar tanpa departemen pengelola tetap terbuka', function (): void {
    $produksi = Department::factory()->create(['code' => 'PROD-UJI']);
    $jenis = jenisMaster('satuan-uji');

    Sanctum::actingAs(penggunaMaster($produksi));

    $this->postJson("/api/master/{$jenis->slug}", ['name' => 'Kilogram'])
        ->assertCreated();
});

it('membiarkan pemegang jangkauan korporat mengelola daftar milik departemen mana pun', function (): void {
    $purchasing = Department::factory()->create(['code' => 'PURCH-UJI']);
    $jenis = jenisMaster('supplier-uji', $purchasing);

    Sanctum::actingAs(penggunaMaster(Department::factory()->create(), 'administrator'));

    $this->postJson("/api/master/{$jenis->slug}", ['name' => 'Supplier Korporat'])
        ->assertCreated();
});

/*
 * Membaca tetap terbuka: kolom laporan yang mengambil pilihannya dari daftar
 * master tidak dapat diisi tanpa membacanya.
 */
it('membiarkan departemen mana pun membaca daftar yang bukan wewenangnya', function (): void {
    $purchasing = Department::factory()->create(['code' => 'PURCH-UJI']);
    $produksi = Department::factory()->create(['code' => 'PROD-UJI']);
    $jenis = jenisMaster('supplier-uji', $purchasing);
    isiMaster($jenis);

    Sanctum::actingAs(penggunaMaster($produksi, 'staff'));

    $this->getJson("/api/master/{$jenis->slug}")->assertOk();
});

/*
 * Penetapan pengelola harus tertutup bagi yang dibatasinya. Bila tidak, siapa
 * pun yang dibatasi cukup menambahkan departemennya sendiri dan batas itu
 * terbuka sendiri.
 */
it('menolak pemegang non-korporat mengubah daftar departemen pengelola', function (): void {
    $purchasing = Department::factory()->create(['code' => 'PURCH-UJI']);
    $produksi = Department::factory()->create(['code' => 'PROD-UJI']);
    $jenis = jenisMaster('supplier-uji', $purchasing);

    Sanctum::actingAs(penggunaMaster($produksi));

    $this->putJson("/api/master/jenis/{$jenis->slug}", [
        'name' => $jenis->name,
        'departemen_id' => [$produksi->id],
    ]);

    expect($jenis->fresh()->departemenPengelola->pluck('id')->all())
        ->toBe([$purchasing->id]);
});

/*
 * Penghapusan jenis master.
 *
 * Yang menahannya bukan tanda "bawaan sistem" — tanda itu hanya menyatakan
 * daftarnya dibuat seeder, dan bukan alasan yang dapat dijelaskan kepada
 * administrator yang memang tidak memakai daftar itu. Yang menahan adalah
 * rujukan yang masih hidup.
 */
it('mengizinkan menghapus jenis bawaan sistem yang tidak dirujuk siapa pun', function (): void {
    $jenis = jenisMaster('satuan-uji');
    $jenis->forceFill(['is_system' => true])->save();

    Sanctum::actingAs(penggunaMaster(Department::factory()->create(), 'administrator'));

    $this->deleteJson("/api/master/jenis/{$jenis->slug}")->assertOk();

    expect(MasterType::whereKey($jenis->id)->exists())->toBeFalse();
});

it('menolak menghapus jenis yang masih dipakai kolom template', function (): void {
    $jenis = jenisMaster('supplier-uji');

    // Tidak ada factory untuk keduanya — dibuat langsung dengan kolom
    // seperlunya, sebab yang diuji rujukannya, bukan bentuk templatenya.
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    $template = ReportTemplate::firstOrFail();

    // Lewat relasinya: `report_template_id` sengaja di luar fillable.
    $template->fields()->create([
        'key' => 'kolom_uji',
        'label' => 'Kolom Uji',
        'type' => TemplateField::TIPE_MASTER,
        'master_type_id' => $jenis->id,
        'sort_order' => 99,
    ]);

    Sanctum::actingAs(penggunaMaster(Department::factory()->create(), 'administrator'));

    $this->deleteJson("/api/master/jenis/{$jenis->slug}")->assertStatus(422);

    expect(MasterType::whereKey($jenis->id)->exists())->toBeTrue();
});
