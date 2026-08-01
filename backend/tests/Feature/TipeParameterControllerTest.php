<?php

use Symfony\Component\Finder\Finder;

/**
 * Menjaring parameter controller yang tipenya tidak dapat diselesaikan.
 *
 * Bila sebuah `use` tertinggal, PHP tidak mengeluh saat berkasnya dimuat — ia
 * menyelesaikan `PenetapanRoleRequest` menjadi
 * `App\Http\Controllers\PenetapanRoleRequest`, kelas yang tidak pernah ada.
 * Kegagalannya baru muncul ketika rutenya dipanggil, sebagai 500 di layar
 * pengguna.
 *
 * Itu benar-benar terjadi: endpoint penetapan peran gagal total sementara
 * seluruh rangkaian test tetap hijau, karena tidak ada satu pun test yang
 * memanggilnya.
 */
/**
 * Nama kelas seluruh controller.
 *
 * Diturunkan dari jalur relatif milik Finder, bukan dari potongan jalur
 * absolut: di Windows `app_path()` mengembalikan pemisah bercampur, sehingga
 * pemotongan awalannya gagal diam-diam dan seluruh controller terlewat —
 * penjaga yang tidak menjaga apa pun.
 *
 * @return list<class-string>
 */
function kelasController(): array
{
    $kelas = [];

    foreach (Finder::create()->files()->in(app_path('Http/Controllers'))->name('*.php') as $satu) {
        $relatif = str_replace(['/', '\\'], '\\', $satu->getRelativePathname());

        $kelas[] = 'App\\Http\\Controllers\\'.substr($relatif, 0, -strlen('.php'));
    }

    return $kelas;
}

it('menyelesaikan seluruh tipe parameter pada method controller', function (): void {
    $daftar = kelasController();

    // Kalau daftarnya kosong, penjaganya sendiri yang rusak.
    expect($daftar)->not->toBeEmpty();

    $bermasalah = [];

    foreach ($daftar as $kelas) {
        if (! class_exists($kelas)) {
            continue;
        }

        $refleksi = new ReflectionClass($kelas);

        foreach ($refleksi->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            if ($method->getDeclaringClass()->getName() !== $kelas) {
                continue;
            }

            foreach ($method->getParameters() as $parameter) {
                $tipe = $parameter->getType();

                if (! $tipe instanceof ReflectionNamedType || $tipe->isBuiltin()) {
                    continue;
                }

                if (! class_exists($tipe->getName()) && ! interface_exists($tipe->getName())) {
                    $bermasalah[] = sprintf(
                        '%s::%s(%s $%s)',
                        class_basename($kelas),
                        $method->getName(),
                        $tipe->getName(),
                        $parameter->getName(),
                    );
                }
            }
        }
    }

    expect($bermasalah)->toBe([]);
});
