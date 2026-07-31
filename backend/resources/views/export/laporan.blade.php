{{--
    Tata letak PDF export laporan harian.

    Dompdf hanya mengenal sebagian kecil CSS, sehingga gayanya ditulis
    sederhana dan langsung — bukan memakai kelas dari Tailwind, yang tidak
    tersedia di sini. Warnanya tetap mengikuti token DAMS.
--}}
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $data['template']['nama'] }}</title>
    <style>
        @page { margin: 14mm 10mm; }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 8pt;
            color: #191C1E;
        }

        .judul { font-size: 14pt; font-weight: bold; margin: 0 0 2mm; }
        .periode { font-size: 9pt; color: #414754; margin: 0 0 1mm; }
        .keterangan { font-size: 8pt; color: #727785; margin: 0 0 4mm; }

        table { width: 100%; border-collapse: collapse; }

        th {
            background: #005BBF;
            color: #FFFFFF;
            font-size: 7.5pt;
            text-align: left;
            padding: 2mm 1.5mm;
            border: 0.2mm solid #D9DDE5;
        }

        td {
            padding: 1.5mm;
            border: 0.2mm solid #D9DDE5;
            vertical-align: top;
        }

        /* Baris berselang-seling memudahkan mata mengikuti satu baris pada
           tabel yang lebar. */
        tbody tr:nth-child(even) td { background: #F2F4F7; }

        .kaki {
            margin-top: 4mm;
            font-size: 7.5pt;
            color: #727785;
        }

        .peringatan {
            margin-top: 3mm;
            padding: 2mm;
            border: 0.2mm solid #FF8F00;
            background: #FFF3E0;
            color: #8E4D00;
            font-size: 8pt;
        }
    </style>
</head>
<body>
    <p class="judul">Laporan Harian — {{ $data['template']['nama'] }}</p>
    <p class="periode">Periode {{ $data['rentang']['label'] }}</p>
    <p class="keterangan">
        {{ number_format($data['jumlah_laporan'], 0, ',', '.') }} laporan,
        {{ number_format($data['jumlah_baris'], 0, ',', '.') }} baris aktivitas
    </p>

    @if ($data['terpotong'])
        <p class="peringatan">
            Data melebihi batas {{ number_format(\App\Support\DataExport::BATAS_BARIS, 0, ',', '.') }}
            baris per berkas. Yang tercetak adalah bagian awalnya saja — persempit
            rentang tanggal untuk memperoleh seluruhnya.
        </p>
    @endif

    <table>
        <thead>
            <tr>
                @foreach ($data['kolom'] as $kolom)
                    <th>
                        {{ $kolom['label'] }}@if ($kolom['satuan']) ({{ $kolom['satuan'] }})@endif
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($data['baris'] as $baris)
                <tr>
                    @foreach ($data['kolom'] as $kolom)
                        <td>{{ $baris[$kolom['kunci']] ?? '' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($data['kolom']) }}" style="text-align: center; color: #727785;">
                        Tidak ada data pada rentang ini.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <p class="kaki">
        Dicetak oleh {{ $dicetakOleh }} pada {{ $dicetakPada }} —
        CV Hasil Barokah Mandiri
    </p>
</body>
</html>
