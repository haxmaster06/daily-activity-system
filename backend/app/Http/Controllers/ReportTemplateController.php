<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReportTemplateRequest;
use App\Http\Resources\ReportTemplateResource;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportTemplateController extends Controller
{
    /**
     * Daftar template.
     *
     * Tanpa pagination — master data ini hanya puluhan baris dan halaman
     * pengelolanya menampilkan semuanya dalam tab per departemen.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ReportTemplate::class);

        $template = ReportTemplate::query()
            ->with('department')
            ->withCount('fields')
            /*
             * Halaman pengelola membutuhkan seluruh kolom sekaligus untuk
             * mengisi wizard saat template disunting. Mengambilnya satu per
             * satu saat dialog dibuka akan menghasilkan permintaan berulang.
             */
            ->when($request->boolean('dengan_kolom'), fn ($query) => $query->with('fields'))
            ->when(
                $request->filled('departemen_id'),
                fn ($query) => $query->untukDepartemen($request->integer('departemen_id')),
            )
            ->when($request->boolean('hanya_aktif'), fn ($query) => $query->aktif())
            ->orderBy('department_id')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ApiResponse::ok(ReportTemplateResource::collection($template));
    }

    /**
     * Satu template beserta seluruh kolomnya — dipakai merender form laporan.
     */
    public function show(ReportTemplate $template): JsonResponse
    {
        $this->authorize('view', $template);

        return ApiResponse::ok(
            new ReportTemplateResource($template->load(['department', 'fields'])),
        );
    }

    /**
     * Daftar tipe kolom dan sumber master data untuk penyusun template.
     */
    public function opsiKolom(): JsonResponse
    {
        $this->authorize('viewAny', ReportTemplate::class);

        return ApiResponse::ok([
            'tipe' => collect(TemplateField::TIPE)
                ->map(fn (string $label, string $nilai) => compact('nilai', 'label'))
                ->values(),
            'sumber_master' => collect(TemplateField::SUMBER_LOOKUP)
                ->map(fn (string $label, string $nilai) => compact('nilai', 'label'))
                ->values(),
        ]);
    }

    public function store(ReportTemplateRequest $request): JsonResponse
    {
        $data = $request->validated();

        $template = DB::transaction(function () use ($data) {
            $template = ReportTemplate::create(collect($data)->except('fields')->all());
            $this->simpanKolom($template, $data['fields']);

            return $template;
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_TEMPLATE,
            "Membuat template {$template->name}",
            $template,
            ['kode' => $template->code, 'jumlah_kolom' => count($data['fields'])],
        );

        return ApiResponse::created(
            new ReportTemplateResource($template->load(['department', 'fields'])),
            'Template berhasil dibuat.',
        );
    }

    /**
     * Memperbarui template.
     *
     * Kolom lama dihapus lalu ditulis ulang dari kiriman. Aman selama template
     * belum dipakai laporan — begitu sudah dipakai, perubahan bentuk akan
     * ditolak di M3 dan diarahkan membuat versi baru.
     */
    public function update(ReportTemplateRequest $request, ReportTemplate $template): JsonResponse
    {
        $data = $request->validated();
        $sebelum = $template->only(['code', 'name', 'description', 'department_id', 'is_active']);

        DB::transaction(function () use ($template, $data) {
            $template->update(collect($data)->except('fields')->all());
            $template->fields()->delete();
            $this->simpanKolom($template, $data['fields']);
        });

        $perubahan = Audit::selisih($sebelum, $template->only(array_keys($sebelum)));
        $perubahan['jumlah_kolom'] = count($data['fields']);

        Audit::catat(
            Audit::AKSI_DIPERBARUI,
            Audit::MODUL_TEMPLATE,
            "Memperbarui template {$template->name}",
            $template,
            $perubahan,
        );

        return ApiResponse::ok(
            new ReportTemplateResource($template->fresh()->load(['department', 'fields'])),
            'Template berhasil diperbarui.',
        );
    }

    public function destroy(ReportTemplate $template): JsonResponse
    {
        $this->authorize('delete', $template);

        $nama = $template->name;
        $template->delete();

        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_TEMPLATE,
            "Menghapus template {$nama}",
        );

        return ApiResponse::ok(null, 'Template berhasil dihapus.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $kolom
     */
    private function simpanKolom(ReportTemplate $template, array $kolom): void
    {
        foreach (array_values($kolom) as $urutan => $field) {
            $template->fields()->create([
                ...$field,
                // Urutan diambil dari posisi pada kiriman, bukan dari nilai
                // yang dikirim klien, agar tidak ada urutan ganda.
                'sort_order' => $urutan,
            ]);
        }
    }
}
