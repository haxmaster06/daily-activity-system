<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Nama database yang boleh dipakai test.
     *
     * `RefreshDatabase` menjatuhkan seluruh tabel pada koneksi aktif. Bila
     * konfigurasi test salah menunjuk ke database kerja, data laporan hilang
     * tanpa peringatan. Penjaga ini menghentikan seluruh test suite sebelum
     * satu query pun dijalankan.
     *
     * Lihat docs/adr/ADR-008-larangan-fresh-migrate.md
     */
    private const DATABASE_TEST_YANG_DIIZINKAN = ['dams_db_testing', ':memory:'];

    protected function setUp(): void
    {
        parent::setUp();

        $database = config('database.connections.'.config('database.default').'.database');

        if (! in_array($database, self::DATABASE_TEST_YANG_DIIZINKAN, true)) {
            throw new RuntimeException(sprintf(
                'Test dihentikan: koneksi database menunjuk ke [%s]. '.
                'Test hanya boleh berjalan pada [%s]. Periksa phpunit.xml. '.
                'Menjalankan test pada database kerja akan menghapus seluruh tabelnya.',
                $database,
                implode('] atau [', self::DATABASE_TEST_YANG_DIIZINKAN),
            ));
        }
    }
}
