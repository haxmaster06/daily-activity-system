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
            TemplateField::TIPE_INTEGER => (int) $this->angka($kolom, true),
            TemplateField::TIPE_DECIMAL => $this->angka($kolom, false),
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
            TemplateField::TIPE_TEXTAREA => $this->catatanContoh($kolom, $nomor),
            default => $this->teksContoh($kolom, $nomor),
        };
    }

    /**
     * Angka yang masuk akal menurut satuan dan batas kolomnya.
     *
     * ⚠️ Satuannya wajib dibaca. Tanpa itu, kolom "Kadar Air Produk" bersatuan
     * persen terisi 1.691 — dan seluruh ringkasan Analytics yang membacanya ikut
     * menjadi omong kosong yang terlihat rapi. Cacat itu benar-benar muncul pada
     * pembangkit versi pertama.
     *
     * Batas `min_value` dan `max_value` pada template ikut dihormati; itu memang
     * aturan yang dipakai layar pengisian, dan data contoh tidak boleh
     * melanggarnya.
     */
    private function angka(TemplateField $kolom, bool $bulat): float
    {
        $satuan = mb_strtolower((string) $kolom->unit);
        $label = mb_strtolower($kolom->label);

        [$bawah, $atas] = match (true) {
            str_contains($satuan, '%'),
            str_contains($label, 'persen'),
            str_contains($label, 'kadar'),
            str_contains($label, 'kelembapan') => [1.0, 100.0],

            str_contains($satuan, 'pouch') => [500.0, 90000.0],
            str_contains($satuan, 'box') => [50.0, 3000.0],
            str_contains($satuan, 'kg') => [50.0, 2500.0],

            // Kolom angka tanpa satuan biasanya penanda — nomor LOT, urutan.
            $satuan === '' => [1.0, 500.0],

            default => [1.0, 1000.0],
        };

        $bawah = max($bawah, (float) ($kolom->min_value ?? $bawah));
        $atas = min($atas, (float) ($kolom->max_value ?? $atas));

        if ($atas < $bawah) {
            $atas = $bawah;
        }

        $nilai = $bawah + (random_int(0, 10000) / 10000) * ($atas - $bawah);

        return $bulat ? (float) (int) round($nilai) : round($nilai, $kolom->desimal ?? 2);
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

    /**
     * Kosakata isian teks, dikenali dari label kolomnya.
     *
     * ⚠️ **Bagian ini yang menentukan data contohnya berguna atau tidak.**
     *
     * Mengisi seluruh kolom teks dengan "Contoh <label> 1" memang cepat, tetapi
     * menghasilkan layar yang tidak dapat dipakai menilai apa pun: kartu
     * Document Control dan kartu Produksi terbaca sama persis, dan ringkasan
     * "untuk siapa" berisi kalimat yang tidak pernah ditulis siapa pun.
     *
     * Kuncinya dicocokkan dari **label**, bukan dari departemennya: satu kolom
     * bernama "Supplier" berarti hal yang sama di Purchasing, QA, maupun
     * Warehouse, dan template baru langsung ikut terlayani tanpa menyunting
     * berkas ini.
     *
     * Urutannya penting — yang paling khusus lebih dulu. "Nomor Dokumen" harus
     * tertangkap sebagai dokumen sebelum kata "nomor" menangkapnya sebagai kode
     * biasa.
     *
     * Seluruh isinya buatan. Nama perusahaan, nomor SPK, dan nomor dokumen di
     * sini tidak merujuk apa pun yang nyata (CLAUDE.md).
     *
     * @return list<string>|null Daftar pilihan, atau null bila labelnya tak dikenal.
     */
    private function kosakata(string $label): ?array
    {
        return match (true) {
            // Identitas pihak luar — jawaban atas "untuk siapa".
            str_contains($label, 'perusahaan'),
            str_contains($label, 'buyer'),
            str_contains($label, 'pembeli'),
            str_contains($label, 'customer'),
            str_contains($label, 'supplier') => self::PERUSAHAAN,

            // Document Control.
            str_contains($label, 'jenis dokumen') => [
                'SOP', 'Instruksi Kerja', 'Formulir', 'Manual Mutu', 'Rekaman',
            ],
            str_contains($label, 'nomor dokumen') => [
                'DOC-QA-014', 'DOC-PRD-027', 'DOC-HRD-006', 'DOC-WH-031',
            ],
            str_contains($label, 'status dokumen') => [
                'Draf', 'Menunggu Persetujuan', 'Disetujui', 'Terbit', 'Ditarik',
            ],
            str_contains($label, 'revisi') => ['00', '01', '02', '03'],
            str_contains($label, 'klausul') => ['7.5.3', '8.5.1', '9.2', '4.4.1'],
            str_contains($label, 'referensi') => [
                'ISO 22000:2018', 'ISO 9001:2015', 'HACCP Plan', 'GMP Internal',
            ],

            // HRD.
            str_contains($label, 'training'), str_contains($label, 'mcu') => [
                'Pelatihan HACCP Dasar', 'MCU Tahunan', 'Pelatihan K3',
                'Refreshment GMP', 'Pelatihan Penanganan Alergen',
            ],
            str_contains($label, 'program') => [
                'Pelatihan Internal', 'Sertifikasi Eksternal', 'Pemeriksaan Kesehatan',
            ],
            str_contains($label, 'perkembangan') => [
                'Materi sedang disiapkan', 'Menunggu jadwal peserta',
                'Sudah terlaksana', 'Menunggu sertifikat',
            ],
            str_contains($label, 'estimasi') => [
                'Minggu ke-1 bulan depan', 'Minggu ke-2 bulan ini',
                'Akhir bulan berjalan', 'Awal triwulan berikutnya',
            ],

            // IT.
            str_contains($label, 'fitur') => [
                'Laporan Harian', 'Papan Progres', 'Import Data',
                'Executive Analytics', 'Manajemen Peran',
            ],
            str_contains($label, 'modul') => [
                'Pelaporan', 'Master Data', 'Otorisasi', 'Pelaporan Eksekutif',
            ],
            str_contains($label, 'fase') => [
                'Analisis', 'Pengembangan', 'Pengujian', 'Serah Terima',
            ],

            // QC dan QA.
            str_contains($label, 'benda asing') => [
                'Tidak ditemukan', 'Serat halus', 'Partikel logam', 'Serpihan plastik',
            ],
            str_contains($label, 'gluten') => ['Negatif', 'Positif lemah', 'Tidak terdeteksi'],
            str_contains($label, 'sulvit'), str_contains($label, 'refinasi') => [
                'Sesuai standar', 'Di bawah ambang', 'Perlu uji ulang',
            ],

            // Gudang dan pengiriman.
            str_contains($label, 'nama barang'), str_contains($label, 'produk') => [
                'Tepung Contoh 25 kg', 'Bubuk Uji 300 g', 'Granul Percobaan 1 kg',
                'Serbuk Simulasi 500 g',
            ],
            str_contains($label, 'tujuan') => [
                'Surabaya', 'Jakarta', 'Semarang', 'Makassar', 'Medan',
            ],
            str_contains($label, 'diskripsi'), str_contains($label, 'deskripsi') => [
                'Kemasan pouch 300 g, karton 25 kg',
                'Kemasan karung 25 kg, palet standar',
                'Kemasan pouch 500 g, isi 20 per karton',
            ],

            // Kegiatan harian.
            str_contains($label, 'aktivitas'), str_contains($label, 'kegiatan') => [
                'Pemeriksaan kelengkapan berkas',
                'Penyusunan laporan harian',
                'Koordinasi dengan bagian terkait',
                'Penataan ulang area kerja',
                'Tindak lanjut temuan sebelumnya',
            ],
            str_contains($label, 'target') => [
                'Selesai pekan ini', 'Selesai akhir bulan',
                'Menunggu bagian lain', 'Sesuai jadwal',
            ],
            str_contains($label, 'kendala') => [
                'Tidak ada kendala', 'Menunggu bahan dari gudang',
                'Perlu konfirmasi atasan',
            ],

            default => null,
        };
    }

    /**
     * Catatan panjang.
     *
     * Dipisahkan dari `teksContoh` karena bentuknya kalimat, bukan penanda —
     * dan kalimat yang sama berulang di seluruh laporan membuat tampilan baca
     * terlihat seperti data yang rusak.
     */
    private function catatanContoh(TemplateField $kolom, int $nomor): string
    {
        $pilihan = $this->kosakata(mb_strtolower($kolom->label)) ?? [
            'Berjalan sesuai rencana, tidak ada kendala berarti.',
            'Perlu ditindaklanjuti bagian terkait pada hari berikutnya.',
            'Sudah dikoordinasikan dengan penanggung jawab area.',
            'Menunggu kelengkapan dari bagian lain sebelum dilanjutkan.',
            'Selesai lebih cepat dari perkiraan.',
        ];

        return $pilihan[$nomor % count($pilihan)];
    }

    private function teksContoh(TemplateField $kolom, int $nomor): string
    {
        $label = mb_strtolower($kolom->label);

        $pilihan = $this->kosakata($label);

        if ($pilihan !== null) {
            return $pilihan[$nomor % count($pilihan)];
        }

        /*
         * Kolom penanda: nomornya memang harus berbeda tiap baris, sehingga
         * diacak alih-alih diambil dari daftar.
         */
        return match (true) {
            str_contains($label, 'spk') => 'SPK-CONTOH-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT),
            str_contains($label, 'po') => 'PO-CONTOH-'.random_int(10000, 99999),
            str_contains($label, 'lot') => 'LOT-'.random_int(1000, 9999),
            str_contains($label, 'item'), str_contains($label, 'kode') => 'ITM-'.random_int(100, 999),
            str_contains($label, 'qty'), str_contains($label, 'jumlah') => random_int(50, 900).' kg',
            default => 'Contoh '.$kolom->label.' '.($nomor + 1),
        };
    }

    /**
     * Kartu progres, judulnya mengikuti pekerjaan departemennya.
     *
     * Lima judul yang sama di delapan belas departemen membuat papan progres
     * terbaca seperti data yang belum diisi — dan halaman Analytics yang
     * membacanya ikut kehilangan artinya.
     */
    private function buatTugas(Department $departemen, User $pengguna): int
    {
        $judul = $this->judulTugas($departemen->name);

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
    /**
     * @return list<string>
     */
    private function judulTugas(string $departemen): array
    {
        $nama = mb_strtolower($departemen);

        return match (true) {
            str_contains($nama, 'produksi') => [
                'Menyiapkan bahan baku untuk LOT berjalan',
                'Menyelesaikan sisa WIP tahap ayak',
                'Menyusun rencana produksi pekan depan',
            ],
            str_contains($nama, 'qc'), str_contains($nama, 'qa') => [
                'Menuntaskan pemeriksaan LOT tertunda',
                'Menindaklanjuti temuan benda asing',
                'Memperbarui rekaman hasil uji bahan baku',
            ],
            str_contains($nama, 'warehouse'), str_contains($nama, 'gudang') => [
                'Merapikan penataan finish good',
                'Mencocokkan stok packaging material',
                'Menyiapkan barang untuk pengiriman',
            ],
            str_contains($nama, 'ex/im'), str_contains($nama, 'exim') => [
                'Melengkapi dokumen ekspor pengiriman berjalan',
                'Mengoordinasikan jadwal EMKL',
                'Menyiapkan pengajuan sertifikat asal barang',
            ],
            str_contains($nama, 'purchasing') => [
                'Menindaklanjuti PO yang belum dikirim',
                'Meminta penawaran supplier baru',
                'Memeriksa kesesuaian invoice pembelian',
            ],
            str_contains($nama, 'hrd') => [
                'Menyusun jadwal pelatihan bulan depan',
                'Menindaklanjuti hasil MCU karyawan',
                'Merapikan arsip data kepegawaian',
            ],
            str_contains($nama, 'document') => [
                'Menerbitkan revisi SOP terbaru',
                'Menarik dokumen kedaluwarsa dari area kerja',
                'Menyusun daftar induk dokumen',
            ],
            str_contains($nama, 'it') => [
                'Menyelesaikan pengujian modul pelaporan',
                'Memperbaiki temuan pada papan progres',
                'Menyiapkan pemasangan di server',
            ],
            str_contains($nama, 'finance'), str_contains($nama, 'keuangan') => [
                'Menutup pembukuan bulan berjalan',
                'Menindaklanjuti tagihan jatuh tempo',
                'Merapikan bukti pengeluaran kas',
            ],
            str_contains($nama, 'marketing'), str_contains($nama, 'media') => [
                'Menyiapkan materi promosi bulan depan',
                'Menindaklanjuti permintaan penawaran',
                'Menyusun laporan jangkauan konten',
            ],
            str_contains($nama, 'maintenance'), str_contains($nama, 'mtn') => [
                'Menuntaskan perawatan berkala mesin',
                'Menindaklanjuti laporan kerusakan',
                'Menyiapkan suku cadang cadangan',
            ],
            default => [
                'Menuntaskan pekerjaan tertunda pekan lalu',
                'Menyusun laporan berkala bagian',
                'Berkoordinasi dengan bagian terkait',
            ],
        };
    }

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
