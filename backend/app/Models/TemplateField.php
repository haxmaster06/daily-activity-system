<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'key', 'label', 'group_label', 'type', 'is_required', 'sort_order',
    'unit', 'placeholder', 'help_text', 'options', 'lookup_source',
    'computed_from', 'min_value', 'max_value', 'desimal',
    'master_type_id', 'master_induk_key', 'beku', 'tampilan',
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

    /** Pilihan diambil dari daftar master, bukan diketik di template. */
    public const TIPE_MASTER = 'master';

    /** Jam, disimpan sebagai `HH:MM`. */
    public const TIPE_TIME = 'time';

    /**
     * Pilihan majemuk, disimpan sebagai daftar nilai.
     *
     * Satu-satunya tipe yang nilainya berupa larik biasa, bukan skalar maupun
     * objek — diperiksa `TipeIsianLengkapTest`.
     */
    public const TIPE_MULTISELECT = 'multiselect';

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
        self::TIPE_TIME => 'Jam',
        self::TIPE_SELECT => 'Pilihan',
        self::TIPE_MULTISELECT => 'Pilihan majemuk',
        self::TIPE_MASTER => 'Pilihan dari daftar master',
        self::TIPE_BOOLEAN => 'Ya / Tidak',
    ];

    /**
     * Tampilan yang sah untuk tiap tipe, beserta labelnya.
     *
     * Entri pertama tiap tipe adalah bawaannya. Tipe yang tidak disebut di sini
     * hanya punya satu tampilan.
     *
     * @var array<string, array<string, string>>
     */
    public const TAMPILAN = [
        self::TIPE_SELECT => [
            'dropdown' => 'Dropdown',
            'tombol' => 'Tombol berjajar',
            'radio' => 'Radio',
        ],
        self::TIPE_BOOLEAN => [
            'centang' => 'Kotak centang',
            'sakelar' => 'Sakelar',
        ],
        self::TIPE_INTEGER => [
            'biasa' => 'Angka biasa',
            'stepper' => 'Dengan tombol naik-turun',
        ],
        self::TIPE_DECIMAL => [
            'biasa' => 'Angka biasa',
            'persen' => 'Persen',
            'uang' => 'Rupiah',
        ],
        self::TIPE_TEXT => [
            'biasa' => 'Teks biasa',
            'kode' => 'Kode (huruf seragam)',
        ],
    ];

    /**
     * Sumber master data lama.
     *
     * @deprecated Digantikan `master_type_id` yang menunjuk `master_types`.
     *             Kolom `lookup_source` masih ada demi rollback dan akan
     *             di-drop pada rilis berikutnya (ADR-008, dua tahap).
     */
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
            'beku' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<ReportTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'report_template_id');
    }

    /**
     * Daftar master yang menjadi sumber pilihannya.
     *
     * @return BelongsTo<MasterType, $this>
     */
    public function jenisMaster(): BelongsTo
    {
        return $this->belongsTo(MasterType::class, 'master_type_id');
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

    /** Tampilan yang berlaku, atau bawaan tipenya bila belum diatur. */
    public function tampilanBerlaku(): ?string
    {
        $pilihan = self::TAMPILAN[$this->type] ?? [];

        if ($pilihan === []) {
            return null;
        }

        return isset($pilihan[$this->tampilan]) ? $this->tampilan : array_key_first($pilihan);
    }

    /** Pilihannya diambil dari daftar master. */
    public function bertipeMaster(): bool
    {
        return $this->type === self::TIPE_MASTER;
    }
}
