<?php

namespace App\Http\Controllers;

use App\Http\Requests\DailyReportRequest;
use App\Http\Resources\DailyReportResource;
use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\ReportTemplate;
use App\Models\User;
use App\Notifications\LaporanDikirim;
use App\Notifications\LaporanDitinjau;
use App\Rules\PanjangTeksKaya;
use App\Support\ApiResponse;
use App\Support\HtmlAman;
use App\Support\Audit;
use App\Support\JangkauanData;
use App\Support\KatalogIzin;
use App\Support\ValidasiIsianTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

class DailyReportController extends Controller
{
    /**
     * Daftar laporan yang boleh dilihat pengguna.
     *
     * Jangkauannya ditentukan `scopeVisibleTo`, bukan pemeriksaan role di
     * sini — satu tempat, satu aturan (CLAUDE.md, Aturan API).
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', DailyReport::class);

        $laporan = DailyReport::query()
            ->visibleTo($request->user())
            ->with(['user', 'department'])
            ->withCount('sections')
            ->dalamRentang($request->query('dari'), $request->query('sampai'))
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')),
            )
            ->when(
                $request->filled('departemen_id'),
                fn ($query) => $query->where('department_id', $request->integer('departemen_id')),
            )
            ->when($request->filled('cari'), function ($query) use ($request) {
                $kata = '%'.$request->string('cari')->trim().'%';
                $query->whereHas('user', fn ($sub) => $sub->where('name', 'like', $kata));
            })
            ->orderByDesc('report_date')
            ->orderByDesc('id')
            ->paginate(perPage: min($request->integer('per_halaman', 25), 100))
            ->withQueryString()
            ->through(fn (DailyReport $item) => new DailyReportResource($item));

        return ApiResponse::paginated($laporan);
    }

    public function show(Request $request, DailyReport $laporan): JsonResponse
    {
        $this->authorize('view', $laporan);

        return ApiResponse::ok(
            new DailyReportResource($this->muatLengkap($laporan)),
        );
    }

    /**
     * Membuat laporan baru sebagai draf.
     */
    public function store(DailyReportRequest $request): JsonResponse
    {
        $data = $request->validated();
        $pengguna = $request->user();

        // Satu pengguna satu laporan per tanggal. Diperiksa lebih dulu agar
        // pesannya jelas; unique index tetap menjadi penjaga terakhir.
        $sudahAda = DailyReport::where('user_id', $pengguna->id)
            ->where('report_date', $data['report_date'])
            ->first();

        if ($sudahAda !== null) {
            return ApiResponse::error(
                'Laporan untuk tanggal tersebut sudah ada. Buka laporan itu untuk melanjutkan.',
                422,
            );
        }

        $laporan = DB::transaction(function () use ($data, $pengguna) {
            $laporan = DailyReport::create([
                'user_id' => $pengguna->id,
                // Disalin, bukan dibaca lewat relasi: pengguna dapat dipindah
                // departemen, dan laporan lama harus tetap tercatat di tempat
                // asalnya.
                'department_id' => $pengguna->department_id,
                'report_date' => $data['report_date'],
                'status' => DailyReport::STATUS_DRAF,
            ]);

            $this->simpanBagian($laporan, $data['sections'], $pengguna);

            return $laporan;
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_LAPORAN,
            'Membuat laporan '.$laporan->report_date->translatedFormat('d F Y'),
            $laporan,
        );

        return ApiResponse::created(
            new DailyReportResource($this->muatLengkap($laporan)),
            'Laporan berhasil disimpan sebagai draf.',
        );
    }

    /**
     * Memperbarui isi laporan.
     *
     * Hanya selama masih draf — dijaga Policy. Tanggalnya tidak ikut berubah:
     * laporan tanggal lain adalah laporan yang berbeda.
     */
    public function update(DailyReportRequest $request, DailyReport $laporan): JsonResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($laporan, $data, $request) {
            // Bagian lama dihapus lalu ditulis ulang. Menyunting per baris
            // memerlukan penanda baris yang stabil, dan bentuk isian yang
            // dinamis membuat penanda itu tidak dapat diandalkan.
            $laporan->sections()->delete();
            $this->simpanBagian($laporan, $data['sections'], $request->user());
        });

        Audit::catat(
            Audit::AKSI_DIPERBARUI,
            Audit::MODUL_LAPORAN,
            'Memperbarui laporan '.$laporan->report_date->translatedFormat('d F Y'),
            $laporan,
        );

        return ApiResponse::ok(
            new DailyReportResource($this->muatLengkap($laporan->fresh())),
            'Laporan berhasil diperbarui.',
        );
    }

    /**
     * Mengirim laporan.
     *
     * Setelah dikirim, laporan menjadi catatan dan tidak dapat disunting lagi.
     */
    public function kirim(Request $request, DailyReport $laporan): JsonResponse
    {
        $this->authorize('kirim', $laporan);

        if ($laporan->sections()->doesntExist()) {
            return ApiResponse::error('Laporan masih kosong. Isi minimal satu bagian.', 422);
        }

        $laporan->forceFill([
            'status' => DailyReport::STATUS_DIKIRIM,
            'submitted_at' => now(),
        ])->save();

        Audit::catat(
            'dikirim',
            Audit::MODUL_LAPORAN,
            'Mengirim laporan '.$laporan->report_date->translatedFormat('d F Y'),
            $laporan,
        );

        $this->beriTahuAtasan($laporan);

        return ApiResponse::ok(
            new DailyReportResource($this->muatLengkap($laporan)),
            'Laporan berhasil dikirim.',
        );
    }

    /**
     * Menandai laporan sudah ditinjau (approval sederhana, PRD §4).
     */
    public function tinjau(Request $request, DailyReport $laporan): JsonResponse
    {
        $this->authorize('tinjau', $laporan);

        // Dibersihkan sebelum divalidasi, supaya panjang yang diperiksa sama
        // dengan panjang yang benar-benar tersimpan.
        $request->merge(['catatan' => HtmlAman::bersihkan($request->input('catatan'))]);

        $data = $request->validate(
            ['catatan' => ['nullable', 'string', new PanjangTeksKaya(255)]],
            attributes: ['catatan' => 'catatan tinjauan'],
        );

        $laporan->forceFill([
            'status' => DailyReport::STATUS_DITINJAU,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_note' => $data['catatan'] ?? null,
        ])->save();

        Audit::catat(
            'ditinjau',
            Audit::MODUL_LAPORAN,
            'Meninjau laporan '.$laporan->user->name
                .' tanggal '.$laporan->report_date->translatedFormat('d F Y'),
            $laporan,
        );

        // Penyusun perlu tahu laporannya sudah dibaca, terlebih bila ada catatan.
        $laporan->user?->notify(
            new LaporanDitinjau($laporan, $request->user(), $data['catatan'] ?? null),
        );

        return ApiResponse::ok(
            new DailyReportResource($this->muatLengkap($laporan)),
            'Laporan ditandai sudah ditinjau.',
        );
    }

    /**
     * Memberi tahu atasan di departemen yang sama bahwa ada laporan masuk.
     *
     * Yang diberi tahu hanya yang boleh meninjau, dan hanya pada departemen
     * laporan itu. Pemegang jangkauan Korporat melihat seluruh departemen;
     * mengirimi mereka satu notifikasi untuk tiap laporan yang masuk akan
     * membuat loncengnya tidak terbaca sama sekali.
     *
     * Departemennya dibaca dari `users.department_id`, bukan dari penetapan
     * peran. Pemberitahuan memang sengaja lebih sempit daripada jangkauan
     * melihat.
     */
    private function beriTahuAtasan(DailyReport $laporan): void
    {
        $peninjau = fn () => User::query()
            ->where('is_active', true)
            ->whereKeyNot($laporan->user_id)
            ->whereHas('roles.permissions', fn ($query) => $query
                ->where('key', KatalogIzin::LAPORAN_TINJAU));

        $atasan = $peninjau()
            ->where('department_id', $laporan->department_id)
            ->get();

        /*
         * Naik ke jangkauan korporat bila departemennya tidak punya peninjau
         * lain.
         *
         * Departemen berisi satu orang bukan kasus langka — IT, Marketing, dan
         * beberapa unit lain memang begitu. Bila orang itu sendiri satu-satunya
         * yang berhak meninjau, penyaringan "sedepartemen dan bukan penulisnya"
         * menghasilkan daftar kosong, dan laporannya terkirim tanpa satu pun
         * pemberitahuan ke siapa pun. Tidak ada galat, tidak ada tanda — hanya
         * laporan yang tidak pernah dibaca.
         *
         * Hanya dinaikkan ketika memang kosong. Selalu menyertakan pemegang
         * korporat akan mengisi lonceng mereka dengan laporan dari delapan belas
         * departemen setiap hari, dan lonceng yang selalu penuh berhenti dibaca.
         */
        if ($atasan->isEmpty()) {
            $atasan = $peninjau()
                ->whereHas(
                    'roles',
                    fn ($query) => $query->where('role_user.scope_level', JangkauanData::KORPORAT),
                )
                ->get();
        }

        Notification::send($atasan, new LaporanDikirim($laporan));
    }

    public function destroy(DailyReport $laporan): JsonResponse
    {
        $this->authorize('delete', $laporan);

        $tanggal = $laporan->report_date->translatedFormat('d F Y');
        $laporan->delete();

        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_LAPORAN,
            "Menghapus draf laporan {$tanggal}",
        );

        return ApiResponse::ok(null, 'Draf laporan berhasil dihapus.');
    }

    /**
     * Menyimpan bagian beserta barisnya.
     *
     * @param  array<int, array<string, mixed>>  $bagian
     *
     * @throws ValidationException
     */
    private function simpanBagian(DailyReport $laporan, array $bagian, User $pengguna): void
    {
        foreach (array_values($bagian) as $urutan => $isiBagian) {
            $template = ReportTemplate::with('fields')->findOrFail($isiBagian['report_template_id']);

            // Template departemen lain tidak boleh dipakai. Tanpa ini, siapa
            // pun dapat mengisi laporan memakai bentuk tabel departemen lain.
            if ($template->department_id !== null && $template->department_id !== $pengguna->department_id) {
                throw ValidationException::withMessages([
                    "sections.{$urutan}.report_template_id" => 'Template tersebut bukan milik departemen Anda.',
                ]);
            }

            if (! $template->is_active) {
                throw ValidationException::withMessages([
                    "sections.{$urutan}.report_template_id" => 'Template tersebut sudah tidak aktif.',
                ]);
            }

            ValidasiIsianTemplate::periksa(
                $template,
                $isiBagian['items'],
                "sections.{$urutan}.items",
            );

            $section = $laporan->sections()->create([
                'report_template_id' => $template->id,
                'sort_order' => $urutan,
            ]);

            foreach (array_values($isiBagian['items']) as $nomorBaris => $isiBaris) {
                $bersih = ValidasiIsianTemplate::bersihkan($template, (array) $isiBaris);

                $section->items()->create([
                    'data' => $bersih,
                    'progress_status' => ValidasiIsianTemplate::statusBaris($template, $bersih),
                    'sort_order' => $nomorBaris,
                ]);
            }
        }
    }

    private function muatLengkap(DailyReport $laporan): DailyReport
    {
        return $laporan->load([
            'user',
            'department',
            'peninjau',
            'sections.template.fields.jenisMaster',
            'sections.items',
            'attachments.pengunggah',
        ]);
    }

    /**
     * Menduplikat laporan menjadi laporan baru pada tanggal lain.
     *
     * ## Angka sengaja dikosongkan
     *
     * Yang berulang tiap hari adalah pekerjaannya — nama aktivitas, keterangan,
     * supplier, produk. Angkanya justru yang wajib berbeda, dan angka kemarin
     * yang ikut terbawa diam-diam adalah data salah yang paling sulit
     * terdeteksi: bentuknya benar, letaknya benar, dan tidak ada satu pun
     * pemeriksaan yang dapat menandainya.
     *
     * Status baris ikut dikosongkan dengan alasan yang sama — pekerjaan yang
     * kemarin selesai belum tentu selesai hari ini.
     */
    public function duplikat(Request $request, DailyReport $sumber): JsonResponse
    {
        $this->authorize('duplikat', $sumber);

        $pengguna = $request->user();

        $data = $request->validate(
            ['report_date' => ['required', 'date', 'before_or_equal:today']],
            [
                'report_date.before_or_equal' => 'Laporan tidak dapat dibuat untuk tanggal yang belum terjadi.',
            ],
            ['report_date' => 'tanggal laporan'],
        );

        // Penjagaan yang sama dengan `store()`: satu pengguna satu laporan per
        // tanggal, dan indeks unik tetap menjadi penjaga terakhir.
        $bentrok = DailyReport::where('user_id', $pengguna->id)
            ->where('report_date', $data['report_date'])
            ->exists();

        if ($bentrok) {
            return ApiResponse::error(
                'Laporan untuk tanggal tersebut sudah ada. Buka laporan itu untuk melanjutkan.',
                422,
            );
        }

        $sumber->load('sections.template.fields', 'sections.items');

        $laporan = DB::transaction(function () use ($sumber, $pengguna, $data) {
            $baru = DailyReport::create([
                'user_id' => $pengguna->id,
                'department_id' => $pengguna->department_id,
                'report_date' => $data['report_date'],
                'status' => DailyReport::STATUS_DRAF,
            ]);

            foreach ($sumber->sections as $bagian) {
                $bagianBaru = $baru->sections()->create([
                    'report_template_id' => $bagian->report_template_id,
                    'sort_order' => $bagian->sort_order,
                ]);

                foreach ($bagian->items as $urutan => $isi) {
                    $nilai = self::tanpaAngka($bagian->template, (array) $isi->data);

                    $bagianBaru->items()->create([
                        'data' => $nilai,
                        'progress_status' => null,
                        'sort_order' => $urutan,
                    ]);
                }
            }

            return $baru;
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_LAPORAN,
            'Menduplikat laporan '.$sumber->report_date->translatedFormat('d F Y'),
            $laporan,
            ['sumber_id' => $sumber->id],
        );

        return ApiResponse::created(
            new DailyReportResource($this->muatLengkap($laporan)),
            'Laporan berhasil diduplikat. Periksa dan lengkapi angkanya.',
        );
    }

    /**
     * Menyalin isian satu baris tanpa kolom angka dan tanpa status.
     *
     * @param  array<string, mixed>  $nilai
     * @return array<string, mixed>
     */
    private static function tanpaAngka(?ReportTemplate $template, array $nilai): array
    {
        if ($template === null) {
            return $nilai;
        }

        foreach ($template->fields as $kolom) {
            if ($kolom->bertipeAngka() || $kolom->key === DailyReportItem::KUNCI_STATUS) {
                $nilai[$kolom->key] = null;
            }
        }

        return $nilai;
    }
}
