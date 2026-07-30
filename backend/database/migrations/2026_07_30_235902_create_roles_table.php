<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Role pengguna (PRD §4): Administrator, Manager, Supervisor, Staff.
 *
 * `level` menyatakan luas jangkauan data, dipakai perbandingan numerik pada
 * Policy: makin besar makin luas (Staff 10 .. Administrator 40).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 32)->unique();
            $table->string('name', 64);
            $table->unsignedTinyInteger('level');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
