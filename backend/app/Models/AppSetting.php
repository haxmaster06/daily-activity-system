<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Setelan aplikasi key-value. Bukan konfigurasi environment — ini yang boleh
 * diubah operator saat aplikasi berjalan (mis. Mode Pemeliharaan).
 */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public static function ambil(string $key, mixed $default = null): mixed
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }

    public static function simpan(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
