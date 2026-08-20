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

        /*
         * `table-layout: fixed` wajib di sini.
         *
         * Tanpa itu dompdf melebarkan tiap kolom mengikuti isinya, tabelnya
         * tumbuh melewati lebar kertas, dan kelebihannya TIDAK dipindah ke
         * halaman berikutnya — sekadar terpotong hilang. Pada template
         * berkolom banyak yang hilang justru kolom-kolom terakhir, tanpa satu
         * pun tanda bahwa ada yang hilang.
         *
         * Dengan `fixed`, kolomnya berbagi lebar kertas dan isinya turun baris.
         */
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        th {
            background: #005BBF;
            color: #FFFFFF;
            font-size: 7.5pt;
            text-align: left;
            padding: 2mm 1.5mm;
            border: 0.2mm solid #D9DDE5;
            word-wrap: break-word;
        }

        td {
            padding: 1.5mm;
            border: 0.2mm solid #D9DDE5;
            vertical-align: top;
            /*
             * Isian teks kaya sampai ke sini sudah dilucuti menjadi teks polos
             * oleh `HtmlAman::keTeks()`, dan strukturnya tinggal berupa baris
             * baru: tiap butir daftar diawali penanda pada barisnya sendiri.
             * Tanpa `pre-line`, HTML meluruhkan baris baru itu dan seluruh
             * butir menempel menjadi satu kalimat panjang.
             */
            white-space: pre-line;
            word-break: break-word;
        }

        /* Baris berselang-seling memudahkan mata mengikuti satu baris pada
           tabel yang lebar. */
        tbody tr:nth-child(even) td { background: #F2F4F7; }

        .kelompok {
            font-size: 8pt;
            font-weight: bold;
            color: #414754;
            margin: 0 0 1.5mm;
        }

        /* Tiap kelompok kolom mulai di halaman baru, kecuali yang pertama. */
        .pisah { page-break-before: always; }

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

    {{--
        Kolom dipecah antar halaman, bukan dipadatkan.

        Template terlebar punya 27 kolom. Dimuat sekaligus, tiap kolom hanya
        kebagian beberapa milimeter: tabelnya memang muat di kertas, tetapi
        tidak ada satu pun yang terbaca — dan tabel yang tidak terbaca sama
        tidak bergunanya dengan tabel yang terpotong.

        Kolom identitas diulang pada tiap kelompok supaya tiap halaman tetap
        dapat dibaca sendiri: tanpa itu, halaman kedua hanya berisi deretan
        angka tanpa keterangan itu milik siapa dan tanggal berapa.
    --}}
    @foreach ($data['kelompok_kolom'] as $index => $kolomHalaman)
        <div @class(['pisah' => $index > 0])>
            @if (count($data['kelompok_kolom']) > 1)
                <p class="kelompok">
                    Kelompok kolom {{ $index + 1 }} dari {{ count($data['kelompok_kolom']) }}
                </p>
            @endif

            <table>
                <thead>
                    <tr>
                        @foreach ($kolomHalaman as $kolom)
                            <th>
                                {{ $kolom['label'] }}@if ($kolom['satuan']) ({{ $kolom['satuan'] }})@endif
                            </th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @forelse ($data['baris'] as $baris)
                        <tr>
                            @foreach ($kolomHalaman as $kolom)
                                <td>{{ $baris[$kolom['kunci']] ?? '' }}</td>
                            @endforeach
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ count($kolomHalaman) }}" style="text-align: center; color: #727785;">
                                Tidak ada data pada rentang ini.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
                @if (! empty($data['total']))
                    <tfoot>
                        <tr>
                            @foreach ($kolomHalaman as $kolom)
                                <td style="font-weight: bold; border-top: 2px solid #C1C6D6;">{{ $data['total'][$kolom['kunci']] ?? '' }}</td>
                            @endforeach
                        </tr>
                    </tfoot>
                @endif
            </table>
        </div>
    @endforeach

    <p class="kaki">
        Dicetak oleh {{ $dicetakOleh }} pada {{ $dicetakPada }} —
        CV Hasil Barokah Mandiri
    </p>
</body>
</html>
