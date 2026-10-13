<?php

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\ReportTemplate;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Laravel\Sanctum\Sanctum;

/** Template umum yang berlaku lintas departemen, beserta departemen masternya. */
function siapkanMaster(): ReportTemplate
{
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    return ReportTemplate::where('code', 'AKTIVITAS_UMUM')->firstOrFail();
}

function muatanLaporan(ReportTemplate $template, ?array $baris = null): array
{
    return [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $template->id,
            'items' => $baris ?? [[
                'aktivitas' => 'Memeriksa mesin oven',
                'keterangan' => 'Berjalan normal',
                'target_penyelesaian' => 'Hari ini',
                'status' => 'selesai',
            ]],
        ]],
    ];
}

it('menyimpan laporan baru sebagai draf', function (): void {
    $template = siapkanMaster();
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $this->postJson('/api/laporan', muatanLaporan($template))
        ->assertCreated()
        ->assertJsonPath('message', 'Laporan berhasil disimpan sebagai draf.')
        ->assertJsonPath('data.status', 'draf')
        ->assertJsonPath('data.dapat_disunting', true)
        ->assertJsonPath('data.bagian.0.baris.0.nilai.aktivitas', 'Memeriksa mesin oven');

    expect(DailyReport::where('user_id', $pengguna->id)->count())->toBe(1);
});

it('menyalin departemen penyusun ke laporan', function (): void {
    $template = siapkanMaster();
    $departemen = Department::where('code', 'PRODUKSI')->firstOrFail();
    $pengguna = User::factory()->staff()->create(['department_id' => $departemen->id]);
    Sanctum::actingAs($pengguna);

    $this->postJson('/api/laporan', muatanLaporan($template))->assertCreated();

    // Disalin, bukan dibaca lewat relasi: pengguna dapat pindah departemen.
    expect(DailyReport::first()->department_id)->toBe($departemen->id);
});

it('menolak laporan kedua pada tanggal yang sama', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/laporan', muatanLaporan($template))->assertCreated();

    $response = $this->postJson('/api/laporan', muatanLaporan($template));

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('sudah ada');
});

it('menolak laporan untuk tanggal yang belum terjadi', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    $muatan = muatanLaporan($template);
    $muatan['report_date'] = now()->addDay()->toDateString();

    $response = $this->postJson('/api/laporan', $muatan);

    $response->assertStatus(422);
    expect($response->json('errors')['report_date'][0])
        ->toBe('Laporan tidak dapat dibuat untuk tanggal yang belum terjadi.');
});

it('memvalidasi isian wajib sesuai definisi kolom template', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    // `aktivitas` dan `status` wajib pada AKTIVITAS_UMUM.
    $response = $this->postJson('/api/laporan', muatanLaporan($template, [
        ['keterangan' => 'Hanya keterangan'],
    ]));

    $response->assertStatus(422);

    $galat = $response->json('errors');
    expect($galat)->toHaveKey('sections.0.items.0.aktivitas');
    expect($galat)->toHaveKey('sections.0.items.0.status');
});

it('memakai label kolom pada pesan galat, bukan kunci teknisnya', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    $response = $this->postJson('/api/laporan', muatanLaporan($template, [
        ['keterangan' => 'Tanpa aktivitas'],
    ]));

    // Pesan memakai label kolom, bukan jalur teknisnya (standarisasi §26).
    $pesan = $response->json('errors')['sections.0.items.0.aktivitas'][0];

    expect(mb_strtolower($pesan))->toContain('aktivitas');
    expect($pesan)->not->toContain('sections.0.items');
});

it('menolak nilai di luar daftar pilihan kolom select', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    $response = $this->postJson('/api/laporan', muatanLaporan($template, [
        ['aktivitas' => 'Uji', 'status' => 'status_karangan'],
    ]));

    $response->assertStatus(422);
    expect($response->json('errors'))->toHaveKey('sections.0.items.0.status');
});

it('membuang kunci yang tidak dikenal template', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/laporan', muatanLaporan($template, [[
        'aktivitas' => 'Uji',
        'status' => 'selesai',
        'kolom_selundupan' => 'nilai yang tidak diminta',
    ]]))->assertCreated();

    $data = DailyReportItem::first()->data;

    expect($data)->not->toHaveKey('kolom_selundupan');
    expect($data)->toHaveKey('aktivitas');
});

it('mendenormalisasi status baris ke kolom tersendiri agar dapat disaring', function (): void {
    $template = siapkanMaster();
    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/laporan', muatanLaporan($template, [
        ['aktivitas' => 'Satu', 'status' => 'selesai'],
        ['aktivitas' => 'Dua', 'status' => 'dalam_proses'],
    ]))->assertCreated();

    // Diurutkan eksplisit: tanpa ORDER BY, urutan baris tidak dijamin.
    expect(DailyReportItem::orderBy('sort_order')->pluck('progress_status')->all())
        ->toBe(['selesai', 'dalam_proses']);
});

it('menolak template milik departemen lain', function (): void {
    siapkanMaster();

    $produksi = Department::where('code', 'PRODUKSI')->firstOrFail();
    $qc = Department::where('code', 'QC')->firstOrFail();
    $templateQc = ReportTemplate::where('code', 'QC_LOT')->firstOrFail();

    Sanctum::actingAs(User::factory()->staff()->create(['department_id' => $produksi->id]));

    $response = $this->postJson('/api/laporan', [
        'report_date' => now()->toDateString(),
        'sections' => [[
            'report_template_id' => $templateQc->id,
            'items' => [['lot' => 1]],
        ]],
    ]);

    $response->assertStatus(422);
    expect($response->json('errors')['sections.0.report_template_id'][0])
        ->toBe('Template tersebut bukan milik departemen Anda.');
    expect($qc->id)->not->toBe($produksi->id);
});

/*
 * Laporan yang sudah dikirim tetap dapat diperbaiki pemiliknya.
 *
 * Penguncian sesudah kirim dicabut atas keputusan pemilik project: ini catatan
 * aktivitas harian, bukan pengajuan yang mengikat. Yang tetap terkunci hanyalah
 * MENGHAPUS — memperbaiki isian dan menghilangkan catatannya sama sekali adalah
 * dua hal yang berbeda.
 */
it('membiarkan laporan yang sudah dikirim tetap dapat disunting pemiliknya', function (): void {
    $template = siapkanMaster();
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');

    $this->postJson("/api/laporan/{$id}/kirim")
        ->assertOk()
        ->assertJsonPath('data.status', 'dikirim')
        ->assertJsonPath('data.dapat_disunting', true);

    $this->putJson("/api/laporan/{$id}", muatanLaporan($template))->assertOk();
});

/*
 * Menghapus laporan.
 *
 * Dulu terkunci dua kali: hanya draf, dan hanya pemiliknya. Keduanya dicabut —
 * yang pertama karena tahap draf sudah tidak dipakai sehingga tidak ada laporan
 * yang pernah memenuhinya, yang kedua karena tidak menyisakan satu pun jalan
 * membersihkan laporan yang salah masuk.
 */
it('mengizinkan pemiliknya menghapus laporan yang sudah dikirim', function (): void {
    $template = siapkanMaster();
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');
    $this->postJson("/api/laporan/{$id}/kirim")->assertOk();

    $this->deleteJson("/api/laporan/{$id}")->assertOk();

    expect(DailyReport::find($id))->toBeNull();
});

it('mengizinkan jangkauan korporat menghapus laporan orang lain', function (): void {
    $template = siapkanMaster();
    $pemilik = User::factory()->staff()->create();

    Sanctum::actingAs($pemilik);
    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');
    $this->postJson("/api/laporan/{$id}/kirim")->assertOk();

    Sanctum::actingAs(User::factory()->administrator()->create());
    $this->deleteJson("/api/laporan/{$id}")->assertOk();

    expect(DailyReport::find($id))->toBeNull();
});

/*
 * Batas pelonggarannya. Melihat laporan rekan sedepartemen adalah satu hal,
 * menghapusnya hal lain — dan tanpa test ini pelonggaran di atas mudah melebar
 * ke jangkauan departemen tanpa ada yang menyadarinya.
 */
it('tetap menolak pengguna lain menghapus laporan yang bukan miliknya', function (): void {
    $template = siapkanMaster();
    $departemen = Department::where('code', 'PRODUKSI')->firstOrFail();
    $pemilik = User::factory()->staff()->create(['department_id' => $departemen->id]);

    Sanctum::actingAs($pemilik);
    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');
    $this->postJson("/api/laporan/{$id}/kirim")->assertOk();

    // Supervisor sedepartemen: boleh melihat, tidak boleh menghapus.
    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $departemen->id]));
    $this->deleteJson("/api/laporan/{$id}")->assertForbidden();

    expect(DailyReport::find($id))->not->toBeNull();
});

/*
 * Kirim ulang.
 *
 * Menyusul pencabutan penguncian di atas: laporan yang sudah dikirim boleh
 * disunting, sehingga harus ada cara memberitahukan bahwa isinya berubah.
 * Tanpa itu suntingan mendarat diam-diam — peninjau tidak pernah tahu, dan
 * badge "Ditinjau" tetap terpasang pada isi yang bukan itu yang ia setujui.
 */
it('mengizinkan pemiliknya mengirim ulang laporan yang sudah dikirim', function (): void {
    $template = siapkanMaster();
    $pengguna = User::factory()->staff()->create();
    Sanctum::actingAs($pengguna);

    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');
    $this->postJson("/api/laporan/{$id}/kirim")->assertOk();

    $this->postJson("/api/laporan/{$id}/kirim")
        ->assertOk()
        ->assertJsonPath('data.status', 'dikirim');
});

/*
 * Tinjauan menyatakan seseorang sudah membaca ISI TERTENTU. Begitu isinya
 * dikirim ulang, pernyataan itu tidak lagi berlaku atas apa pun — karena itu
 * dihapus, bukan dibiarkan menempel pada isi yang berbeda.
 */
it('menghapus tinjauan lama ketika laporan dikirim ulang', function (): void {
    $template = siapkanMaster();
    $departemen = Department::where('code', 'PRODUKSI')->firstOrFail();
    $pengguna = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $atasan = User::factory()->supervisor()->create(['department_id' => $departemen->id]);

    Sanctum::actingAs($pengguna);
    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');
    $this->postJson("/api/laporan/{$id}/kirim")->assertOk();

    Sanctum::actingAs($atasan);
    $this->postJson("/api/laporan/{$id}/tinjau", ['catatan' => 'Sudah saya baca.'])
        ->assertOk()
        ->assertJsonPath('data.status', 'ditinjau');

    Sanctum::actingAs($pengguna);
    $this->postJson("/api/laporan/{$id}/kirim")
        ->assertOk()
        ->assertJsonPath('data.status', 'dikirim');

    $laporan = DailyReport::findOrFail($id);

    expect($laporan->reviewed_by)->toBeNull()
        ->and($laporan->reviewed_at)->toBeNull()
        ->and($laporan->review_note)->toBeNull();
});

it('menolak mengirim ulang laporan milik orang lain', function (): void {
    $template = siapkanMaster();
    $pemilik = User::factory()->staff()->create();

    Sanctum::actingAs($pemilik);
    $id = $this->postJson('/api/laporan', muatanLaporan($template))->json('data.id');
    $this->postJson("/api/laporan/{$id}/kirim")->assertOk();

    Sanctum::actingAs(User::factory()->staff()->create());
    $this->postJson("/api/laporan/{$id}/kirim")->assertForbidden();
});

it('menolak pengguna lain menyunting laporan yang bukan miliknya', function (): void {
    $template = siapkanMaster();
    $pemilik = User::factory()->staff()->create();
    $laporan = DailyReport::factory()->milik($pemilik)->create();

    Sanctum::actingAs(User::factory()->staff()->create(['department_id' => $pemilik->department_id]));

    $this->putJson("/api/laporan/{$laporan->id}", muatanLaporan($template))
        ->assertForbidden();
});

it('menolak angka yang pecahannya melebihi pengaturan kolom', function (): void {
    $template = siapkanMaster();

    // Kolom angka desimal dengan dua angka di belakang koma.
    $template->fields()->create([
        'key' => 'berat',
        'label' => 'Berat',
        'type' => 'decimal',
        'desimal' => 2,
        'sort_order' => 90,
    ]);

    Sanctum::actingAs(User::factory()->staff()->create());

    $response = $this->postJson('/api/laporan', muatanLaporan($template, [[
        'aktivitas' => 'Menimbang',
        'status' => 'selesai',
        // Pembagian di sisi klien dapat menitipkan belasan digit ke kolom JSON.
        'berat' => 12.3456789,
    ]]));

    $response->assertStatus(422);
    expect($response->json('errors'))->toHaveKey('sections.0.items.0.berat');
});

it('menerima angka pecahan yang sesuai pengaturan kolom', function (): void {
    $template = siapkanMaster();

    $template->fields()->create([
        'key' => 'berat',
        'label' => 'Berat',
        'type' => 'decimal',
        'desimal' => 2,
        'sort_order' => 90,
    ]);

    Sanctum::actingAs(User::factory()->staff()->create());

    $this->postJson('/api/laporan', muatanLaporan($template, [[
        'aktivitas' => 'Menimbang',
        'status' => 'selesai',
        'berat' => 12.75,
    ]]))->assertCreated();

    expect(DailyReportItem::first()->data['berat'])->toBe(12.75);
});
