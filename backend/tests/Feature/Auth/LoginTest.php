<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(function (): void {
    RateLimiter::clear('login');
});

it('memberi token dan data pengguna saat kredensial benar', function (): void {
    $user = User::factory()->staff()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Berhasil masuk.')
        ->assertJsonPath('data.pengguna.id', $user->id)
        ->assertJsonPath('data.pengguna.role.slug', 'staff')
        ->assertJsonStructure(['data' => ['token', 'kedaluwarsa_pada', 'pengguna']]);

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();
});

it('tidak pernah mengirim kata sandi maupun remember token', function (): void {
    User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    expect($response->getContent())
        ->not->toContain('kata-sandi-benar')
        ->not->toContain('remember_token')
        ->not->toContain('$2y$');
});

it('menolak kata sandi yang salah', function (): void {
    User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'salah',
    ])
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Email atau kata sandi tidak sesuai.');
});

it('memberi pesan sama untuk email tidak terdaftar dan kata sandi salah', function (): void {
    User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    $emailTidakAda = $this->postJson('/api/login', [
        'email' => 'bukan-siapa-siapa@hbmcorp.co.id',
        'password' => 'apa-saja',
    ]);

    $sandiSalah = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'salah',
    ]);

    // Pesan berbeda akan membocorkan email mana yang terdaftar.
    expect($emailTidakAda->json('message'))->toBe($sandiSalah->json('message'));
    expect($emailTidakAda->status())->toBe($sandiSalah->status());
});

it('menolak akun yang dinonaktifkan', function (): void {
    User::factory()->nonaktif()->create([
        'email' => 'mantan@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    $this->postJson('/api/login', [
        'email' => 'mantan@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ])
        ->assertForbidden()
        ->assertJsonPath('message', 'Akun Anda tidak aktif. Hubungi administrator.');
});

it('memvalidasi isian yang kosong dengan pesan Bahasa Indonesia', function (): void {
    $response = $this->postJson('/api/login', []);

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Periksa kembali isian Anda.');

    expect($response->json('errors.email.0'))->toContain('wajib diisi');
    expect($response->json('errors.password.0'))->toContain('wajib diisi');
});

it('menahan brute force setelah lima percobaan gagal', function (): void {
    User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'kata-sandi-benar',
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/login', [
            'email' => 'ahmad@hbmcorp.co.id',
            'password' => 'tebakan-'.$i,
        ])->assertUnauthorized();
    }

    $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'tebakan-6',
    ])
        ->assertStatus(429)
        ->assertJsonPath('message', 'Terlalu banyak percobaan masuk. Coba lagi dalam satu menit.');
});

it('mengunci per akun, bukan seluruh alamat IP', function (): void {
    User::factory()->create(['email' => 'korban@hbmcorp.co.id', 'password' => 'rahasia']);
    User::factory()->create(['email' => 'rekan@hbmcorp.co.id', 'password' => 'rahasia']);

    for ($i = 0; $i < 6; $i++) {
        $this->postJson('/api/login', [
            'email' => 'korban@hbmcorp.co.id',
            'password' => 'tebakan',
        ]);
    }

    // Rekan sekantor pada IP yang sama tetap bisa masuk.
    $this->postJson('/api/login', [
        'email' => 'rekan@hbmcorp.co.id',
        'password' => 'rahasia',
    ])->assertOk();
});

it('memperpanjang masa berlaku token saat "Ingat saya" dicentang', function (): void {
    config()->set('sanctum.expiration', 480);
    config()->set('sanctum.expiration_remembered', 10080);

    User::factory()->create(['email' => 'ahmad@hbmcorp.co.id', 'password' => 'rahasia']);

    $biasa = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ])->json('data.kedaluwarsa_pada');

    $diingat = $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
        'ingat' => true,
    ])->json('data.kedaluwarsa_pada');

    expect(strtotime($diingat))->toBeGreaterThan(strtotime($biasa));
});

it('mencatat waktu masuk terakhir', function (): void {
    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    expect($user->last_login_at)->toBeNull();

    $this->postJson('/api/login', [
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ])->assertOk();

    expect($user->fresh()->last_login_at)->not->toBeNull();
});

/** Masuk lalu mengembalikan tokennya. */
function masukSebagai(string $email, string $kataSandi = 'rahasia'): string
{
    return test()->postJson('/api/login', ['email' => $email, 'password' => $kataSandi])
        ->assertOk()
        ->json('data.token');
}

it('membiarkan satu akun dipakai di beberapa perangkat', function (): void {
    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    $tokenPertama = masukSebagai('ahmad@hbmcorp.co.id');
    masukSebagai('ahmad@hbmcorp.co.id');

    lupakanAutentikasi();

    // Komputer di ruang kerja dan ponsel di lapangan adalah pemakaian wajar;
    // masuk di satu perangkat tidak boleh mengeluarkan yang lain.
    $this->withHeader('Authorization', "Bearer {$tokenPertama}")
        ->getJson('/api/me')
        ->assertOk();

    expect($user->tokens()->count())->toBe(2);
});

it('membuang token tertua setelah melewati batas perangkat', function (): void {
    config(['dams.sesi.maksimal_perangkat' => 3]);

    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    $tokenTertua = masukSebagai('ahmad@hbmcorp.co.id');
    masukSebagai('ahmad@hbmcorp.co.id');
    masukSebagai('ahmad@hbmcorp.co.id');

    expect($user->tokens()->count())->toBe(3);

    // Perangkat keempat: yang tertua dibuang, bukan yang baru ditolak.
    masukSebagai('ahmad@hbmcorp.co.id');

    lupakanAutentikasi();

    expect($user->tokens()->count())->toBe(3);

    $this->withHeader('Authorization', "Bearer {$tokenTertua}")
        ->getJson('/api/me')
        ->assertUnauthorized();
});

it('membuang token yang sudah lewat masa berlakunya saat masuk', function (): void {
    $user = User::factory()->create([
        'email' => 'ahmad@hbmcorp.co.id',
        'password' => 'rahasia',
    ]);

    $user->createToken('lama', expiresAt: now()->subMinute());

    expect($user->tokens()->count())->toBe(1);

    masukSebagai('ahmad@hbmcorp.co.id');

    // Token mati tidak boleh ikut memakan jatah perangkat.
    expect($user->tokens()->count())->toBe(1);
});

it('menolak token yang sudah lewat masa berlakunya', function (): void {
    $user = User::factory()->create(['email' => 'ahmad@hbmcorp.co.id', 'password' => 'rahasia']);

    $token = masukSebagai('ahmad@hbmcorp.co.id');

    $user->tokens()->update(['expires_at' => now()->subMinute()]);

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/me')
        ->assertUnauthorized();
});

it('memperpanjang masa berlaku sesi selama aplikasi dipakai', function (): void {
    config(['dams.sesi.menit' => 720, 'dams.sesi.ambang_perpanjangan' => 0.5]);

    $user = User::factory()->create(['email' => 'ahmad@hbmcorp.co.id', 'password' => 'rahasia']);

    $token = masukSebagai('ahmad@hbmcorp.co.id');

    // Sisa umur ditipiskan sampai di bawah ambang.
    $user->tokens()->update(['expires_at' => now()->addMinutes(60)]);
    $sebelum = $user->tokens()->first()->expires_at;

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/me')->assertOk();

    $sesudah = $user->tokens()->first()->expires_at;

    // Pengguna yang sedang bekerja tidak boleh terputus di tengah jalan.
    expect($sesudah->gt($sebelum))->toBeTrue()
        ->and(now()->diffInMinutes($sesudah))->toBeGreaterThan(700);
});

it('tidak menulis ulang masa berlaku pada tiap permintaan', function (): void {
    config(['dams.sesi.ambang_perpanjangan' => 0.5]);

    $user = User::factory()->create(['email' => 'ahmad@hbmcorp.co.id', 'password' => 'rahasia']);

    $token = masukSebagai('ahmad@hbmcorp.co.id');
    $sebelum = $user->tokens()->first()->expires_at;

    lupakanAutentikasi();

    $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/me')->assertOk();

    // Sisa umurnya masih penuh; menggesernya hanya membuang tulisan ke basis data.
    expect($user->tokens()->first()->expires_at->equalTo($sebelum))->toBeTrue();
});
