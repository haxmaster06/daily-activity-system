<?php

namespace App\Http\Controllers;

use App\Http\Requests\TugasRequest;
use App\Http\Resources\TugasResource;
use App\Models\DailyReport;
use App\Models\Tugas;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TugasController extends Controller
{
    /**
     * Kartu papan progres, dikelompokkan per kolom.
     *
     * Dikelompokkan di server, bukan di antarmuka: papan selalu menampilkan
     * ketiga kolom sekaligus, sehingga mengirimnya sebagai satu daftar datar
     * hanya memindahkan pekerjaan yang sama ke peramban.
     *
     * Tanpa pagination. Papan yang menyembunyikan sebagian kartunya berhenti
     * menjadi papan; bila jumlahnya membengkak, yang dibatasi adalah rentang
     * waktunya lewat penyaring, bukan potongan halamannya.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tugas::class);

        $tugas = Tugas::query()
            ->visibleTo($request->user())
            ->with(['department', 'penanggungJawab'])
            ->withCount('laporan')
            ->when(
                $request->filled('departemen_id'),
                fn ($query) => $query->where('department_id', $request->integer('departemen_id')),
            )
            ->when(
                $request->filled('penanggung_jawab_id'),
                fn ($query) => $query->where(
                    'penanggung_jawab_id',
                    $request->integer('penanggung_jawab_id'),
                ),
            )
            ->when(
                $request->filled('cari'),
                fn ($query) => $query->where('title', 'like', '%'.trim($request->string('cari')).'%'),
            )
            ->orderBy('urutan')
            ->orderByDesc('id')
            ->get();

        $kolom = [];

        foreach (array_keys(Tugas::STATUS) as $status) {
            $kolom[] = [
                'status' => $status,
                'label' => Tugas::STATUS[$status],
                'kartu' => TugasResource::collection(
                    $tugas->where('status', $status)->values(),
                ),
            ];
        }

        return ApiResponse::ok($kolom);
    }

    public function store(TugasRequest $request): JsonResponse
    {
        $data = $request->validated();

        $tugas = DB::transaction(function () use ($request, $data) {
            // `laporan_id` bukan kolom — tautannya disimpan lewat pivot.
            $tugas = new Tugas(collect($data)->except('laporan_id')->all());
            // Pembuat tidak diterima dari klien: itu jejak, bukan isian.
            $tugas->dibuat_oleh_id = $request->user()->getKey();
            /*
             * Status diisi eksplisit, tidak diserahkan ke default basis data.
             * Default kolom hanya berlaku pada baris yang tersimpan; model di
             * memori tetap null, dan `geserSisanya()` di bawah menyaring
             * berdasarkan status — mencari `null` berarti tidak menemukan
             * kartu mana pun, dan urutannya diam-diam tidak dirapatkan.
             */
            $tugas->status = $data['status'] ?? Tugas::STATUS_BELUM_MULAI;
            // Kartu baru selalu di puncak kolomnya — yang baru dibuat itulah
            // yang sedang dipikirkan pembuatnya.
            $tugas->urutan = 0;
            $tugas->save();

            $this->geserSisanya($tugas);
            $this->sinkronkanLaporan($tugas, $request);

            return $tugas;
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_LAPORAN,
            "Membuat tugas {$tugas->title}",
            $tugas,
            $data,
        );

        return ApiResponse::created(
            new TugasResource($tugas->load(['department', 'penanggungJawab', 'laporan'])),
            'Tugas berhasil ditambahkan.',
        );
    }

    public function update(TugasRequest $request, Tugas $tugas): JsonResponse
    {
        $sebelum = $tugas->only([
            'title', 'description', 'department_id', 'penanggung_jawab_id',
            'status', 'prioritas', 'target_selesai',
        ]);

        DB::transaction(function () use ($request, $tugas): void {
            $tugas->update(collect($request->validated())->except('laporan_id')->all());
            $this->sinkronkanLaporan($tugas, $request);
        });

        $perubahan = Audit::selisih($sebelum, $tugas->only(array_keys($sebelum)));

        if ($perubahan !== []) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_LAPORAN,
                "Memperbarui tugas {$tugas->title}",
                $tugas,
                $perubahan,
            );
        }

        return ApiResponse::ok(
            new TugasResource($tugas->load(['department', 'penanggungJawab', 'laporan'])),
            'Tugas berhasil diperbarui.',
        );
    }

    /**
     * Memindahkan kartu antar kolom, atau di dalam kolomnya.
     *
     * Dipisah dari `update` karena inilah satu-satunya aksi yang dipicu
     * tarik-lepas, dan harus murah: dua kolom, tanpa memvalidasi seluruh isi
     * kartu. Menyeret kartu tidak boleh gagal hanya karena judulnya kebetulan
     * melewati batas panjang.
     */
    public function geser(Request $request, Tugas $tugas): JsonResponse
    {
        $this->authorize('update', $tugas);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(array_keys(Tugas::STATUS))],
            'urutan' => ['required', 'integer', 'min:0', 'max:9999'],
        ], attributes: ['status' => 'kolom', 'urutan' => 'posisi']);

        $statusLama = $tugas->status;

        DB::transaction(function () use ($tugas, $data): void {
            $tugas->update(['status' => $data['status'], 'urutan' => $data['urutan']]);
            $this->geserSisanya($tugas);
        });

        if ($statusLama !== $data['status']) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_LAPORAN,
                "Memindahkan tugas {$tugas->title} ke "
                .(Tugas::STATUS[$data['status']] ?? $data['status']),
                $tugas,
                ['status' => ['sebelum' => $statusLama, 'sesudah' => $data['status']]],
            );
        }

        return ApiResponse::ok(
            new TugasResource($tugas->load(['department', 'penanggungJawab'])),
            'Tugas berhasil dipindahkan.',
        );
    }

    public function destroy(Tugas $tugas): JsonResponse
    {
        $this->authorize('delete', $tugas);

        $judul = $tugas->title;
        // Tautan laporan ikut terhapus lewat cascade; laporannya sendiri tidak
        // tersentuh — yang dihapus kartunya, bukan catatan pekerjaannya.
        $tugas->delete();

        Audit::catat(Audit::AKSI_DIHAPUS, Audit::MODUL_LAPORAN, "Menghapus tugas {$judul}");

        return ApiResponse::ok(null, "Tugas {$judul} berhasil dihapus.");
    }

    /**
     * Merapatkan urutan kartu lain pada kolom yang sama.
     *
     * Tanpa ini, dua kartu dapat berbagi angka urutan yang sama dan posisinya
     * berganti-ganti antar pemuatan — papan yang susunannya berubah sendiri
     * membuat pengisinya berhenti memercayainya.
     */
    private function geserSisanya(Tugas $tugas): void
    {
        $lain = Tugas::query()
            ->where('department_id', $tugas->department_id)
            ->where('status', $tugas->status)
            ->whereKeyNot($tugas->getKey())
            ->orderBy('urutan')
            ->orderByDesc('id')
            ->get();

        $posisi = 0;

        foreach ($lain as $satu) {
            if ($posisi === $tugas->urutan) {
                $posisi++;
            }

            if ($satu->urutan !== $posisi) {
                $satu->forceFill(['urutan' => $posisi])->save();
            }

            $posisi++;
        }
    }

    /**
     * Menautkan tugas ke laporan yang menjadi buktinya.
     *
     * Hanya laporan yang benar-benar terlihat oleh penautnya yang diterima.
     * Tanpa itu, siapa pun dapat menautkan kartunya ke laporan departemen lain
     * dan membaca tanggalnya lewat balasan API.
     */
    private function sinkronkanLaporan(Tugas $tugas, TugasRequest $request): void
    {
        if (! $request->has('laporan_id')) {
            return;
        }

        $terjangkau = DailyReport::query()
            ->visibleTo($request->user())
            ->whereIn('id', $request->input('laporan_id', []))
            ->pluck('id');

        $tugas->laporan()->sync($terjangkau);
    }
}
