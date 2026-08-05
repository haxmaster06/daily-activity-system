<?php

namespace App\Support\Analitik;

use App\Models\Department;
use App\Models\User;
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
        );
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
        ];
    }
}
