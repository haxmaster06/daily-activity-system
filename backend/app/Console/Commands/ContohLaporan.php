<?php

namespace App\Console\Commands;

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\MasterData;
use App\Models\ReportTemplate;
use App\Models\Role;
use App\Models\TemplateField;
use App\Models\Tugas;
use App\Models\User;
use App\Support\JangkauanData;
use App\Support\ValidasiIsianTemplate;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Mengisi database pengembangan dengan laporan contoh dalam jumlah banyak.
 *
 * Dipakai untuk melihat bagaimana antarmuka berperilaku saat datanya sudah
 * penuh — tabel yang panjang, penyaring yang benar-benar terpakai, dan
 * ringkasan yang angkanya berarti.
 *
 * ## Tiga aturan yang membuat perintah ini aman dijalankan
 *
 * 1. **Menolak berjalan di produksi.** Data contoh yang masuk ke basis data
 *    kerja tidak dapat dibedakan lagi dari laporan sungguhan setelah beberapa
 *    minggu.
 * 2. **Hanya membuat laporan atas nama pengguna contoh yang dibuatnya
 *    sendiri.** Laporan milik orang sungguhan tidak pernah disentuh, ditimpa,
 *    maupun dihapus — termasuk oleh `--bersihkan`.
 * 3. **Dapat dibersihkan seluruhnya.** Karena seluruh yang dibuatnya menempel
 *    pada pengguna bertanda, pembersihannya tepat: tidak ada sisa, dan tidak
 *    ada yang ikut terhapus.
 *
 * Isinya jelas buatan. `Klien_Data/` tidak pernah masuk repository justru
 * karena memuat nama perusahaan, nomor LOT, dan tonase sungguhan — dan data
 * contoh tidak boleh menjadi pintu belakang bagi semua itu (CLAUDE.md).
 */
class ContohLaporan extends Command
{
    protected $signature = 'dams:contoh-laporan
        {--jumlah=100 : Perkiraan jumlah laporan yang dibuat}
        {--hari=30 : Rentang hari ke belakang}
        {--bersihkan : Menghapus seluruh data contoh, tanpa membuat yang baru}';

    protected $description = 'Mengisi data contoh untuk melihat tampilan pada data yang banyak';

    /** Penanda pengguna contoh. Seluruh pembersihan bertumpu padanya. */
    private const AWALAN_EMAIL = 'contoh.';

    private const DOMAIN = '@contoh.local';

    /** Nama perusahaan buatan — bukan pelanggan sungguhan. */
    private const PERUSAHAAN = [
        'PT Sinar Contoh Abadi',
        'PT Rasa Nusantara Demo',
        'CV Bumi Uji Coba',
        'PT Andalan Percobaan',
        'PT Mitra Simulasi',
    ];

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->components->error(
                'Perintah ini tidak dapat dijalankan di produksi. Data contoh yang masuk '
                .'ke basis data kerja tidak dapat dibedakan lagi dari laporan sungguhan.',
            );

            return self::FAILURE;
        }

        if ($this->option('bersihkan')) {
            return $this->bersihkan();
        }

        /*
         * Seluruh departemen non-sistem, bukan hanya yang punya template
         * sendiri: template tanpa departemen berlaku umum, sehingga departemen
         * mana pun tetap dapat mengisi laporan. Membatasi pada yang bertemplate
         * sendiri akan membuat sebagian departemen tidak pernah muncul di
         * halaman Analytics — persis keadaan yang hendak diperiksa.
         */
        $departemen = Department::query()
            ->where('is_system', false)
            ->orderBy('name')
            ->get();

        if ($departemen->isEmpty()) {
            $this->components->error('Tidak ada departemen yang dapat diisi.');

            return self::FAILURE;
        }

        $hari = max(1, (int) $this->option('hari'));
        $sasaran = max(1, (int) $this->option('jumlah'));

        $this->components->info(sprintf(
            'Menyiapkan sekitar %d laporan pada %d departemen, rentang %d hari terakhir.',
            $sasaran,
            $departemen->count(),
            $hari,
        ));

        $jumlah = DB::transaction(
            fn () => $this->buat($departemen, $hari, $sasaran),
        );

        $this->components->twoColumnDetail('Pengguna contoh', (string) $jumlah['pengguna']);
        $this->components->twoColumnDetail('Laporan', (string) $jumlah['laporan']);
        $this->components->twoColumnDetail('Baris isian', (string) $jumlah['baris']);
        $this->components->twoColumnDetail('Kartu progres', (string) $jumlah['tugas']);

        $this->components->info('Selesai. Jalankan dengan --bersihkan untuk menghapusnya kembali.');

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, Department>  $departemen
     * @return array{pengguna: int, laporan: int, baris: int, tugas: int}
     */
    private function buat($departemen, int $hari, int $sasaran): array
    {
        $peran = Role::where('slug', Role::STAFF)->first();
        $jumlah = ['pengguna' => 0, 'laporan' => 0, 'baris' => 0, 'tugas' => 0];

        // Dibagi rata, lalu dibulatkan ke atas supaya tiap departemen kebagian.
        $perDepartemen = max(1, (int) ceil($sasaran / $departemen->count()));

        foreach ($departemen as $satu) {
            $pengguna = $this->penggunaContoh($satu, $peran, $jumlah);

            $template = ReportTemplate::with('fields')
                ->where('is_active', true)
                ->where(fn ($query) => $query->where('department_id', $satu->id)->orWhereNull('department_id'))
                ->orderByRaw('department_id IS NULL')
                ->get();

            if ($template->isEmpty()) {
                continue;
            }

            for ($mundur = 0; $mundur < $perDepartemen && $mundur < $hari; $mundur++) {
                $tanggal = Carbon::today()->subDays($mundur);

                // Akhir pekan sengaja jarang terisi: itu bentuk data yang
                // sebenarnya, dan halaman kepatuhan memang memisahkannya.
                if ($tanggal->isSunday() && $mundur % 3 !== 0) {
                    continue;
                }

                if (DailyReport::where('user_id', $pengguna->id)
                    ->whereDate('report_date', $tanggal)
                    ->exists()
                ) {
                    continue;
                }

                $jumlah['baris'] += $this->buatLaporan($pengguna, $satu, $template->first(), $tanggal);
                $jumlah['laporan']++;
            }

            $jumlah['tugas'] += $this->buatTugas($satu, $pengguna);
        }

        return $jumlah;
    }

    /**
     * @param  array{pengguna: int, laporan: int, baris: int, tugas: int}  $jumlah
     */
    private function penggunaContoh(Department $departemen, ?Role $peran, array &$jumlah): User
    {
        $email = self::AWALAN_EMAIL.Str::slug($departemen->code ?: $departemen->name, '.').self::DOMAIN;

        $ada = User::where('email', $email)->first();

        if ($ada !== null) {
            return $ada;
        }

        $pengguna = User::factory()->create([
            'name' => 'Contoh '.$departemen->name,
            'email' => $email,
            'password' => Hash::make('password'),
            'department_id' => $departemen->id,
            'is_active' => true,
            'is_system' => false,
        ]);

        if ($peran !== null) {
            $pengguna->syncRoles([[
                'role_id' => $peran->id,
                'scope_level' => JangkauanData::PERSONAL,
                'department_id' => null,
            ]]);
        }

        $jumlah['pengguna']++;

        return $pengguna;
    }

    /** @return int Jumlah baris yang dibuat. */
    private function buatLaporan(
        User $pengguna,
        Department $departemen,
        ReportTemplate $template,
        Carbon $tanggal,
    ): int {
        $dikirim = $tanggal->isToday() ? DailyReport::STATUS_DRAF : DailyReport::STATUS_DIKIRIM;

        $laporan = DailyReport::factory()->create([
            'user_id' => $pengguna->id,
            'department_id' => $departemen->id,
            'report_date' => $tanggal->toDateString(),
            'status' => $dikirim,
            'submitted_at' => $dikirim === DailyReport::STATUS_DRAF
                ? null
                : $tanggal->copy()->setTime(random_int(14, 19), random_int(0, 59)),
        ]);

        $bagian = $laporan->sections()->create([
            'report_template_id' => $template->id,
            'sort_order' => 0,
        ]);

        $jumlahBaris = random_int(2, 5);

        for ($nomor = 0; $nomor < $jumlahBaris; $nomor++) {
            $nilai = [];

            foreach ($template->fields as $kolom) {
                if ($kolom->dihitungOtomatis()) {
                    continue;
                }

                $nilai[$kolom->key] = $this->nilaiContoh($kolom, $tanggal, $nomor);
            }

            $bersih = ValidasiIsianTemplate::bersihkan($template, $nilai);

            $bagian->items()->create([
                'data' => $bersih,
                'progress_status' => ValidasiIsianTemplate::statusBaris($template, $bersih)
                    ?? ['selesai', 'dalam_proses', 'belum_mulai'][$nomor % 3],
                'sort_order' => $nomor,
            ]);
        }

        return $jumlahBaris;
    }

    /**
     * Nilai satu kolom, dibuat masuk akal menurut tipe dan satuannya.
     *
     * Angka disesuaikan satuannya — kilogram beratus-ratus, pouch beribu-ribu —
     * supaya ringkasan Analytics tidak menampilkan angka yang mustahil dan
     * menyesatkan pembacanya saat memeriksa tampilan.
     */
    private function nilaiContoh(TemplateField $kolom, Carbon $tanggal, int $nomor): mixed
    {
        return match ($kolom->type) {
            TemplateField::TIPE_INTEGER => $this->angkaBulat($kolom),
            TemplateField::TIPE_DECIMAL => round(random_int(8000, 200000) / 100, 2),
            TemplateField::TIPE_DATE => $tanggal->copy()->addDays(random_int(0, 10))->toDateString(),
            TemplateField::TIPE_MONTH => $tanggal->format('Y-m'),
            TemplateField::TIPE_TIME => sprintf('%02d:%02d', random_int(6, 20), [0, 15, 30, 45][random_int(0, 3)]),
            TemplateField::TIPE_BOOLEAN => random_int(0, 3) > 0,
            TemplateField::TIPE_SELECT => collect($kolom->options ?? [])->pluck('nilai')->random() ?? null,
            TemplateField::TIPE_MULTISELECT => collect($kolom->options ?? [])
                ->pluck('nilai')
                ->shuffle()
                ->take(random_int(1, 2))
                ->values()
                ->all(),
            TemplateField::TIPE_MASTER => $this->nilaiMaster($kolom),
            TemplateField::TIPE_TEXTAREA => 'Catatan contoh: proses berjalan sesuai rencana, '
                .'tidak ada kendala berarti pada baris ke-'.($nomor + 1).'.',
            default => $this->teksContoh($kolom, $nomor),
        };
    }

    private function angkaBulat(TemplateField $kolom): int
    {
        $satuan = mb_strtolower((string) $kolom->unit);

        return match (true) {
            str_contains($satuan, 'pouch') => random_int(500, 90000),
            str_contains($satuan, 'box') => random_int(50, 3000),
            str_contains($satuan, '%') => random_int(60, 100),
            default => random_int(1, 500),
        };
    }

    /**
     * @return array{kode: string, nama: string}|null
     */
    private function nilaiMaster(TemplateField $kolom): ?array
    {
        $baris = MasterData::where('master_type_id', $kolom->master_type_id)
            ->aktif()
            ->inRandomOrder()
            ->first();

        return $baris?->untukLaporan();
    }

    private function teksContoh(TemplateField $kolom, int $nomor): string
    {
        $label = mb_strtolower($kolom->label);

        return match (true) {
            str_contains($label, 'perusahaan'),
            str_contains($label, 'buyer'),
            str_contains($label, 'pembeli'),
            str_contains($label, 'customer'),
            str_contains($label, 'supplier') => self::PERUSAHAAN[$nomor % count(self::PERUSAHAAN)],
            str_contains($label, 'spk') => 'SPK-CONTOH-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            str_contains($label, 'po') => 'PO-CONTOH-'.random_int(10000, 99999),
            str_contains($label, 'lot') => 'LOT-'.random_int(1000, 9999),
            str_contains($label, 'item'), str_contains($label, 'kode') => 'ITM-'.random_int(100, 999),
            default => 'Contoh '.$kolom->label.' '.($nomor + 1),
        };
    }

    private function buatTugas(Department $departemen, User $pengguna): int
    {
        $judul = [
            'Menyiapkan bahan baku harian',
            'Memeriksa kelengkapan dokumen',
            'Menindaklanjuti temuan pemeriksaan',
            'Menyusun jadwal pengiriman',
            'Merapikan arsip bulan berjalan',
        ];

        $dibuat = 0;

        foreach ([0, 1, 2] as $nomor) {
            $status = array_keys(Tugas::STATUS)[$nomor % 3];

            $ada = Tugas::where('department_id', $departemen->id)
                ->where('title', $judul[$nomor])
                ->exists();

            if ($ada) {
                continue;
            }

            Tugas::factory()->create([
                'department_id' => $departemen->id,
                'penanggung_jawab_id' => $pengguna->id,
                'dibuat_oleh_id' => $pengguna->id,
                'title' => $judul[$nomor],
                'status' => $status,
                'urutan' => $nomor,
                // Sebagian sengaja lewat target, supaya sorotan "perlu
                // perhatian" pada Analytics benar-benar terisi.
                'target_selesai' => $nomor === 0
                    ? Carbon::today()->subDays(random_int(1, 6))
                    : Carbon::today()->addDays(random_int(2, 20)),
            ]);

            $dibuat++;
        }

        return $dibuat;
    }

    /**
     * Menghapus seluruh yang pernah dibuat perintah ini.
     *
     * Bertumpu sepenuhnya pada pengguna bertanda: laporan, kartu progres, dan
     * akunnya sendiri. Data milik orang sungguhan tidak pernah tersentuh.
     */
    private function bersihkan(): int
    {
        $pengguna = User::where('email', 'like', self::AWALAN_EMAIL.'%'.self::DOMAIN)->get();

        if ($pengguna->isEmpty()) {
            $this->components->info('Tidak ada data contoh yang perlu dihapus.');

            return self::SUCCESS;
        }

        $id = $pengguna->pluck('id');

        $jumlah = DB::transaction(function () use ($pengguna, $id): array {
            $laporan = DailyReport::whereIn('user_id', $id)->get();

            foreach ($laporan as $satu) {
                $satu->delete();
            }

            $tugas = Tugas::whereIn('dibuat_oleh_id', $id)
                ->orWhereIn('penanggung_jawab_id', $id)
                ->get();

            foreach ($tugas as $satu) {
                $satu->delete();
            }

            foreach ($pengguna as $satu) {
                $satu->roles()->detach();
                $satu->tokens()->delete();
                $satu->delete();
            }

            return [
                'laporan' => $laporan->count(),
                'tugas' => $tugas->count(),
                'pengguna' => $pengguna->count(),
            ];
        });

        $this->components->twoColumnDetail('Laporan dihapus', (string) $jumlah['laporan']);
        $this->components->twoColumnDetail('Kartu progres dihapus', (string) $jumlah['tugas']);
        $this->components->twoColumnDetail('Pengguna contoh dihapus', (string) $jumlah['pengguna']);

        return self::SUCCESS;
    }
}
