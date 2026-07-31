<?php

use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\DailyReport;
use App\Models\Department;
use App\Models\User;
use App\Support\JenisLampiran;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    Storage::fake('local');
});

function penyusun(): User
{
    return User::factory()->staff()->create(['department_id' => Department::factory()]);
}

function gambar(string $nama = 'bukti.jpg'): UploadedFile
{
    return UploadedFile::fake()->image($nama, 40, 40);
}

/** Isi PNG 1x1 yang sah — dipakai untuk menguji ketidakcocokan ekstensi. */
const PNG_SAH = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Berkas sungguhan di disk, bukan berkas palsu.
 *
 * `UploadedFile::fake()` menebak tipe isi dari **ekstensinya**, sehingga
 * berkas skrip bernama .jpg tetap dilaporkan sebagai image/jpeg — dan uji yang
 * memakainya tidak pernah benar-benar menguji pemeriksaan isi. Berkas nyata
 * membuat Symfony membaca isinya lewat finfo, persis seperti pada permintaan
 * sungguhan.
 */
function berkasNyata(string $nama, string $isi): UploadedFile
{
    $jalur = tempnam(sys_get_temp_dir(), 'uji-lampiran');
    file_put_contents($jalur, $isi);

    // Argumen terakhir menandai mode uji: berkasnya tidak berasal dari
    // unggahan HTTP sungguhan, tetapi tipe isinya tetap dibaca dari isinya.
    return new UploadedFile($jalur, $nama, null, null, true);
}

it('menerima lampiran gambar pada laporan sendiri', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    $response = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->assertCreated();

    expect($response->json('data.nama'))->toBe('bukti.jpg')
        ->and($response->json('data.tipe'))->toBe('image/jpeg');

    // Lokasi di disk tidak pernah ikut dikirim.
    expect($response->json('data'))->not->toHaveKey('path');

    $lampiran = Attachment::firstOrFail();
    Storage::disk('local')->assertExists($lampiran->path);
});

it('menyimpan berkas dengan nama acak, bukan nama dari pengguna', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    $this->post("/api/laporan/{$laporan->id}/lampiran", [
        'berkas' => gambar('../../rahasia .jpg'),
    ])->assertCreated();

    $lampiran = Attachment::firstOrFail();

    // Nama dari pengguna tidak boleh menyentuh jalur berkas sama sekali.
    expect($lampiran->path)->not->toContain('..')
        ->and($lampiran->path)->not->toContain(' ')
        ->and($lampiran->path)->toStartWith("lampiran/{$laporan->id}/");
});

it('menolak berkas skrip yang menyamar sebagai gambar', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    // Berkas PHP yang dinamai ulang .jpg — isinya diperiksa, bukan namanya.
    $jahat = berkasNyata('muslihat.jpg', "<?php echo shell_exec(\$_GET['c']); ?>");

    $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => $jahat])
        ->assertStatus(422);

    expect(Attachment::count())->toBe(0);
});

it('menolak ekstensi yang tidak cocok dengan isi berkasnya', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    // PNG sungguhan, tetapi dinamai .pdf. Keduanya ada di daftar terima;
    // yang menolak adalah pemeriksaan kecocokan ekstensi dengan isinya.
    $this->post("/api/laporan/{$laporan->id}/lampiran", [
        'berkas' => berkasNyata('salah.pdf', base64_decode(PNG_SAH)),
    ])->assertStatus(422);

    expect(Attachment::count())->toBe(0);
});

it('menolak berkas melebihi 10 MB', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    $this->post("/api/laporan/{$laporan->id}/lampiran", [
        'berkas' => UploadedFile::fake()->create('besar.pdf', 11 * 1024, 'application/pdf'),
    ])->assertStatus(422);

    expect(Attachment::count())->toBe(0);
});

it('menolak melampirkan pada laporan orang lain', function (): void {
    $pemilik = penyusun();
    $laporan = DailyReport::factory()->milik($pemilik)->create();

    Sanctum::actingAs(penyusun());

    $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->assertStatus(403);

    expect(Attachment::count())->toBe(0);
});

it('masih menerima lampiran setelah laporan dikirim', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)
        ->create(['status' => DailyReport::STATUS_DIKIRIM]);

    Sanctum::actingAs($pengguna);

    // Bukti fisik kerap baru tersedia belakangan.
    $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->assertCreated();
});

it('membatasi jumlah lampiran per laporan', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    for ($i = 0; $i < JenisLampiran::MAKS_PER_LAPORAN; $i++) {
        $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar("b{$i}.jpg")])
            ->assertCreated();
    }

    $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar('kesebelas.jpg')])
        ->assertStatus(422);

    expect($laporan->attachments()->count())->toBe(JenisLampiran::MAKS_PER_LAPORAN);
});

it('mengunduh lampiran sebagai berkas, bukan disajikan sebaris', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    $id = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->json('data.id');

    $response = $this->get("/api/lampiran/{$id}")->assertOk();

    expect($response->headers->get('content-disposition'))->toContain('attachment')
        ->and($response->headers->get('content-disposition'))->toContain('bukti.jpg')
        ->and($response->headers->get('x-content-type-options'))->toBe('nosniff');
});

it('menolak mengunduh lampiran di luar jangkauan', function (): void {
    $pemilik = penyusun();
    $laporan = DailyReport::factory()->milik($pemilik)->create();

    Sanctum::actingAs($pemilik);
    $id = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->json('data.id');

    // Lampiran tidak boleh menjadi jalan memutar untuk membaca laporan orang lain.
    Sanctum::actingAs(penyusun());
    $this->getJson("/api/lampiran/{$id}")->assertStatus(403);
});

it('mengizinkan atasan mengunduh lampiran anggota departemennya', function (): void {
    $departemen = Department::factory()->create(['code' => 'PROD_L']);
    $anggota = User::factory()->staff()->create(['department_id' => $departemen->id]);
    $laporan = DailyReport::factory()->milik($anggota)->create();

    Sanctum::actingAs($anggota);
    $id = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->json('data.id');

    Sanctum::actingAs(User::factory()->supervisor()->create(['department_id' => $departemen->id]));
    $this->get("/api/lampiran/{$id}")->assertOk();
});

it('menghapus lampiran beserta berkasnya selagi laporan masih draf', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    $id = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->json('data.id');

    $jalur = Attachment::findOrFail($id)->path;

    $this->deleteJson("/api/lampiran/{$id}")->assertOk();

    expect(Attachment::count())->toBe(0);
    Storage::disk('local')->assertMissing($jalur);
});

it('menolak menghapus lampiran setelah laporan dikirim', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);
    $id = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->json('data.id');

    $laporan->forceFill(['status' => DailyReport::STATUS_DIKIRIM])->save();

    // Laporan yang sudah dikirim adalah catatan; buktinya tidak boleh hilang.
    $this->deleteJson("/api/lampiran/{$id}")->assertStatus(403);

    expect(Attachment::count())->toBe(1);
});

it('mencatat unggah dan hapus lampiran di jejak audit', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);

    $id = $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])
        ->json('data.id');

    expect(AuditLog::latest('id')->first()->action)->toBe('lampiran_ditambah');

    $this->deleteJson("/api/lampiran/{$id}")->assertOk();

    expect(AuditLog::latest('id')->first()->action)->toBe('lampiran_dihapus');
});

it('menyertakan lampiran pada detail laporan', function (): void {
    $pengguna = penyusun();
    $laporan = DailyReport::factory()->milik($pengguna)->create();

    Sanctum::actingAs($pengguna);
    $this->post("/api/laporan/{$laporan->id}/lampiran", ['berkas' => gambar()])->assertCreated();

    $data = $this->getJson("/api/laporan/{$laporan->id}")->assertOk()->json('data.lampiran');

    expect($data)->toHaveCount(1)
        ->and($data[0]['nama'])->toBe('bukti.jpg')
        ->and($data[0]['pengunggah'])->toBe($pengguna->name);
});
