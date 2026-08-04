<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'key', 'label', 'group_label', 'type', 'is_required', 'sort_order',
    'unit', 'placeholder', 'help_text', 'options', 'lookup_source',
    'computed_from', 'min_value', 'max_value', 'desimal',
])]
class TemplateField extends Model
{
    public const TIPE_TEXT = 'text';

    public const TIPE_TEXTAREA = 'textarea';

    public const TIPE_INTEGER = 'integer';

    public const TIPE_DECIMAL = 'decimal';

    public const TIPE_DATE = 'date';

    public const TIPE_MONTH = 'month';

    public const TIPE_SELECT = 'select';

    public const TIPE_BOOLEAN = 'boolean';

    /**
     * Seluruh tipe kolom yang dikenal, beserta label Bahasa Indonesia untuk
     * ditampilkan pada penyusun template.
     *
     * @var array<string, string>
     */
    public const TIPE = [
        self::TIPE_TEXT => 'Teks singkat',
        self::TIPE_TEXTAREA => 'Teks panjang',
        self::TIPE_INTEGER => 'Angka bulat',
        self::TIPE_DECIMAL => 'Angka desimal',
        self::TIPE_DATE => 'Tanggal',
        self::TIPE_MONTH => 'Bulan',
        self::TIPE_SELECT => 'Pilihan',
        self::TIPE_BOOLEAN => 'Ya / Tidak',
    ];

    /** Sumber master data untuk kolom autocomplete. */
    public const SUMBER_LOOKUP = [
        'supplier' => 'Supplier',
        'customer' => 'Customer',
        'produk' => 'Produk',
        'lot' => 'Nomor LOT',
        'pengguna' => 'Pengguna',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'sort_order' => 'integer',
            'options' => 'array',
            'min_value' => 'decimal:3',
            'max_value' => 'decimal:3',
            'desimal' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ReportTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'report_template_id');
    }

    /** Kolom hitungan terkunci di antarmuka (standar interaksi §1.2). */
    public function dihitungOtomatis(): bool
    {
        return $this->computed_from !== null;
    }

    /** Kolom bertipe angka menerima satuan dan batas nilai. */
    public function bertipeAngka(): bool
    {
        return in_array($this->type, [self::TIPE_INTEGER, self::TIPE_DECIMAL], true);
    }
}
