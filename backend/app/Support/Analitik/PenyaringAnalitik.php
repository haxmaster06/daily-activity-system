<?php

namespace App\Support\Analitik;

use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Penyaring bersama seluruh halaman Executive Analytics.
 *
 * ⚠️ **Satu-satunya tempat penyaringan departemen diterjemahkan.**
 *
 * Pengguna dapat memilih departemen mana yang ingin dilihat. Penyaring itu
 * hanya boleh **mempersempit** jangkauan yang sudah dimilikinya — tidak pernah
 * memperluas. Departemen yang diminta tetapi di luar jangkauan dibuang diam-diam
 * di sini, sekali, sehingga tidak ada satu pun angka yang dapat lupa
 * memeriksanya.
 *
 * Menulis pemeriksaan yang sama di tiap kelas angka berarti menulisnya lima
 * kali, dan satu di antaranya pada suatu saat akan berbeda.
 */
final class PenyaringAnalitik
{
    /** Jendela terpanjang yang boleh diminta, dalam hari. */
    public const BATAS_HARI = 366;

    private function __construct(
        public readonly User $pengguna,
        public readonly Carbon $dari,
        public readonly Carbon $sampai,
        /** @var list<int> Kosong berarti seluruh departemen dalam jangkauan. */
        public readonly array $departemenId,
        /** @var list<string> Status baris laporan sekaligus status kartu progres. */
        public readonly array $status,
        /** @var list<int> Penyusun laporan, sekaligus penanggung jawab kartu. */
        public readonly array $penggunaId,
        /** @var list<int> Template laporan. */
        public readonly array $templateId,
        /** @var list<array{kunci: string, nilai: string}> Isi kolom laporan. */
        public readonly array $nilai,
    ) {}

    public static function dariPermintaan(Request $request): self
    {
        $pengguna = $request->user();

        $sampai = $request->filled('sampai')
            ? Carbon::parse($request->string('sampai')->toString())->startOfDay()
            : Carbon::today();

        $dari = $request->filled('dari')
            ? Carbon::parse($request->string('dari')->toString())->startOfDay()
            : $sampai->copy()->subDays(29);

        // Rentang terbalik diperbaiki, bukan ditolak: itu kesalahan mengisi
        // yang jawabannya sudah jelas.
        if ($dari->gt($sampai)) {
            [$dari, $sampai] = [$sampai, $dari];
        }

        /*
         * Jendela dibatasi. Tanpa batas, satu permintaan dengan rentang sepuluh
         * tahun membaca seluruh arsip laporan — dan halaman ringkasan adalah
         * tempat paling mudah untuk tidak sengaja melakukannya.
         */
        if ($dari->diffInDays($sampai) > self::BATAS_HARI) {
            $dari = $sampai->copy()->subDays(self::BATAS_HARI);
        }

        return new self(
            $pengguna,
            $dari,
            $sampai,
            self::departemenTerpilih($request, $pengguna),
            self::daftarTeks($request, 'status', array_keys(DailyReportItem::LABEL_STATUS)),
            self::daftarAngka($request, 'pengguna_id'),
            self::daftarAngka($request, 'template_id'),
            self::pasanganNilai($request),
        );
    }

    /**
     * Penyaring isi kolom, dikirim sebagai `kunci:nilai`.
     *
     * Inilah penyaring yang paling sering dicari seorang Direktur — "tampilkan
     * semua yang untuk pembeli ini" — dan satu-satunya yang menyentuh isi JSON.
     *
     * ⚠️ Kunci kolom ikut masuk ke jalur JSON pada query, dan jalur itu tidak
     * dapat di-bind sebagai parameter. Karena itu kunci yang tidak berbentuk
     * pengenal biasa **dibuang di sini**, sekali, sebelum menyentuh query apa
     * pun. Nilainya tetap di-bind seperti biasa.
     *
     * @return list<array{kunci: string, nilai: string}>
     */
    private static function pasanganNilai(Request $request): array
    {
        return collect($request->input('nilai', []))
            ->map(fn ($satu) => (string) $satu)
            ->map(function (string $satu): ?array {
                [$kunci, $nilai] = array_pad(explode(':', $satu, 2), 2, null);

                if ($nilai === null || $nilai === '' || ! preg_match('/^[A-Za-z0-9_]{1,64}$/', (string) $kunci)) {
                    return null;
                }

                return ['kunci' => (string) $kunci, 'nilai' => $nilai];
            })
            ->filter()
            ->unique(fn (array $satu) => $satu['kunci'].':'.$satu['nilai'])
            ->values()
            ->all();
    }

    /**
     * Daftar angka dari permintaan.
     *
     * **Tidak** disaring jangkauan di sini, dan itu disengaja. Penyaring
     * pengguna dan template hanya mempersempit query yang jangkauannya sudah
     * ditegakkan `scopeVisibleTo()`; meminta pengguna di luar jangkauan
     * menghasilkan hasil kosong, bukan kebocoran. Yang wajib disaring hanya
     * departemen, sebab nilainya ikut menentukan daftar nama yang ditampilkan.
     *
     * @return list<int>
     */
    private static function daftarAngka(Request $request, string $kunci): array
    {
        return collect($request->input($kunci, []))
            ->map(fn ($nilai) => (int) $nilai)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Daftar teks dari permintaan, dibatasi nilai yang memang dikenal.
     *
     * Nilai tak dikenal dibuang, bukan diteruskan ke query: status karangan
     * yang lolos ke `whereIn` menghasilkan halaman kosong yang terlihat seperti
     * tidak ada datanya, padahal permintaannya yang salah.
     *
     * @param  list<string>  $sah
     * @return list<string>
     */
    private static function daftarTeks(Request $request, string $kunci, array $sah): array
    {
        return collect($request->input($kunci, []))
            ->map(fn ($nilai) => (string) $nilai)
            ->filter(fn (string $nilai) => in_array($nilai, $sah, true))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Departemen yang benar-benar boleh dibaca, sesudah permintaan disaring
     * jangkauan.
     *
     * @return list<int>
     */
    private static function departemenTerpilih(Request $request, User $pengguna): array
    {
        $diminta = collect($request->input('departemen_id', []))
            ->map(fn ($nilai) => (int) $nilai)
            ->filter()
            ->unique()
            ->values();

        if ($diminta->isEmpty()) {
            return [];
        }

        $jangkauan = $pengguna->jangkauan();

        if ($jangkauan->korporat()) {
            return $diminta->all();
        }

        /*
         * Inilah baris yang menahan kebocoran: departemen di luar jangkauan
         * dibuang, bukan ditolak dengan galat. Menolaknya dengan pesan
         * "departemen itu di luar jangkauan Anda" tetap memberi tahu bahwa
         * departemen itu ada.
         */
        return $diminta
            ->filter(fn (int $id) => $jangkauan->mencakupDepartemen($id))
            ->values()
            ->all();
    }

    /**
     * Menerapkan penyaringan departemen pada query mana pun.
     *
     * Hanya menambahkan pembatasan; jangkauan dasarnya tetap ditegakkan
     * `scopeVisibleTo()` pada modelnya masing-masing.
     *
     * @template TQuery of \Illuminate\Database\Eloquent\Builder
     *
     * @param  TQuery  $query
     * @return TQuery
     */
    public function batasiDepartemen($query, string $kolom = 'department_id')
    {
        if ($this->departemenId !== []) {
            $query->whereIn($kolom, $this->departemenId);
        }

        return $query;
    }

    /**
     * Menerapkan seluruh penyaring yang berlaku bagi sebuah query laporan.
     *
     * Dipakai menggantikan `batasiDepartemen()` pada query `DailyReport`.
     * Menyusunnya sendiri di tiap kelas angka berarti menulis aturan yang sama
     * enam kali, dan satu di antaranya pada suatu saat akan tertinggal saat
     * penyaring baru ditambahkan — persis yang terjadi ketika penyaring
     * departemen semula ditulis berulang.
     *
     * @template TQuery of \Illuminate\Database\Eloquent\Builder
     *
     * @param  TQuery  $query
     * @return TQuery
     */
    public function batasiLaporan($query)
    {
        $this->batasiDepartemen($query);

        if ($this->penggunaId !== []) {
            $query->whereIn('user_id', $this->penggunaId);
        }

        /*
         * Penyaring status dan template menyentuh isi laporan, bukan laporannya.
         * Diterapkan lewat `whereHas` supaya laporan yang tidak punya satu pun
         * baris yang cocok benar-benar hilang dari hasil — bukan muncul dengan
         * angka nol yang menyesatkan.
         */
        if ($this->templateId !== [] || $this->status !== [] || $this->nilai !== []) {
            $query->whereHas('sections', function ($bagian): void {
                if ($this->templateId !== []) {
                    $bagian->whereIn('report_template_id', $this->templateId);
                }

                /*
                 * Status dan isi kolom diperiksa pada **satu** baris yang sama,
                 * bukan dua `whereHas` terpisah. Terpisah berarti laporan yang
                 * barisnya A berisi pembeli itu dan barisnya B berstatus selesai
                 * ikut lolos, padahal tidak ada satu pun baris yang memenuhi
                 * keduanya — dan pembacanya akan menyimpulkan pekerjaan pembeli
                 * itu sudah selesai.
                 */
                if ($this->status !== [] || $this->nilai !== []) {
                    $bagian->whereHas('items', function ($item): void {
                        if ($this->status !== []) {
                            $item->whereIn('progress_status', $this->status);
                        }

                        $this->batasiNilai($item);
                    });
                }
            });
        }

        return $query;
    }

    /**
     * Menerapkan penyaring isi kolom pada query baris laporan.
     *
     * Nilai kolom master disimpan sebagai salinan `{kode, nama}`, sedangkan
     * kolom pilihan dan teks menyimpan nilai skalar. Keduanya diperiksa: yang
     * dikirim layar adalah kode untuk master dan nilai untuk selainnya, dan
     * memaksa layar mengetahui bedanya berarti memindahkan pengetahuan tentang
     * bentuk penyimpanan ke tempat yang tidak bisa memeriksanya.
     *
     * @param  Builder  $query
     * @param  string  $kolom  Nama kolom JSON, ditulis di kode ini sendiri —
     *                         tidak pernah berasal dari permintaan.
     */
    private function batasiNilai($query, string $kolom = 'data'): void
    {
        foreach ($this->nilai as $satu) {
            // Kuncinya sudah dipastikan berbentuk pengenal biasa saat disusun;
            // lihat `pasanganNilai()`.
            $jalur = "$.\"{$satu['kunci']}\"";

            $query->where(function ($cocok) use ($jalur, $kolom, $satu): void {
                $cocok
                    ->whereRaw(
                        "JSON_UNQUOTE(JSON_EXTRACT({$kolom}, ?)) = ?",
                        [$jalur, $satu['nilai']],
                    )
                    ->orWhereRaw(
                        "JSON_UNQUOTE(JSON_EXTRACT({$kolom}, ?)) = ?",
                        [$jalur.'.kode', $satu['nilai']],
                    );
            });
        }
    }

    /**
     * Menerapkan penyaring yang berlaku bagi kartu papan progres.
     *
     * Status memakai kosakata yang sama persis dengan status baris laporan,
     * sehingga satu penyaring melayani keduanya. Kalau salah satunya berubah,
     * penyaring ini diam-diam menyaring dua hal berbeda sebagai satu.
     *
     * @template TQuery of \Illuminate\Database\Eloquent\Builder
     *
     * @param  TQuery  $query
     * @return TQuery
     */
    public function batasiTugas($query)
    {
        $this->batasiDepartemen($query);

        if ($this->penggunaId !== []) {
            $query->whereIn('penanggung_jawab_id', $this->penggunaId);
        }

        if ($this->status !== []) {
            $query->whereIn('status', $this->status);
        }

        return $query;
    }

    /**
     * Menerapkan penyaring status dan template pada query baris laporan.
     *
     * @template TQuery of \Illuminate\Database\Eloquent\Builder
     *
     * @param  TQuery  $query
     * @return TQuery
     */
    public function batasiBaris($query, string $awalan = '')
    {
        if ($this->status !== []) {
            $query->whereIn($awalan.'progress_status', $this->status);
        }

        $this->batasiNilai($query, $awalan.'data');

        return $query;
    }

    /** Apakah ada penyaring selain rentang tanggal. */
    public function adaPenyaringIsi(): bool
    {
        return $this->departemenId !== []
            || $this->status !== []
            || $this->penggunaId !== []
            || $this->templateId !== []
            || $this->nilai !== [];
    }

    /**
     * Departemen yang boleh dipilih pengguna ini.
     *
     * @return Collection<int, Department>
     */
    public function departemenTerjangkau(): Collection
    {
        $jangkauan = $this->pengguna->jangkauan();

        return Department::query()
            ->where('is_system', false)
            ->when(
                ! $jangkauan->korporat(),
                fn ($query) => $query->whereIn('id', $jangkauan->departemenId),
            )
            ->orderBy('name')
            ->get(['id', 'code', 'name']);
    }

    /**
     * Orang yang boleh dipilih pengguna ini sebagai penyaring.
     *
     * Terbatas pada yang memang wajib melapor: akun sistem tidak pernah punya
     * laporan maupun kartu, sehingga memilihnya hanya menghasilkan halaman
     * kosong.
     *
     * @return Collection<int, User>
     */
    public function penggunaTerjangkau(): Collection
    {
        $jangkauan = $this->pengguna->jangkauan();

        return User::query()
            ->with('department:id,name')
            ->wajibMelapor()
            ->when(
                ! $jangkauan->korporat(),
                fn ($query) => $query->whereIn('department_id', $jangkauan->departemenId),
            )
            ->orderBy('name')
            ->get(['id', 'name', 'department_id']);
    }

    /** Jumlah hari pada rentang, termasuk kedua ujungnya. */
    public function jumlahHari(): int
    {
        return (int) $this->dari->diffInDays($this->sampai) + 1;
    }

    /**
     * Seluruh tanggal pada rentang.
     *
     * Dipakai untuk mengisi hari yang tidak punya data dengan nol. Grafik garis
     * yang melompati tanggal kosong menyambungkan dua titik berjauhan menjadi
     * garis landai, dan yang terbaca justru kebalikan dari keadaannya.
     *
     * @return list<string>
     */
    public function tanggalRentang(): array
    {
        $hasil = [];

        for ($tanggal = $this->dari->copy(); $tanggal->lte($this->sampai); $tanggal->addDay()) {
            $hasil[] = $tanggal->toDateString();
        }

        return $hasil;
    }

    /**
     * @return array{dari: string, sampai: string, hari: int, departemen_id: list<int>}
     */
    public function ringkas(): array
    {
        return [
            'dari' => $this->dari->toDateString(),
            'sampai' => $this->sampai->toDateString(),
            'hari' => $this->jumlahHari(),
            'departemen_id' => $this->departemenId,
            'status' => $this->status,
            'pengguna_id' => $this->penggunaId,
            'template_id' => $this->templateId,
            'nilai' => array_map(
                fn (array $satu) => $satu['kunci'].':'.$satu['nilai'],
                $this->nilai,
            ),
        ];
    }
}
