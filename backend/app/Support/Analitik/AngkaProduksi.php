<?php

namespace App\Support\Analitik;

use App\Models\DailyReport;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Ringkasan proses produksi untuk pengambilan keputusan — bukan papan penyaring.
 *
 * Template Produksi sudah tersusun per stasiun lewat `group_label`
 * (Oven → Ayak → Packing 1 → Xray → Packing 2), tiap stasiun berpola Target /
 * Masuk / Keluar / susut. Kelas ini membaca struktur itu apa adanya lalu
 * menjumlahkan angkanya sepanjang satu periode, sehingga edit template langsung
 * tercermin tanpa mengubah kode.
 *
 * Satu-satunya kontrol adalah **periode**: harian, mingguan, bulanan, tahunan.
 * Masing-masing menetapkan jendela waktu sekaligus butir tren.
 */
final class AngkaProduksi
{
    /** @var array<string, array{unit: string, jumlah: int, label: string}> */
    private const PERIODE = [
        'harian' => ['unit' => 'day', 'jumlah' => 30, 'label' => '30 hari terakhir'],
        'mingguan' => ['unit' => 'week', 'jumlah' => 12, 'label' => '12 minggu terakhir'],
        'bulanan' => ['unit' => 'month', 'jumlah' => 12, 'label' => '12 bulan terakhir'],
        'tahunan' => ['unit' => 'year', 'jumlah' => 5, 'label' => '5 tahun terakhir'],
    ];

    public const PERIODE_BAWAAN = 'bulanan';

    /**
     * @return array<string, mixed>
     */
    public static function susun(User $pengguna, string $periode, ?int $penggunaId = null): array
    {
        $periode = isset(self::PERIODE[$periode]) ? $periode : self::PERIODE_BAWAAN;
        [$dari, $sampai] = self::rentang($periode);
        $panjang = $dari->diffInDays($sampai) + 1;
        [$dariSblm, $sampaiSblm] = [$dari->copy()->subDays($panjang), $dari->copy()->subDay()];

        $proses = ReportTemplate::where('code', 'PROD_PROSES')->first();
        $spk = ReportTemplate::where('code', 'PROD_SPK')->first();

        // Daftar pelapor untuk penyaring "per user". Selalu berdasar seluruh
        // pelapor yang terlihat, bukan hanya yang terpilih.
        $pelapor = self::pelapor($pengguna, $dari, $sampai, $proses, $spk);

        // Pilihan di luar daftar (di luar jangkauan / tak melapor) diabaikan,
        // bukan ditolak — jatuh ke "semua pelapor".
        if ($penggunaId !== null && ! collect($pelapor)->contains('id', $penggunaId)) {
            $penggunaId = null;
        }

        $stasiun = $proses ? self::stasiun($pengguna, $dari, $sampai, $proses, $penggunaId) : [];
        $order = $spk ? self::order($pengguna, $dari, $sampai, $spk, $penggunaId) : null;

        return [
            'periode' => $periode,
            'periode_label' => self::PERIODE[$periode]['label'],
            'rentang' => ['dari' => $dari->toDateString(), 'sampai' => $sampai->toDateString()],
            'pengguna_id' => $penggunaId,
            'pelapor' => $pelapor,
            'kpi' => self::kpi($pengguna, $dari, $sampai, $dariSblm, $sampaiSblm, $proses, $spk, $penggunaId),
            'stasiun' => $stasiun,
            'order' => $order,
            'tren' => $proses ? self::tren($pengguna, $dari, $sampai, $periode, $proses, $penggunaId) : null,
        ];
    }

    /**
     * Pelapor yang mengisi template Produksi pada periode — dalam jangkauan.
     *
     * @return list<array{id: int, nama: string}>
     */
    private static function pelapor(User $pengguna, Carbon $dari, Carbon $sampai, ?ReportTemplate $proses, ?ReportTemplate $spk): array
    {
        $templateId = collect([$proses, $spk])->filter()->pluck('id')->all();

        if ($templateId === []) {
            return [];
        }

        $userId = DailyReport::query()
            ->visibleTo($pengguna)
            ->whereBetween('report_date', [$dari, $sampai])
            ->whereHas('sections', fn ($q) => $q->whereIn('report_template_id', $templateId))
            ->distinct()
            ->pluck('user_id');

        return User::whereIn('id', $userId)
            ->orderBy('name')
            ->pluck('name', 'id')
            ->map(fn (string $nama, int|string $id) => ['id' => (int) $id, 'nama' => $nama])
            ->values()
            ->all();
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private static function rentang(string $periode): array
    {
        $cfg = self::PERIODE[$periode];
        $sampai = Carbon::today()->endOfDay();
        $dari = match ($cfg['unit']) {
            'day' => Carbon::today()->subDays($cfg['jumlah'] - 1),
            'week' => Carbon::today()->subWeeks($cfg['jumlah'] - 1)->startOfWeek(),
            'month' => Carbon::today()->subMonths($cfg['jumlah'] - 1)->startOfMonth(),
            'year' => Carbon::today()->subYears($cfg['jumlah'] - 1)->startOfYear(),
            default => Carbon::today()->subDays(29),
        };

        return [$dari->startOfDay(), $sampai];
    }

    /**
     * Field numerik satu template, terurut, dikelompokkan per stasiun.
     *
     * @return Collection<int, TemplateField>
     */
    private static function fieldNumerik(ReportTemplate $template): Collection
    {
        return $template->fields()
            ->whereIn('type', [TemplateField::TIPE_INTEGER, TemplateField::TIPE_DECIMAL])
            ->orderBy('sort_order')
            ->get(['key', 'label', 'group_label', 'type', 'unit', 'sort_order']);
    }

    /** Peran kolom ditebak dari akhiran kunci — konsisten di template proses. */
    private static function peran(string $key): string
    {
        return match (true) {
            str_ends_with($key, '_target') => 'target',
            str_ends_with($key, '_masuk') => 'masuk',
            str_ends_with($key, '_keluar') => 'keluar',
            default => 'lain',
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function stasiun(User $pengguna, Carbon $dari, Carbon $sampai, ReportTemplate $proses, ?int $penggunaId): array
    {
        $fields = self::fieldNumerik($proses)->filter(fn (TemplateField $f) => $f->group_label !== null && $f->group_label !== '');

        if ($fields->isEmpty()) {
            return [];
        }

        $jumlah = self::jumlah($pengguna, $dari, $sampai, $proses->id, $fields->pluck('key')->all(), $penggunaId);

        // Urutan stasiun mengikuti kemunculan pertama pada sort_order.
        return $fields
            ->groupBy('group_label')
            ->map(function (Collection $kelompok, string $nama) use ($jumlah) {
                $daftar = $kelompok->map(fn (TemplateField $f) => [
                    'label' => $f->label,
                    'satuan' => $f->unit ?? '',
                    'nilai' => round($jumlah[$f->key] ?? 0, 2),
                    'peran' => self::peran($f->key),
                ])->values()->all();

                $target = collect($daftar)->firstWhere('peran', 'target')['nilai'] ?? null;
                $keluar = collect($daftar)->firstWhere('peran', 'keluar')['nilai'] ?? null;

                return [
                    'nama' => $nama,
                    'urut' => $kelompok->min('sort_order'),
                    'field' => $daftar,
                    'tercapai' => ($target && $target > 0 && $keluar !== null)
                        ? round($keluar / $target * 100, 1)
                        : null,
                ];
            })
            ->sortBy('urut')
            ->values()
            ->all();
    }

    /**
     * KPI ringkas beserta pembandingnya (periode sebelumnya sama panjang).
     *
     * @return list<array<string, mixed>>
     */
    private static function kpi(
        User $pengguna,
        Carbon $dari,
        Carbon $sampai,
        Carbon $dariSblm,
        Carbon $sampaiSblm,
        ?ReportTemplate $proses,
        ?ReportTemplate $spk,
        ?int $penggunaId,
    ): array {
        $kartu = [];

        if ($proses) {
            $fields = self::fieldNumerik($proses);
            $masuk = $fields->first(fn (TemplateField $f) => self::peran($f->key) === 'masuk');
            $keluar = $fields->filter(fn (TemplateField $f) => self::peran($f->key) === 'keluar')->last();
            $target = $fields->filter(fn (TemplateField $f) => self::peran($f->key) === 'target')->last();

            $kunci = collect([$masuk, $keluar, $target])->filter()->pluck('key')->all();
            $kini = self::jumlah($pengguna, $dari, $sampai, $proses->id, $kunci, $penggunaId);
            $lalu = self::jumlah($pengguna, $dariSblm, $sampaiSblm, $proses->id, $kunci, $penggunaId);

            if ($keluar) {
                $kartu[] = self::kartu('Keluaran akhir', $keluar->unit ?? '',
                    $kini[$keluar->key] ?? 0, $lalu[$keluar->key] ?? 0,
                    'Total keluaran stasiun terakhir sepanjang periode.');
            }
            if ($masuk) {
                $kartu[] = self::kartu('Bahan masuk', $masuk->unit ?? '',
                    $kini[$masuk->key] ?? 0, $lalu[$masuk->key] ?? 0,
                    'Total bahan masuk pada stasiun pertama.');
            }
            if ($keluar && $target && ($kini[$target->key] ?? 0) > 0) {
                $kartu[] = self::kartu('Target tercapai', '%',
                    round(($kini[$keluar->key] ?? 0) / $kini[$target->key] * 100, 1),
                    ($lalu[$target->key] ?? 0) > 0 ? round(($lalu[$keluar->key] ?? 0) / $lalu[$target->key] * 100, 1) : 0,
                    'Keluaran akhir dibagi target, stasiun terakhir.');
            }
        }

        if ($spk) {
            $kini = self::jumlah($pengguna, $dari, $sampai, $spk->id, ['butuh_box', 'selesai_box'], $penggunaId);
            $lalu = self::jumlah($pengguna, $dariSblm, $sampaiSblm, $spk->id, ['butuh_box', 'selesai_box'], $penggunaId);
            if (($kini['butuh_box'] ?? 0) > 0) {
                $kartu[] = self::kartu('Order terpenuhi', '%',
                    round(($kini['selesai_box'] ?? 0) / $kini['butuh_box'] * 100, 1),
                    ($lalu['butuh_box'] ?? 0) > 0 ? round(($lalu['selesai_box'] ?? 0) / $lalu['butuh_box'] * 100, 1) : 0,
                    'Box selesai dibagi box dibutuhkan (PROD_SPK).');
            }
        }

        return $kartu;
    }

    /**
     * @return array<string, mixed>
     */
    private static function kartu(string $label, string $satuan, float $nilai, float $sebelum, string $keterangan): array
    {
        // Bentuknya cocok dengan tipe KartuKpi di frontend, agar kartu KPI yang
        // sama (`KartuAngka`) dapat dipakai ulang. Semua metrik di sini "naik = baik".
        return [
            'kunci' => str_replace(' ', '-', mb_strtolower($label)),
            'label' => $label,
            'nilai' => round($nilai, 2),
            'satuan' => $satuan,
            'sebelumnya' => round($sebelum, 2),
            'arah_baik' => 'naik',
            'keterangan' => $keterangan,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function order(User $pengguna, Carbon $dari, Carbon $sampai, ReportTemplate $spk, ?int $penggunaId): ?array
    {
        $jumlah = self::jumlah($pengguna, $dari, $sampai, $spk->id, [
            'butuh_pouch', 'selesai_pouch', 'kurang_pouch',
            'butuh_box', 'selesai_box', 'kurang_box',
        ], $penggunaId);

        $baris = DB::table('daily_report_items as i')
            ->join('daily_report_sections as s', 's.id', '=', 'i.daily_report_section_id')
            ->joinSub(self::terlihat($pengguna, $dari, $sampai, ['id'], $penggunaId), 'r', 'r.id', '=', 's.daily_report_id')
            ->where('s.report_template_id', $spk->id)
            ->selectRaw(
                'COUNT(*) AS spk, '
                ."SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(i.data, '$.tanggal_kirim')) IS NOT NULL "
                ."AND JSON_UNQUOTE(JSON_EXTRACT(i.data, '$.tanggal_selesai')) IS NOT NULL THEN 1 ELSE 0 END) AS terjadwal, "
                ."SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(i.data, '$.tanggal_selesai')) <= "
                ."JSON_UNQUOTE(JSON_EXTRACT(i.data, '$.tanggal_kirim')) THEN 1 ELSE 0 END) AS tepat",
            )
            ->first();

        return array_merge(
            array_map(fn ($n) => round($n, 2), $jumlah),
            [
                'spk' => (int) ($baris->spk ?? 0),
                'terjadwal' => (int) ($baris->terjadwal ?? 0),
                'tepat_kirim' => (int) ($baris->tepat ?? 0),
            ],
        );
    }

    /**
     * Tren keluaran akhir per butir periode. Butiran dihitung di PHP dari jumlah
     * harian, supaya tak ada selisih format tanggal antara SQL dan Carbon.
     *
     * @return array<string, mixed>|null
     */
    private static function tren(User $pengguna, Carbon $dari, Carbon $sampai, string $periode, ReportTemplate $proses, ?int $penggunaId): ?array
    {
        $keluar = self::fieldNumerik($proses)
            ->filter(fn (TemplateField $f) => self::peran($f->key) === 'keluar')
            ->last();

        if (! $keluar || ! preg_match('/^[a-z0-9_]+$/i', $keluar->key)) {
            return null;
        }

        $jalur = '$."'.$keluar->key.'"';
        $harian = DB::table('daily_report_items as i')
            ->join('daily_report_sections as s', 's.id', '=', 'i.daily_report_section_id')
            ->joinSub(self::terlihat($pengguna, $dari, $sampai, ['id', 'report_date'], $penggunaId), 'r', 'r.id', '=', 's.daily_report_id')
            ->where('s.report_template_id', $proses->id)
            ->groupBy('r.report_date')
            ->selectRaw(
                'r.report_date AS tanggal, '
                .'SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(i.data, ?)) AS DECIMAL(20,4))) AS nilai',
                [$jalur],
            )
            ->pluck('nilai', 'tanggal');

        $unit = self::PERIODE[$periode]['unit'];
        $titik = [];
        $cursor = self::awalButir($dari->copy(), $unit);
        while ($cursor <= $sampai) {
            $titik[self::kunciButir($cursor, $unit)] = [
                'label' => self::labelButir($cursor, $unit),
                'nilai' => 0.0,
            ];
            $cursor = self::majuButir($cursor, $unit);
        }

        foreach ($harian as $tanggal => $nilai) {
            $kunci = self::kunciButir(Carbon::parse((string) $tanggal), $unit);
            if (isset($titik[$kunci])) {
                $titik[$kunci]['nilai'] = round($titik[$kunci]['nilai'] + (float) $nilai, 2);
            }
        }

        return ['satuan' => $keluar->unit ?? '', 'label' => $keluar->label, 'titik' => array_values($titik)];
    }

    private static function awalButir(Carbon $c, string $unit): Carbon
    {
        return match ($unit) {
            'week' => $c->startOfWeek(),
            'month' => $c->startOfMonth(),
            'year' => $c->startOfYear(),
            default => $c->startOfDay(),
        };
    }

    private static function majuButir(Carbon $c, string $unit): Carbon
    {
        return match ($unit) {
            'week' => $c->copy()->addWeek(),
            'month' => $c->copy()->addMonth(),
            'year' => $c->copy()->addYear(),
            default => $c->copy()->addDay(),
        };
    }

    private static function kunciButir(Carbon $c, string $unit): string
    {
        return match ($unit) {
            'week' => $c->format('o-\WW'),
            'month' => $c->format('Y-m'),
            'year' => $c->format('Y'),
            default => $c->format('Y-m-d'),
        };
    }

    private static function labelButir(Carbon $c, string $unit): string
    {
        return match ($unit) {
            'week' => 'Mgg '.$c->isoWeek(),
            'month' => $c->locale('id')->isoFormat('MMM YY'),
            'year' => $c->format('Y'),
            default => $c->locale('id')->isoFormat('D MMM'),
        };
    }

    /**
     * Jumlah tiap kunci sepanjang rentang, satu query banyak kolom SUM.
     *
     * @param  list<string>  $keys
     * @return array<string, float>
     */
    private static function jumlah(User $pengguna, Carbon $dari, Carbon $sampai, int $templateId, array $keys, ?int $penggunaId = null): array
    {
        $keys = array_values(array_filter($keys, fn ($k) => preg_match('/^[a-z0-9_]+$/i', $k)));

        if ($keys === []) {
            return [];
        }

        $pilih = [];
        $bind = [];
        foreach ($keys as $k) {
            // $k sudah dibatasi [a-z0-9_], aman disisipkan sebagai nama kolom.
            $pilih[] = "SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(i.data, ?)) AS DECIMAL(20,4))) AS `{$k}`";
            $bind[] = '$."'.$k.'"';
        }

        $baris = DB::table('daily_report_items as i')
            ->join('daily_report_sections as s', 's.id', '=', 'i.daily_report_section_id')
            ->joinSub(self::terlihat($pengguna, $dari, $sampai, ['id'], $penggunaId), 'r', 'r.id', '=', 's.daily_report_id')
            ->where('s.report_template_id', $templateId)
            ->selectRaw(implode(', ', $pilih), $bind)
            ->first();

        $hasil = [];
        foreach ($keys as $k) {
            $hasil[$k] = (float) ($baris->{$k} ?? 0);
        }

        return $hasil;
    }

    /**
     * Subquery laporan yang terlihat, dalam rentang. Jangkauan tetap dari
     * `scopeVisibleTo()` — tidak ditulis ulang.
     *
     * @param  list<string>  $kolom
     */
    private static function terlihat(User $pengguna, Carbon $dari, Carbon $sampai, array $kolom = ['id'], ?int $penggunaId = null): Builder
    {
        return DailyReport::query()
            ->visibleTo($pengguna)
            ->whereBetween('report_date', [$dari, $sampai])
            ->when($penggunaId !== null, fn ($q) => $q->where('user_id', $penggunaId))
            ->getQuery()
            ->select($kolom);
    }
}
