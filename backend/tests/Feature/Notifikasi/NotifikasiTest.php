<?php

use App\Models\AuditLog;
use App\Models\DailyReport;
use App\Models\Department;
use App\Models\ReportTemplate;
use App\Models\User;
use App\Notifications\LaporanDikirim;
use App\Notifications\LaporanDitinjau;
use App\Notifications\PengingatLaporan;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Laravel\Sanctum\Sanctum;

/**
 * Membuat laporan draf berisi satu baris, siap dikirim.
 */
function laporanSiapKirim(User $pengguna): DailyReport
{
    $template = ReportTemplate::where('code', 'AKTIVITAS_UMUM')->firstOrFail();

    $laporan = DailyReport::factory()->milik($pengguna)->create([
        'report_date' => now()->toDateString(),
    ]);

    $bagian = $laporan->sections()->create([
        'report_template_id' => $template->id,
        'sort_order' => 0,
    ]);

    $bagian->items()->create([
        'data' => ['aktivitas' => 'Memeriksa oven', 'status' => 'selesai'],
        'progress_status' => 'selesai',
        'sort_order' => 0,
    ]);

    return $laporan;
}

function siapkanTim(): array
{
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    $produksi = Department::where('code', 'PRODUKSI')->firstOrFail();
    $qc = Department::where('code', 'QC')->firstOrFail();

    return [
        'produksi' => $produksi,
        'qc' => $qc,
        'staff' => User::factory()->staff()->create(['department_id' => $produksi->id]),
        'atasan' => User::factory()->supervisor()->create(['department_id' => $produksi->id]),
        'atasanLain' => User::factory()->supervisor()->create(['department_id' => $qc->id]),
    ];
}

it('memberi tahu atasan sedepartemen saat laporan dikirim', function (): void {
    $tim = siapkanTim();
    $laporan = laporanSiapKirim($tim['staff']);

    Sanctum::actingAs($tim['staff']);
    $this->postJson("/api/laporan/{$laporan->id}/kirim")->assertOk();

    expect($tim['atasan']->fresh()->notifications()->count())->toBe(1);

    // Atasan departemen lain tidak berkepentingan atas laporan ini.
    expect($tim['atasanLain']->fresh()->notifications()->count())->toBe(0);

    $isi = $tim['atasan']->fresh()->notifications()->first();
    expect($isi->type)->toBe(LaporanDikirim::class)
        ->and($isi->data['jenis'])->toBe('laporan_dikirim')
        ->and($isi->data['tautan'])->toBe('/laporan/'.$laporan->id);
});

it('tidak mengirimi penyusun notifikasi laporannya sendiri', function (): void {
    $tim = siapkanTim();

    // Supervisor yang membuat laporan untuk dirinya sendiri.
    $laporan = laporanSiapKirim($tim['atasan']);

    Sanctum::actingAs($tim['atasan']);
    $this->postJson("/api/laporan/{$laporan->id}/kirim")->assertOk();

    expect($tim['atasan']->fresh()->notifications()->count())->toBe(0);
});

it('memberi tahu penyusun saat laporannya ditinjau, beserta catatannya', function (): void {
    $tim = siapkanTim();
    $laporan = laporanSiapKirim($tim['staff']);
    $laporan->forceFill(['status' => DailyReport::STATUS_DIKIRIM])->save();

    Sanctum::actingAs($tim['atasan']);
    $this->postJson("/api/laporan/{$laporan->id}/tinjau", ['catatan' => 'Lengkapi kolom waktu'])
        ->assertOk();

    $isi = $tim['staff']->fresh()->notifications()->first();

    expect($isi->type)->toBe(LaporanDitinjau::class)
        ->and($isi->data['pesan'])->toContain('Lengkapi kolom waktu');
});

it('hanya menampilkan notifikasi milik pengguna yang masuk', function (): void {
    $tim = siapkanTim();

    $tim['staff']->notify(new PengingatLaporan($tim['atasan'], now()));
    $tim['atasanLain']->notify(new PengingatLaporan($tim['atasan'], now()));

    Sanctum::actingAs($tim['staff']);
    $response = $this->getJson('/api/notifikasi')->assertOk();

    expect($response->json('data.daftar'))->toHaveCount(1)
        ->and($response->json('data.jumlah_belum_dibaca'))->toBe(1);
});

it('menandai satu notifikasi sudah dibaca', function (): void {
    $tim = siapkanTim();
    $tim['staff']->notify(new PengingatLaporan($tim['atasan'], now()));

    $id = $tim['staff']->fresh()->notifications()->first()->id;

    Sanctum::actingAs($tim['staff']);
    $this->postJson("/api/notifikasi/{$id}/baca")->assertOk();

    expect($tim['staff']->fresh()->unreadNotifications()->count())->toBe(0);
});

it('menolak menandai notifikasi milik orang lain', function (): void {
    $tim = siapkanTim();
    $tim['atasanLain']->notify(new PengingatLaporan($tim['atasan'], now()));

    $id = $tim['atasanLain']->fresh()->notifications()->first()->id;

    Sanctum::actingAs($tim['staff']);
    $this->postJson("/api/notifikasi/{$id}/baca")->assertStatus(404);

    expect($tim['atasanLain']->fresh()->unreadNotifications()->count())->toBe(1);
});

it('menandai seluruh notifikasi sudah dibaca', function (): void {
    $tim = siapkanTim();
    $tim['staff']->notify(new PengingatLaporan($tim['atasan'], now()));
    $tim['staff']->notify(new PengingatLaporan($tim['atasanLain'], now()));

    Sanctum::actingAs($tim['staff']);
    $this->postJson('/api/notifikasi/baca-semua')->assertOk();

    expect($tim['staff']->fresh()->unreadNotifications()->count())->toBe(0);
});

it('melarang Staff mengirim pengingat', function (): void {
    $tim = siapkanTim();
    $lain = User::factory()->staff()->create(['department_id' => $tim['produksi']->id]);

    Sanctum::actingAs($tim['staff']);
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $lain->id])
        ->assertStatus(403);

    expect($lain->fresh()->notifications()->count())->toBe(0);
});

it('melarang Supervisor mengingatkan anggota departemen lain', function (): void {
    $tim = siapkanTim();
    $orangQc = User::factory()->staff()->create(['department_id' => $tim['qc']->id]);

    Sanctum::actingAs($tim['atasan']);
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $orangQc->id])
        ->assertStatus(403);

    expect($orangQc->fresh()->notifications()->count())->toBe(0);
});

it('menolak pengingat bila anggotanya sudah melapor', function (): void {
    $tim = siapkanTim();
    laporanSiapKirim($tim['staff']);

    Sanctum::actingAs($tim['atasan']);
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $tim['staff']->id])
        ->assertStatus(422);

    expect($tim['staff']->fresh()->notifications()->count())->toBe(0);
});

it('mengirim pengingat dan mencatatnya di jejak audit', function (): void {
    $tim = siapkanTim();

    Sanctum::actingAs($tim['atasan']);
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $tim['staff']->id])
        ->assertOk();

    $isi = $tim['staff']->fresh()->notifications()->first();
    expect($isi->type)->toBe(PengingatLaporan::class)
        ->and($isi->data['tautan'])->toBe('/laporan/baru');

    expect(AuditLog::latest('id')->first()->action)->toBe('pengingat_dikirim');
});

it('menolak pengingat kedua pada hari yang sama', function (): void {
    $tim = siapkanTim();

    Sanctum::actingAs($tim['atasan']);
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $tim['staff']->id])
        ->assertOk();

    // Anggota tidak boleh dihujani pengingat yang sama oleh beberapa atasan.
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $tim['staff']->id])
        ->assertStatus(422);

    expect($tim['staff']->fresh()->notifications()->count())->toBe(1);
});

it('menolak pengingat untuk diri sendiri', function (): void {
    $tim = siapkanTim();

    Sanctum::actingAs($tim['atasan']);
    $this->postJson('/api/monitoring/pengingat', ['pengguna_id' => $tim['atasan']->id])
        ->assertStatus(422);
});

/**
 * Menghapus dan membersihkan notifikasi.
 *
 * Yang paling mudah salah di sini bukan penghapusannya, melainkan **milik
 * siapa** yang terhapus: relasi `notifications()` sudah terikat pemiliknya,
 * dan satu query yang menembusnya membuat siapa pun dapat menghapus kotak
 * notifikasi orang lain dengan menebak sebuah UUID.
 */
describe('menghapus notifikasi', function (): void {
    /** @return array{pengguna: User, id: string} */
    function notifikasiContoh(): array
    {
        $pengguna = User::factory()->staff()->create();
        $pengguna->notify(new PengingatLaporan(User::factory()->supervisor()->create(), now()));

        return [
            'pengguna' => $pengguna,
            'id' => (string) $pengguna->notifications()->firstOrFail()->id,
        ];
    }

    it('menghapus satu notifikasi milik sendiri', function (): void {
        ['pengguna' => $pengguna, 'id' => $id] = notifikasiContoh();

        Sanctum::actingAs($pengguna);

        $this->deleteJson("/api/notifikasi/{$id}")
            ->assertOk()
            ->assertJsonPath('data.jumlah_belum_dibaca', 0);

        expect($pengguna->fresh()->notifications()->count())->toBe(0);
    });

    it('tidak dapat menghapus notifikasi orang lain', function (): void {
        ['pengguna' => $pemilik, 'id' => $id] = notifikasiContoh();

        Sanctum::actingAs(User::factory()->staff()->create());

        // 404, bukan 403: menolak dengan "bukan milik Anda" tetap memberi tahu
        // bahwa notifikasi itu ada.
        $this->deleteJson("/api/notifikasi/{$id}")->assertNotFound();

        expect($pemilik->fresh()->notifications()->count())->toBe(1);
    });

    /*
     * Bawaannya hanya yang sudah dibaca. Menghapus semuanya sekaligus berarti
     * membuang pemberitahuan yang belum sempat dilihat pemiliknya, dan tidak ada
     * jalan mengembalikannya.
     */
    it('membersihkan hanya yang sudah dibaca', function (): void {
        $pengguna = User::factory()->staff()->create();
        $pengirim = User::factory()->supervisor()->create();

        $pengguna->notify(new PengingatLaporan($pengirim, now()));
        $pengguna->notify(new PengingatLaporan($pengirim, now()));

        $pengguna->notifications()->first()->markAsRead();

        Sanctum::actingAs($pengguna);

        $this->deleteJson('/api/notifikasi/bersihkan')
            ->assertOk()
            ->assertJsonPath('data.jumlah_dihapus', 1)
            ->assertJsonPath('data.jumlah_belum_dibaca', 1);

        expect($pengguna->fresh()->notifications()->count())->toBe(1);
    });

    it('membersihkan seluruhnya hanya bila diminta terang-terangan', function (): void {
        $pengguna = User::factory()->staff()->create();
        $pengirim = User::factory()->supervisor()->create();

        $pengguna->notify(new PengingatLaporan($pengirim, now()));
        $pengguna->notify(new PengingatLaporan($pengirim, now()));

        Sanctum::actingAs($pengguna);

        $this->deleteJson('/api/notifikasi/bersihkan?semua=1')
            ->assertOk()
            ->assertJsonPath('data.jumlah_dihapus', 2);

        expect($pengguna->fresh()->notifications()->count())->toBe(0);
    });

    it('tidak menyentuh notifikasi pengguna lain saat membersihkan', function (): void {
        ['pengguna' => $orangLain] = notifikasiContoh();

        Sanctum::actingAs(User::factory()->staff()->create());

        $this->deleteJson('/api/notifikasi/bersihkan?semua=1')->assertOk();

        expect($orangLain->fresh()->notifications()->count())->toBe(1);
    });
});
