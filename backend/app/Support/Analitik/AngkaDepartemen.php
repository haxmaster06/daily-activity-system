<?php

namespace App\Support\Analitik;

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\TemplateField;
use Illuminate\Support\Collection;

/**
 * Keadaan pekerjaan tiap departemen, dibaca dari isi laporannya sendiri.
 *
 * ## Beda dari halaman Analytics yang lain
 *
 * Halaman Kepatuhan dan Produktivitas mengukur **orang**: siapa rajin, berapa
 * banyak yang dihasilkan. Halaman ini tidak. Yang dijawabnya adalah pertanyaan
 * seorang Direktur yang membuka aplikasi pagi hari: *Produksi sedang mengerjakan
 * apa, untuk pembeli mana, berapa tonasenya?*
 *
 * Jawabannya berbeda bentuk tiap departemen, dan itu memang tidak bisa
 * diseragamkan: kolom Produksi bicara kilogram dan nomor LOT, kolom Exim bicara
 * EMKL dan kelengkapan dokumen. Karena itu ringkasan di sini **dibangkitkan dari
 * template departemen masing-masing**, bukan dari daftar metrik yang ditulis di
 * kode.
 *
 * Tiga hal yang diambil dari tiap laporan, dan ketiganya menjawab pertanyaan
 * yang berbeda:
 *
 * 1. **Kolom master** — "untuk siapa". Pembeli, supplier, nomor LOT, produk.
 * 2. **Kolom angka bersatuan** — "berapa". Tonase, jumlah box, jumlah pouch.
 * 3. **Kolom pilihan** — "sampai mana". Tahapan, kelengkapan dokumen, status.
 *
 * Sisanya — teks bebas dan catatan — tidak diringkas di sini. Meringkas kalimat
 * berarti menebak maksudnya; kalimat utuhnya dibaca lewat tampilan laporan.
 */
final class AngkaDepartemen
{
    /** Nilai berbeda paling banyak yang ditampilkan per kolom. */
    private const BATAS_NILAI = 6;

    /** Laporan terbaru yang ditawarkan untuk dibuka per departemen. */
    private const BATAS_LAPORAN = 8;

    /**
     * @return array<string, mixed>
     */
    public static function susun(PenyaringAnalitik $saring): array
    {
        $departemen = $saring->departemenTerjangkau()
            ->when(
                $saring->departemenId !== [],
                fn (Collection $daftar) => $daftar->whereIn('id', $saring->departemenId),
            );

        $laporan = self::laporanTerlihat($saring);
        $baris = self::barisLaporan($saring, $laporan);
        $kolom = self::kolomTemplate($baris);

        return [
            'departemen' => $departemen
                ->map(fn (Department $satu) => self::ringkasSatu($satu, $laporan, $baris, $kolom))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return Collection<int, DailyReport>
     */
    private static function laporanTerlihat(PenyaringAnalitik $saring): Collection
    {
        $query = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->with(['user:id,name'])
            ->whereBetween('report_date', [$saring->dari, $saring->sampai]);

        $saring->batasiLaporan($query);

        return $query->orderByDesc('report_date')->orderByDesc('id')->get();
    }

    /**
     * Seluruh baris isian pada laporan tersebut.
     *
     * Dimuat sekali untuk seluruh departemen, bukan per departemen: dua puluh
     * departemen berarti dua puluh query yang membaca tabel yang sama.
     *
     * @param  Collection<int, DailyReport>  $laporan
     * @return Collection<int, object>
     */
    private static function barisLaporan(PenyaringAnalitik $saring, Collection $laporan): Collection
    {
        if ($laporan->isEmpty()) {
            return collect();
        }

        $query = DailyReportItem::query()
            ->join(
                'daily_report_sections as s',
                's.id',
                '=',
                'daily_report_items.daily_report_section_id',
            )
            ->whereIn('s.daily_report_id', $laporan->pluck('id'));

        /*
         * Barisnya ikut disaring, bukan hanya laporannya. Laporan yang lolos
         * penyaring "pembeli X" biasanya juga memuat baris untuk pembeli lain;
         * meringkas seluruh barisnya menjadikan sorotan pembeli X memuat tonase
         * yang bukan miliknya.
         */
        $saring->batasiBaris($query, 'daily_report_items.');

        return $query
            ->get([
                'daily_report_items.data',
                'daily_report_items.progress_status',
                's.daily_report_id',
                's.report_template_id',
            ])
            ->map(fn ($satu) => (object) [
                'laporan_id' => (int) $satu->daily_report_id,
                'template_id' => (int) $satu->report_template_id,
                'data' => is_array($satu->data) ? $satu->data : (array) json_decode((string) $satu->data, true),
                'status' => $satu->progress_status,
            ]);
    }

    /**
     * Definisi kolom template yang benar-benar terpakai.
     *
     * @param  Collection<int, object>  $baris
     * @return Collection<int, TemplateField>
     */
    private static function kolomTemplate(Collection $baris): Collection
    {
        if ($baris->isEmpty()) {
            return collect();
        }

        return TemplateField::query()
            ->whereIn('report_template_id', $baris->pluck('template_id')->unique())
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * @param  Collection<int, DailyReport>  $laporan
     * @param  Collection<int, object>  $baris
     * @param  Collection<int, TemplateField>  $kolom
     * @return array<string, mixed>
     */
    private static function ringkasSatu(
        Department $departemen,
        Collection $laporan,
        Collection $baris,
        Collection $kolom,
    ): array {
        $miliknya = $laporan->where('department_id', $departemen->id);
        $idLaporan = $miliknya->pluck('id')->flip();
        $barisnya = $baris->filter(fn ($satu) => $idLaporan->has($satu->laporan_id));

        $terakhir = $miliknya->first();

        return [
            'departemen_id' => $departemen->id,
            'departemen' => $departemen->name,
            'jumlah_laporan' => $miliknya->count(),
            'jumlah_baris' => $barisnya->count(),
            'terakhir' => $terakhir === null ? null : [
                'tanggal' => $terakhir->report_date->toDateString(),
                'penyusun_id' => $terakhir->user_id,
                'penyusun' => $terakhir->user?->name ?? '—',
            ],
            'status_baris' => self::sebaranStatus($barisnya),
            ...(function () use ($barisnya, $kolom): array {
                $hasil = self::sorotan($barisnya, $kolom);

                return [
                    'sorotan' => $hasil['sorotan'],
                    'sorotan_tersembunyi' => $hasil['tersembunyi'],
                ];
            })(),
            'laporan' => $miliknya
                ->take(self::BATAS_LAPORAN)
                ->map(fn (DailyReport $satu) => [
                    'id' => $satu->id,
                    'tanggal' => $satu->report_date->toDateString(),
                    'penyusun_id' => $satu->user_id,
                    'penyusun' => $satu->user?->name ?? '—',
                    'status' => $satu->status,
                    'label_status' => DailyReport::LABEL_STATUS[$satu->status] ?? $satu->status,
                    'jumlah_baris' => $baris->where('laporan_id', $satu->id)->count(),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  Collection<int, object>  $baris
     * @return array<string, int>
     */
    private static function sebaranStatus(Collection $baris): array
    {
        return collect(array_keys(DailyReportItem::LABEL_STATUS))
            ->mapWithKeys(fn (string $status) => [
                $status => $baris->where('status', $status)->count(),
            ])
            ->all();
    }

    /**
     * Ringkasan isi laporan dalam istilah kolom departemen itu sendiri.
     *
     * @param  Collection<int, object>  $baris
     * @param  Collection<int, TemplateField>  $kolom
     * @return array{sorotan: list<array<string, mixed>>, tersembunyi: int}
     */
    private static function sorotan(Collection $baris, Collection $kolom): array
    {
        if ($baris->isEmpty()) {
            return ['sorotan' => [], 'tersembunyi' => 0];
        }

        $terpakai = $baris->pluck('template_id')->unique()->flip();
        $sorotan = [];

        foreach ($kolom as $satu) {
            if (! $terpakai->has($satu->report_template_id)) {
                continue;
            }

            $nilai = $baris
                ->filter(fn ($b) => $b->template_id === $satu->report_template_id)
                ->map(fn ($b) => $b->data[$satu->key] ?? null)
                ->filter(fn ($n) => $n !== null && $n !== '' && $n !== []);

            if ($nilai->isEmpty()) {
                continue;
            }

            $hasil = match (true) {
                $satu->bertipeMaster() => self::sorotanMaster($satu, $nilai),
                self::bertipeAngkaBersatuan($satu) => self::sorotanAngka($satu, $nilai),
                $satu->type === TemplateField::TIPE_SELECT => self::sorotanPilihan($satu, $nilai),
                /*
                 * Kolom teks pendek ikut diringkas, dan itu keputusan yang
                 * lahir dari keadaan data yang sebenarnya: **tidak satu pun
                 * template memakai kolom bertipe master hari ini**. "Nama
                 * Perusahaan" pada SPK dan "Supplier" pada Purchase Order —
                 * persis jawaban atas "untuk siapa" — keduanya masih kolom
                 * teks biasa.
                 *
                 * Mengabaikannya berarti halaman ini tidak dapat menjawab
                 * pertanyaan yang justru paling sering diajukan, sampai
                 * seluruh template disusun ulang.
                 *
                 * `textarea` tetap dikecualikan: itu kalimat, dan meringkas
                 * kalimat berarti menebak maksudnya.
                 */
                $satu->type === TemplateField::TIPE_TEXT => self::sorotanTeks($satu, $nilai),
                default => null,
            };

            if ($hasil !== null) {
                $sorotan[] = $hasil;
            }
        }

        $terpilih = self::seimbangkan($sorotan);

        /*
         * Jumlah kolom yang tidak kebagian tempat ikut dilaporkan.
         *
         * Kuota di atas menjaga sorotan tetap seimbang, tetapi pemotongannya
         * sunyi: kolom yang baru ditambahkan ke template tidak muncul, dan
         * tidak ada satu pun tanda bahwa ia ada. Yang menambahkannya menyimpulkan
         * fiturnya rusak — padahal ia hanya kalah kuota.
         */
        return [
            'sorotan' => $terpilih,
            'tersembunyi' => count($sorotan) - count($terpilih),
        ];
    }

    /**
     * Menyusun sorotan agar tiap jenis pertanyaan tetap kebagian tempat.
     *
     * Ini bukan sekadar pembatasan panjang. Template Proses Harian per LOT punya
     * **dua puluh empat** kolom angka; memotong daftar setelah sepuluh membuat
     * seluruhnya terisi angka, dan "untuk pembeli mana" — pertanyaan yang justru
     * paling sering diajukan — tidak pernah sampai ke layar. Cacat itu benar-benar
     * terjadi sebelum kuota ini ada.
     *
     * Urutannya mengikuti cara pertanyaannya diajukan: untuk siapa, berapa
     * banyak, sampai mana.
     *
     * @param  list<array<string, mixed>>  $sorotan
     * @return list<array<string, mixed>>
     */
    private static function seimbangkan(array $sorotan): array
    {
        $kuota = ['master' => 3, 'teks' => 3, 'angka' => 8, 'pilihan' => 3];
        $urutan = ['master' => 0, 'teks' => 1, 'angka' => 2, 'pilihan' => 3];

        $terpilih = [];

        foreach (array_keys($urutan) as $jenis) {
            $sejenis = array_values(array_filter(
                $sorotan,
                fn (array $satu) => $satu['jenis'] === $jenis,
            ));

            foreach (array_slice($sejenis, 0, $kuota[$jenis]) as $satu) {
                $terpilih[] = $satu;
            }
        }

        usort(
            $terpilih,
            fn (array $a, array $b) => ($urutan[$a['jenis']] ?? 9) <=> ($urutan[$b['jenis']] ?? 9),
        );

        return $terpilih;
    }

    /**
     * Label kolom beserta grupnya.
     *
     * Wajib, dan bukan hiasan. Pada template Proses Harian per LOT, label
     * "QTY Masuk" muncul **lima kali** — Oven, Ayak, Packing 1, Xray, Packing 2
     * — dengan satuan yang sebagian berbeda. Tanpa nama grupnya, ringkasan ini
     * menampilkan lima baris bernama sama dan tidak satu pun dapat dibedakan.
     */
    private static function labelPenuh(TemplateField $kolom): string
    {
        $grup = trim((string) $kolom->group_label);

        return $grup === '' ? $kolom->label : "{$grup} · {$kolom->label}";
    }

    /**
     * Kolom teks yang berperilaku seperti kategori.
     *
     * Nilai berbedanya dibatasi. Kolom yang tiap barisnya berbeda — nomor SPK,
     * kode PO — tetap ditampilkan **jumlahnya saja**: mengetahui ada dua belas
     * SPK berjalan tetap berarti, sedangkan mendaftar dua belas nomornya hanya
     * memenuhi kartu tanpa menjawab apa pun.
     *
     * @param  Collection<int, mixed>  $nilai
     * @return array<string, mixed>|null
     */
    private static function sorotanTeks(TemplateField $kolom, Collection $nilai): ?array
    {
        $jumlah = $nilai
            ->map(fn ($satu) => is_scalar($satu) ? trim((string) $satu) : null)
            ->filter()
            ->countBy()
            ->sortDesc();

        if ($jumlah->isEmpty()) {
            return null;
        }

        return [
            'jenis' => 'teks',
            'kunci' => $kolom->key,
            'label' => self::labelPenuh($kolom),
            'jumlah_berbeda' => $jumlah->count(),
            'nilai' => $jumlah->count() > self::BATAS_NILAI
                ? []
                : $jumlah
                    ->map(fn (int $n, string $teks) => [
                        'teks' => $teks,
                        'jumlah' => $n,
                        'saring' => $teks,
                    ])
                    ->values()
                    ->all(),
        ];
    }

    private static function bertipeAngkaBersatuan(TemplateField $kolom): bool
    {
        return in_array($kolom->type, [TemplateField::TIPE_INTEGER, TemplateField::TIPE_DECIMAL], true)
            && $kolom->unit !== null
            && $kolom->unit !== '';
    }

    /**
     * @param  Collection<int, mixed>  $nilai
     * @return array<string, mixed>
     */
    private static function sorotanAngka(TemplateField $kolom, Collection $nilai): array
    {
        $angka = $nilai->map(fn ($satu) => is_numeric($satu) ? (float) $satu : 0.0);

        return [
            'jenis' => 'angka',
            'kunci' => $kolom->key,
            'label' => self::labelPenuh($kolom),
            'satuan' => $kolom->unit,
            'total' => round($angka->sum(), 2),
            'baris' => $angka->count(),
        ];
    }

    /**
     * Nilai kolom master menjawab "untuk siapa" — pembeli, supplier, LOT.
     *
     * Nilainya berupa salinan `{kode, nama}`. Bentuk skalar tetap mungkin muncul
     * pada laporan lama yang kolomnya dulu bertipe teks, dan laporan itu harus
     * tetap terbaca.
     *
     * @param  Collection<int, mixed>  $nilai
     * @return array<string, mixed>
     */
    private static function sorotanMaster(TemplateField $kolom, Collection $nilai): array
    {
        /*
         * Namanya yang dibaca, kodenya yang dipakai menyaring. Menyaring dengan
         * nama berarti dua master bernama sama — dan itu terjadi — terhitung
         * sebagai satu; kodenyalah yang unik.
         */
        $pasangan = $nilai
            ->map(fn ($satu) => is_array($satu)
                ? ['nama' => $satu['nama'] ?? null, 'kode' => $satu['kode'] ?? ($satu['nama'] ?? null)]
                : ['nama' => (string) $satu, 'kode' => (string) $satu])
            ->filter(fn (array $satu) => ($satu['nama'] ?? '') !== '');

        $nama = $pasangan->countBy('nama')->sortDesc();
        $kode = $pasangan->keyBy('nama')->map(fn (array $satu) => $satu['kode']);

        return [
            'jenis' => 'master',
            'kunci' => $kolom->key,
            'label' => self::labelPenuh($kolom),
            'jumlah_berbeda' => $nama->count(),
            'nilai' => $nama
                ->take(self::BATAS_NILAI)
                ->map(fn (int $jumlah, string $teks) => [
                    'teks' => $teks,
                    'jumlah' => $jumlah,
                    'saring' => $kode[$teks] ?? $teks,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  Collection<int, mixed>  $nilai
     * @return array<string, mixed>|null
     */
    private static function sorotanPilihan(TemplateField $kolom, Collection $nilai): ?array
    {
        $label = collect($kolom->options ?? [])->pluck('label', 'nilai');

        // Dihitung menurut nilai simpanannya, bukan labelnya: label yang sama
        // pada dua pilihan berbeda akan menyatukan keduanya, dan penyaringnya
        // membutuhkan nilai simpanan itu juga.
        $jumlah = $nilai
            ->map(fn ($satu) => is_scalar($satu) ? (string) $satu : null)
            ->filter()
            ->countBy()
            ->sortDesc();

        if ($jumlah->isEmpty()) {
            return null;
        }

        return [
            'jenis' => 'pilihan',
            'kunci' => $kolom->key,
            'label' => self::labelPenuh($kolom),
            'jumlah_berbeda' => $jumlah->count(),
            'nilai' => $jumlah
                ->take(self::BATAS_NILAI)
                ->map(fn (int $n, string $mentah) => [
                    'teks' => $label[$mentah] ?? $mentah,
                    'jumlah' => $n,
                    'saring' => $mentah,
                ])
                ->values()
                ->all(),
        ];
    }
}
