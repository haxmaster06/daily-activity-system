<?php

use App\Models\Department;
use App\Models\User;
use App\Support\FotoProfil;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

it('menampilkan profil sendiri beserta tanggal bergabung', function (): void {
    $departemen = Department::factory()->create(['name' => 'Produksi']);
    $pengguna = User::factory()->staff()->create([
        'name' => 'Ahmad Fauzi',
        'department_id' => $departemen->id,
    ]);

    Sanctum::actingAs($pengguna);

    $this->getJson('/api/profil')
        ->assertOk()
        ->assertJsonPath('data.pengguna.nama', 'Ahmad Fauzi')
        ->assertJsonPath('data.pengguna.departemen.nama', 'Produksi')
        ->assertJsonStructure(['data' => ['pengguna', 'bergabung_pada', 'masuk_terakhir']]);
});

it('mengizinkan pengguna mengubah namanya sendiri', function (): void {
    $pengguna = User::factory()->staff()->create(['name' => 'Ahmad']);
    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil', ['name' => 'Ahmad Fauzi'])
        ->assertOk()
        ->assertJsonPath('message', 'Profil berhasil diperbarui.');

    expect($pengguna->fresh()->name)->toBe('Ahmad Fauzi');
});

it('tidak mengizinkan pengguna mengubah role atau departemennya sendiri', function (): void {
    $departemenLain = Department::factory()->create();
    $pengguna = User::factory()->staff()->create();
    $roleAwal = $pengguna->role_id;
    $departemenAwal = $pengguna->department_id;

    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil', [
        'name' => 'Ahmad',
        'role_id' => 999,
        'department_id' => $departemenLain->id,
    ])->assertOk();

    $pengguna->refresh();

    expect($pengguna->role_id)->toBe($roleAwal)
        ->and($pengguna->department_id)->toBe($departemenAwal);
});

it('mengubah kata sandi setelah kata sandi lama terbukti benar', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'kata-sandi-lama',
        'kata_sandi_baru' => 'kata-sandi-baru',
        'kata_sandi_baru_confirmation' => 'kata-sandi-baru',
    ])
        ->assertOk()
        ->assertJsonPath('message', 'Kata sandi berhasil diperbarui.');

    expect(Hash::check('kata-sandi-baru', $pengguna->fresh()->password))->toBeTrue();
});

it('menolak ubah kata sandi bila kata sandi lama salah', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $response = $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'tebakan',
        'kata_sandi_baru' => 'kata-sandi-baru',
        'kata_sandi_baru_confirmation' => 'kata-sandi-baru',
    ]);

    $response->assertStatus(422);
    expect($response->json('errors.kata_sandi_lama.0'))->toBe('Kata sandi lama tidak sesuai.');
    expect(Hash::check('kata-sandi-lama', $pengguna->fresh()->password))->toBeTrue();
});

it('menolak kata sandi baru yang sama dengan yang lama', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $response = $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'kata-sandi-lama',
        'kata_sandi_baru' => 'kata-sandi-lama',
        'kata_sandi_baru_confirmation' => 'kata-sandi-lama',
    ]);

    $response->assertStatus(422);
    expect($response->json('errors.kata_sandi_baru.0'))
        ->toBe('Kata sandi baru harus berbeda dari kata sandi lama.');
});

it('menolak kata sandi baru tanpa konfirmasi yang cocok', function (): void {
    $pengguna = User::factory()->staff()->create(['password' => 'kata-sandi-lama']);
    Sanctum::actingAs($pengguna);

    $this->putJson('/api/profil/kata-sandi', [
        'kata_sandi_lama' => 'kata-sandi-lama',
        'kata_sandi_baru' => 'kata-sandi-baru',
        'kata_sandi_baru_confirmation' => 'salah-ketik',
    ])
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['kata_sandi_baru']]);
});

it('mencabut token perangkat lain tetapi mempertahankan sesi yang sedang dipakai', function (): void {
    $pengguna = User::factory()->staff()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-lama',
    ]);

    // Perangkat lama meninggalkan satu token yang masih berlaku.
    $pengguna->createToken('perangkat-lama');

    $token = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-lama',
    ])->json('data.token');

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson('/api/profil/kata-sandi', [
            'kata_sandi_lama' => 'kata-sandi-lama',
            'kata_sandi_baru' => 'kata-sandi-baru',
            'kata_sandi_baru_confirmation' => 'kata-sandi-baru',
        ])
        ->assertOk();

    expect($pengguna->fresh()->tokens()->count())->toBe(1);

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/profil')
        ->assertOk();
});

/**
 * Foto profil.
 *
 * Yang diuji bukan bahwa berkasnya tersimpan — itu bagian yang paling mudah —
 * melainkan bahwa berkas yang tersimpan **bukan berkas yang diunggah**. Gambar
 * digambar ulang lewat GD, sehingga metadata EXIF, muatan yang ditempelkan di
 * belakang gambar, dan ukuran piksel raksasa ikut hilang bersamanya.
 */
describe('foto profil', function (): void {
    beforeEach(function (): void {
        Storage::fake('local');
    });

    it('menyimpan foto dan menyebutkan alamatnya pada profil', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('saya.jpg', 800, 600),
        ])->assertOk();

        $pengguna->refresh();

        expect($pengguna->avatar_path)->not->toBeNull();
        Storage::disk('local')->assertExists($pengguna->avatar_path);

        $this->getJson('/api/profil')
            ->assertOk()
            ->assertJsonPath(
                'data.pengguna.foto',
                "/api/foto/{$pengguna->id}?v=".mb_substr(sha1($pengguna->avatar_path), 0, 8),
            );
    });

    /*
     * Alamat fotonya tidak pernah berubah meski fotonya diganti, sedangkan
     * jawabannya boleh ditembolokkan peramban. Tanpa penanda versi, foto yang
     * baru disimpan tetap menampilkan foto lama — dan pengguna menyimpulkan
     * penyimpanannya gagal.
     */
    it('mengubah alamat fotonya setiap kali fotonya diganti', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $alamat = function () {
            return $this->getJson('/api/profil')->assertOk()->json('data.pengguna.foto');
        };

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('pertama.jpg'),
        ])->assertOk();

        $pertama = $alamat();

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('kedua.jpg'),
        ])->assertOk();

        expect($alamat())->not->toBe($pertama);
    });

    /*
     * Berkas aslinya tidak pernah tersimpan apa adanya. Berkas yang sah sebagai
     * JPEG **dan** dapat dijalankan sebagai skrip adalah teknik yang sudah tua
     * dan masih berhasil; menggambar ulang menghapus seluruh isi selain
     * pikselnya.
     */
    it('menyimpan hasil gambar ulang, bukan bita berkas aslinya', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $berkas = UploadedFile::fake()->image('saya.jpg', 300, 300);
        file_put_contents(
            $berkas->getRealPath(),
            file_get_contents($berkas->getRealPath())."\n<?php echo 'halo'; ?>",
        );

        $this->postJson('/api/profil/foto', ['foto' => $berkas])->assertOk();

        $isi = Storage::disk('local')->get($pengguna->fresh()->avatar_path);

        expect($isi)->not->toContain('<?php');
    });

    it('memotong foto menjadi persegi dan membatasi sisinya', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('lebar.jpg', 1600, 900),
        ])->assertOk();

        $ukuran = getimagesizefromstring(
            Storage::disk('local')->get($pengguna->fresh()->avatar_path),
        );

        expect($ukuran[0])->toBe(FotoProfil::SISI)
            ->and($ukuran[1])->toBe(FotoProfil::SISI);
    });

    it('menolak berkas yang bukan gambar', function (): void {
        Sanctum::actingAs(User::factory()->staff()->create());

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->create('daftar.pdf', 20, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('foto');
    });

    /*
     * Foto lama dihapus supaya penyimpanan tidak menumpuk berkas yang tidak
     * pernah ditampilkan lagi — satu orang yang berganti foto sepuluh kali
     * meninggalkan sembilan berkas yatim.
     */
    it('menghapus foto lama saat diganti', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('pertama.jpg'),
        ])->assertOk();

        $lama = $pengguna->fresh()->avatar_path;

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('kedua.jpg'),
        ])->assertOk();

        expect($pengguna->fresh()->avatar_path)->not->toBe($lama);
        Storage::disk('local')->assertMissing($lama);
    });

    it('menghapus foto beserta berkasnya saat diminta', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('saya.jpg'),
        ])->assertOk();

        $jalur = $pengguna->fresh()->avatar_path;

        $this->deleteJson('/api/profil/foto')->assertOk();

        expect($pengguna->fresh()->avatar_path)->toBeNull();
        Storage::disk('local')->assertMissing($jalur);
    });

    it('menyajikan fotonya sebagai gambar', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('saya.jpg'),
        ])->assertOk();

        $this->get("/api/pengguna/{$pengguna->id}/foto")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
    });

    /*
     * Foto orang bukan berkas yang boleh diambil siapa pun yang menebak
     * alamatnya. Berkasnya berada di cakram lokal — di luar direktori publik —
     * dan endpoint penyajinya tetap menuntut sesi.
     */
    it('menolak menyajikan foto kepada yang belum masuk', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->postJson('/api/profil/foto', [
            'foto' => UploadedFile::fake()->image('saya.jpg'),
        ])->assertOk();

        lupakanAutentikasi();

        $this->getJson("/api/pengguna/{$pengguna->id}/foto")->assertUnauthorized();
    });

    it('menjawab 404 untuk pengguna yang belum punya foto', function (): void {
        $pengguna = User::factory()->staff()->create();
        Sanctum::actingAs($pengguna);

        $this->getJson("/api/pengguna/{$pengguna->id}/foto")->assertNotFound();
    });
});
