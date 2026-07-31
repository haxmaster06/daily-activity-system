<?php

use App\Models\AuditLog;
use App\Models\DailyReport;
use App\Models\Department;
use App\Models\ReportTemplate;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\ReportTemplateSeeder;
use Laravel\Sanctum\Sanctum;

/**
 * Membuat satu laporan berisi dua baris aktivitas.
 */
function laporanBerisi(User $pengguna, string $tanggal, array $baris): DailyReport
{
    $template = ReportTemplate::with('fields')->where('code', 'AKTIVITAS_UMUM')->firstOrFail();

    $laporan = DailyReport::factory()->milik($pengguna)->create(['report_date' => $tanggal]);
    $bagian = $laporan->sections()->create([
        'report_template_id' => $template->id,
        'sort_order' => 0,
    ]);

    foreach (array_values($baris) as $urutan => $isi) {
        $bagian->items()->create([
            'data' => $isi,
            'progress_status' => $isi['status'] ?? null,
            'sort_order' => $urutan,
        ]);
    }

    return $laporan;
}

function siapkanExport(): array
{
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    $produksi = Department::where('code', 'PRODUKSI')->firstOrFail();
    $qc = Department::where('code', 'QC')->firstOrFail();

    $staff = User::factory()->staff()->create([
        'name' => 'Ahmad Fauzi',
        'department_id' => $produksi->id,
    ]);
    $orangQc = User::factory()->staff()->create([
        'name' => 'Budi QC',
        'department_id' => $qc->id,
    ]);

    laporanBerisi($staff, now()->toDateString(), [
        ['aktivitas' => 'Memeriksa oven', 'keterangan' => 'Normal', 'status' => 'selesai'],
        ['aktivitas' => 'Menyiapkan bahan', 'keterangan' => '', 'status' => 'dalam_proses'],
    ]);
    laporanBerisi($orangQc, now()->toDateString(), [
        ['aktivitas' => 'Uji kadar air', 'keterangan' => '', 'status' => 'selesai'],
    ]);

    return compact('produksi', 'qc', 'staff', 'orangQc');
}

it('membatasi pratinjau export pada jangkauan pengguna', function (): void {
    $data = siapkanExport();
    Sanctum::actingAs($data['staff']);

    $response = $this->getJson('/api/export/pratinjau')->assertOk();

    // Dua baris miliknya sendiri, bukan tiga.
    expect($response->json('data.jumlah_baris'))->toBe(2);
    expect($response->json('data.jumlah_laporan'))->toBe(1);

    $penyusun = collect($response->json('data.baris'))->pluck('_penyusun')->unique();
    expect($penyusun->all())->toBe(['Ahmad Fauzi']);
});

it('memberi Manager seluruh departemen', function (): void {
    siapkanExport();
    Sanctum::actingAs(User::factory()->manager()->create());

    $response = $this->getJson('/api/export/pratinjau')->assertOk();

    expect($response->json('data.jumlah_baris'))->toBe(3);
    expect($response->json('data.jumlah_laporan'))->toBe(2);
});

it('menyertakan kolom tetap dan kolom template', function (): void {
    siapkanExport();
    Sanctum::actingAs(User::factory()->manager()->create());

    $kolom = collect($this->getJson('/api/export/pratinjau')->json('data.kolom'))
        ->pluck('kunci');

    expect($kolom)->toContain('_tanggal', '_penyusun', '_departemen', '_status')
        ->toContain('aktivitas', 'keterangan', 'status');
});

it('menerjemahkan nilai pilihan menjadi labelnya', function (): void {
    $data = siapkanExport();
    Sanctum::actingAs($data['staff']);

    $status = collect($this->getJson('/api/export/pratinjau')->json('data.baris'))
        ->pluck('status');

    // Yang tercetak label, bukan kunci teknisnya (standarisasi §26).
    expect($status)->toContain('Selesai', 'Dalam Proses')
        ->not->toContain('dalam_proses');
});

it('menyaring berdasarkan rentang tanggal', function (): void {
    $data = siapkanExport();
    laporanBerisi($data['staff'], '2026-01-15', [
        ['aktivitas' => 'Aktivitas lama', 'status' => 'selesai'],
    ]);

    Sanctum::actingAs($data['staff']);

    $lama = $this->getJson('/api/export/pratinjau?dari=2026-01-01&sampai=2026-01-31');
    expect($lama->json('data.jumlah_baris'))->toBe(1);

    $sekarang = $this->getJson('/api/export/pratinjau');
    expect($sekarang->json('data.jumlah_baris'))->toBe(2);
});

it('menolak tanggal akhir yang mendahului tanggal mulai', function (): void {
    siapkanExport();
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->getJson('/api/export/pratinjau?dari=2026-07-10&sampai=2026-07-01')
        ->assertStatus(422)
        ->assertJsonStructure(['errors' => ['sampai']]);
});

it('mengunduh berkas Excel yang sah', function (): void {
    $data = siapkanExport();
    Sanctum::actingAs($data['staff']);

    $response = $this->get('/api/export/excel');

    $response->assertOk();
    expect($response->headers->get('content-type'))
        ->toContain('spreadsheetml.sheet');
    expect($response->headers->get('content-disposition'))
        ->toContain('DAMS_AKTIVITAS_UMUM_');

    // XLSX adalah arsip zip; berkas yang sah selalu diawali "PK".
    expect(substr($response->streamedContent(), 0, 2))->toBe('PK');
});

it('mengunduh berkas PDF yang sah', function (): void {
    $data = siapkanExport();
    Sanctum::actingAs($data['staff']);

    $response = $this->get('/api/export/pdf');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect(substr($response->getContent(), 0, 4))->toBe('%PDF');
});

it('menolak export saat tidak ada data', function (): void {
    test()->seed(DepartmentSeeder::class);
    test()->seed(ReportTemplateSeeder::class);

    Sanctum::actingAs(User::factory()->staff()->create());

    $this->getJson('/api/export/excel')
        ->assertStatus(422)
        ->assertJsonPath('message', 'Tidak ada data untuk diexport.');
});

it('mencatat setiap export ke jejak audit', function (): void {
    $data = siapkanExport();
    Sanctum::actingAs($data['staff']);

    $this->get('/api/export/excel')->assertOk();

    $jejak = AuditLog::latest('id')->first();

    // Berkas export membawa data keluar; harus dapat ditelusuri.
    expect($jejak->action)->toBe('diexport')
        ->and($jejak->module)->toBe('laporan')
        ->and($jejak->changes['bentuk'])->toBe('Excel')
        ->and($jejak->changes['jumlah_baris'])->toBe(2);
});

it('memakai sumber data yang sama untuk pratinjau dan berkas', function (): void {
    $data = siapkanExport();
    Sanctum::actingAs($data['staff']);

    $pratinjau = $this->getJson('/api/export/pratinjau')->json('data');

    $this->get('/api/export/excel')->assertOk();

    // Yang tercatat di audit harus sama dengan yang dilihat di pratinjau —
    // pratinjau yang berbeda dari berkasnya membuat langkah itu tidak berguna.
    $jejak = AuditLog::latest('id')->first();

    expect($jejak->changes['jumlah_baris'])->toBe($pratinjau['jumlah_baris']);
    expect($jejak->changes['template'])->toBe($pratinjau['template']['kode']);
});
