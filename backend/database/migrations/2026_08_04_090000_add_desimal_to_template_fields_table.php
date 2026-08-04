<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Angka di belakang koma untuk kolom bertipe `decimal`.
 *
 * Sebelumnya tiap kolom desimal menerima berapa pun angka pecahannya, lalu
 * ditampilkan apa adanya. Kadar dengan tiga angka di belakang koma dan berat
 * dengan dua tampil dengan aturan yang sama, dan tidak ada yang menahan angka
 * dari pembagian yang menghasilkan belasan digit.
 *
 * Null berarti bawaan — dua angka di belakang koma. Dibiarkan null, bukan
 * diberi default 2 di basis data, supaya "belum pernah diatur" dapat dibedakan
 * dari "sengaja diatur dua".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->unsignedTinyInteger('desimal')->nullable()->after('max_value');
        });
    }

    public function down(): void
    {
        Schema::table('template_fields', function (Blueprint $table): void {
            $table->dropColumn('desimal');
        });
    }
};
