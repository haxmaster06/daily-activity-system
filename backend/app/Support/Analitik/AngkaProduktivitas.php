<?php

namespace App\Support\Analitik;

use App\Models\DailyReport;
use App\Models\Department;
use App\Models\TemplateField;
use App\Models\User;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Mengubah angka di dalam laporan harian menjadi bacaan yang berarti.
 *
 * Inilah bagian yang selama ini tidak tersentuh: laporan harian menyimpan
 * puluhan kolom angka bersatuan — QTY Masuk kilogram, QTY Keluar, Waste, Target
 * Per Hari, jumlah box dan pouch — dan seluruhnya hanya pernah dibaca satu
 * baris pada satu waktu. Yang ingin diketahui seorang eksekutif justru
 * jumlahnya: berapa masuk minggu ini, berapa terbuang, dan apakah targetnya
 * tercapai.
 *
 * ## Dua aturan yang menjaga angkanya tetap benar
 *
 * 1. **Metrik dikenali dari pasangan kunci dan satuan, bukan kunci saja.**
 *    `pack2_masuk` bersatuan `/pouch 300g` sedangkan `qty_masuk` bersatuan
 *    `kg`. Menjumlahkan keduanya karena namanya mirip menghasilkan angka yang
 *    terlihat masuk akal dan sepenuhnya salah.
 * 2. **Hanya bagian laporan yang templatenya memang mendefinisikan kolom itu**
 *    yang ikut dijumlahkan. Template lain dapat memakai kunci yang sama untuk
 *    hal yang berbeda.
 */
final class AngkaProduktivitas
{
    /**
     * Daftar metrik yang dapat dibaca, digabung lintas template.
     *
     * @return list<array<string, mixed>>
     */
    public static function metrikTersedia(): array
    {
        return TemplateField::query()
            ->whereIn('type', [TemplateField::TIPE_INTEGER, TemplateField::TIPE_DECIMAL])
            ->whereNotNull('unit')
            ->where('unit', '!=', '')
            ->with('template:id,name')
            ->get(['id', 'key', 'label', 'unit', 'type', 'report_template_id'])
            ->groupBy(fn (TemplateField $satu) => $satu->key.'|'.$satu->unit)
            ->map(fn ($kelompok, string $penanda) => [
                'penanda' => $penanda,
                'kunci' => $kelompok->first()->key,
                'label' => $kelompok->first()->label,
                'satuan' => $kelompok->first()->unit,
                'desimal' => $kelompok->contains(
                    fn (TemplateField $satu) => $satu->type === TemplateField::TIPE_DECIMAL,
                ),
                'template' => $kelompok
                    ->map(fn (TemplateField $satu) => $satu->template?->name)
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
            ])
            ->sortBy('label')
            ->values()
            ->all();
    }

    /**
     * Angka satu metrik pada rentang yang diminta.
     *
     * @return array<string, mixed>|null Null bila metriknya tidak dikenal.
     */
    public static function susun(PenyaringAnalitik $saring, string $penanda): ?array
    {
        $metrik = collect(self::metrikTersedia())->firstWhere('penanda', $penanda);

        if ($metrik === null) {
            return null;
        }

        [$kunci, $satuan] = [$metrik['kunci'], $metrik['satuan']];

        $templateId = TemplateField::query()
            ->where('key', $kunci)
            ->where('unit', $satuan)
            ->pluck('report_template_id')
            ->unique()
            ->values();

        if ($templateId->isEmpty()) {
            return null;
        }

        $baris = self::baris($saring, $kunci, $templateId->all());

        return [
            'metrik' => $metrik,
            'per_hari' => self::perHari($saring, $baris),
            'per_departemen' => self::perDepartemen($baris),
            'per_orang' => self::perOrang($baris),
            'ringkasan' => self::ringkasan($saring, $baris),
        ];
    }

    /**
     * Nilai mentah per laporan, sudah terjumlah per baris laporan.
     *
     * Jangkauan datanya tetap dari `DailyReport::scopeVisibleTo()` — query ini
     * menyambung ke hasilnya lewat subquery, bukan menyusun ulang aturannya.
     * Aturan jangkauan yang ditulis dua kali pasti berbeda di salah satunya.
     *
     * @param  list<int>  $templateId
     * @return Collection<int, object>
     */
    private static function baris(PenyaringAnalitik $saring, string $kunci, array $templateId)
    {
        $terlihat = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->whereBetween('report_date', [$saring->dari, $saring->sampai]);

        $saring->batasiLaporan($terlihat);

        /*
         * Nama kunci disisipkan ke dalam SQL, sehingga harus dibatasi bentuknya.
         * Ia berasal dari `template_fields.key` — bukan dari permintaan — tetapi
         * jalur itu dapat berubah, dan JSON path tidak dapat diikat sebagai
         * parameter.
         */
        if (! preg_match('/^[a-z0-9_]+$/i', $kunci)) {
            return collect();
        }

        $jalur = '$."'.$kunci.'"';

        return DB::table('daily_report_items as i')
            ->join('daily_report_sections as s', 's.id', '=', 'i.daily_report_section_id')
            ->joinSub(
                $terlihat->getQuery()->select(['id', 'report_date', 'department_id', 'user_id']),
                'r',
                'r.id',
                '=',
                's.daily_report_id',
            )
            ->whereIn('s.report_template_id', $templateId)
            ->whereRaw('JSON_EXTRACT(i.data, ?) IS NOT NULL', [$jalur])
            ->selectRaw(
                'r.report_date AS tanggal, r.department_id, r.user_id, '
                .'SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(i.data, ?)) AS DECIMAL(20,4))) AS nilai, '
                .'COUNT(*) AS baris',
                [$jalur],
            )
            ->groupBy('r.report_date', 'r.department_id', 'r.user_id')
            ->get()
            ->map(fn ($satu) => (object) [
                'tanggal' => Str::before((string) $satu->tanggal, ' '),
                'department_id' => (int) $satu->department_id,
                'user_id' => (int) $satu->user_id,
                'nilai' => (float) $satu->nilai,
                'baris' => (int) $satu->baris,
            ]);
    }

    /**
     * @param  Collection<int, object>  $baris
     * @return list<array<string, mixed>>
     */
    private static function perHari(PenyaringAnalitik $saring, $baris): array
    {
        $perTanggal = $baris->groupBy('tanggal');

        return array_map(function (string $tanggal) use ($perTanggal) {
            $hari = $perTanggal->get($tanggal, collect());

            return [
                'tanggal' => $tanggal,
                'nilai' => round((float) $hari->sum('nilai'), 2),
                'baris' => (int) $hari->sum('baris'),
                'pelapor' => $hari->pluck('user_id')->unique()->count(),
            ];
        }, $saring->tanggalRentang());
    }

    /**
     * @param  Collection<int, object>  $baris
     * @return list<array<string, mixed>>
     */
    private static function perDepartemen($baris): array
    {
        $nama = Department::whereIn('id', $baris->pluck('department_id')->unique())
            ->pluck('name', 'id');

        return $baris
            ->groupBy('department_id')
            ->map(fn ($kelompok, $id) => [
                'departemen_id' => (int) $id,
                'departemen' => $nama[$id] ?? '—',
                'nilai' => round((float) $kelompok->sum('nilai'), 2),
                'baris' => (int) $kelompok->sum('baris'),
            ])
            ->sortByDesc('nilai')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, object>  $baris
     * @return list<array<string, mixed>>
     */
    private static function perOrang($baris): array
    {
        $nama = User::whereIn('id', $baris->pluck('user_id')->unique())->pluck('name', 'id');

        return $baris
            ->groupBy('user_id')
            ->map(fn ($kelompok, $id) => [
                'pengguna_id' => (int) $id,
                'nama' => $nama[$id] ?? '—',
                'nilai' => round((float) $kelompok->sum('nilai'), 2),
                'hari' => $kelompok->pluck('tanggal')->unique()->count(),
            ])
            ->sortByDesc('nilai')
            ->values()
            ->take(20)
            ->all();
    }

    /**
     * Angka ringkas beserta pembandingnya.
     *
     * Total tanpa pembanding hampir tidak berarti: "12.400 kg" baru berbicara
     * setelah diketahui periode sebelumnya 9.800 kg.
     *
     * @param  Collection<int, object>  $baris
     * @return array<string, mixed>
     */
    private static function ringkasan(PenyaringAnalitik $saring, $baris): array
    {
        $total = round((float) $baris->sum('nilai'), 2);
        $hariBerisi = $baris->pluck('tanggal')->unique()->count();

        $tertinggi = $baris
            ->groupBy('tanggal')
            ->map(fn ($kelompok) => (float) $kelompok->sum('nilai'))
            ->sortDesc();

        return [
            'total' => $total,
            'rata_per_hari' => $hariBerisi === 0 ? 0 : round($total / $hariBerisi, 2),
            'hari_berisi' => $hariBerisi,
            'hari_rentang' => $saring->jumlahHari(),
            'tertinggi' => $tertinggi->isEmpty() ? null : [
                'tanggal' => $tertinggi->keys()->first(),
                'nilai' => round($tertinggi->first(), 2),
            ],
        ];
    }

    /**
     * Query builder yang sudah dibatasi jangkauan, untuk dipakai ulang.
     *
     * Dipisahkan supaya tidak ada pemanggil yang tergoda menyusun sendiri.
     */
    public static function dasarTerlihat(PenyaringAnalitik $saring): QueryBuilder
    {
        $query = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->whereBetween('report_date', [$saring->dari, $saring->sampai]);

        $saring->batasiLaporan($query);

        return $query->getQuery();
    }
}
