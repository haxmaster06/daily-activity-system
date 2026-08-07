<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;

/**
 * Pembersih HTML untuk isian yang diketik lewat editor teks kaya.
 *
 * ## Mengapa ini ada
 *
 * Sejak kolom keterangan memakai editor teks kaya, yang tersimpan bukan lagi
 * teks polos melainkan HTML buatan pengguna — dan HTML itu dirender kembali di
 * peramban orang lain: supervisor yang meninjau, manajer yang membaca
 * ringkasan. Menyimpan lalu merender HTML tanpa memeriksanya adalah jalur XSS
 * yang paling lurus (non-fungsional §5).
 *
 * ## Cara kerjanya
 *
 * Daftar izin, bukan daftar larangan. Daftar larangan selalu tertinggal satu
 * langkah dari cara baru menulis muatan yang sama; daftar izin membuang apa pun
 * yang tidak dikenali, termasuk yang belum pernah terpikirkan.
 *
 * Yang lolos hanya tujuh tag pemformatan, dan **tidak satu pun atribut**.
 * Tanpa atribut, seluruh vektor yang paling lazim ikut tertutup sekaligus:
 * `onerror=`, `onclick=`, `href="javascript:"`, `style="…"`, dan sepupunya
 * tidak punya tempat untuk ditulis.
 *
 * Penguraiannya diserahkan ke libxml lewat DOMDocument, bukan ke ekspresi
 * reguler. Penyerang menang melawan regex dengan menulis HTML yang cacat —
 * `<scr<script>ipt>`, tag tanpa penutup, atribut tanpa kutip — dan pengurai
 * sungguhan menormalkan semua itu lebih dulu sebelum kita memeriksanya.
 */
final class HtmlAman
{
    /**
     * Tag yang boleh bertahan. Tidak ada yang lain.
     *
     * `<u>` disertakan meski usang di HTML5: editor menyediakan garis bawah,
     * dan tanpa tag ini penekanan yang dibuat pengguna hilang diam-diam saat
     * disimpan.
     */
    private const TAG_DIIZINKAN = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'];

    /** Isi yang dianggap kosong oleh editor, disimpan sebagai null. */
    private const KOSONG = ['', '<p></p>', '<p><br></p>', '<p><br/></p>', '<p><br /></p>'];

    /**
     * Membersihkan HTML menjadi bentuk yang aman disimpan dan dirender.
     *
     * Mengembalikan null bila hasilnya tidak memuat teks sama sekali — supaya
     * kolom yang "diisi" dengan satu paragraf kosong tetap terhitung kosong.
     */
    public static function bersihkan(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        $dokumen = self::urai($html);

        if ($dokumen === null) {
            return null;
        }

        $badan = $dokumen->getElementsByTagName('body')->item(0);

        if ($badan === null) {
            return null;
        }

        self::sapu($badan);

        $hasil = '';

        foreach (iterator_to_array($badan->childNodes) as $anak) {
            $hasil .= $dokumen->saveHTML($anak);
        }

        $hasil = trim($hasil);

        if (in_array($hasil, self::KOSONG, true)) {
            return null;
        }

        // Tag yang bertahan tetapi tidak membungkus teks apa pun bukanlah isi.
        return trim(strip_tags($hasil)) === '' ? null : $hasil;
    }

    /**
     * Mengubah HTML menjadi teks polos yang enak dibaca.
     *
     * Dipakai export Excel dan PDF. Tanpa ini, tag ikut tertulis ke dalam
     * berkas yang dibuka orang lain — persis kebocoran yang paling sering
     * terjadi pada aplikasi yang menyimpan HTML lalu lupa melucutinya di
     * gerbang keluar.
     *
     * Butir daftar diberi penanda supaya strukturnya tidak hilang begitu saja
     * saat dibaca di sel Excel.
     */
    public static function keTeks(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $teks = $html;

        // Batas antar blok menjadi baris baru sebelum tagnya dilucuti, supaya
        // kalimat tidak saling menempel.
        $teks = preg_replace('/<br\s*\/?>/i', "\n", $teks) ?? $teks;
        $teks = preg_replace('/<li[^>]*>/i', "\n• ", $teks) ?? $teks;
        // `</li>` sengaja tidak ikut: pembuka butir berikutnya sudah membawa
        // baris barunya sendiri, dan menambah satu lagi menyisipkan baris
        // kosong di antara tiap butir.
        $teks = preg_replace('/<\/(p|ul|ol)>/i', "\n", $teks) ?? $teks;

        $teks = strip_tags($teks);
        $teks = html_entity_decode($teks, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Rapikan baris kosong beruntun yang lahir dari penggantian di atas.
        $teks = preg_replace('/[ \t]+\n/', "\n", $teks) ?? $teks;
        $teks = preg_replace('/\n{3,}/', "\n\n", $teks) ?? $teks;

        return trim($teks);
    }

    /**
     * Menandai isi yang belum berbentuk HTML.
     *
     * Data yang tersimpan sebelum editor teks kaya dipakai berupa teks polos.
     * Isi seperti itu tidak boleh dirender sebagai HTML — baris barunya akan
     * hilang, dan tanda `<` yang kebetulan diketik pengguna akan berubah makna.
     */
    public static function berupaHtml(?string $isi): bool
    {
        if ($isi === null) {
            return false;
        }

        return (bool) preg_match('/<(p|br|strong|em|u|ul|ol|li)\b[^>]*>/i', $isi);
    }

    private static function urai(string $html): ?DOMDocument
    {
        $dokumen = new DOMDocument;

        $sebelumnya = libxml_use_internal_errors(true);

        /*
         * Dibungkus deklarasi UTF-8: tanpa itu DOMDocument menganggap masukan
         * ISO-8859-1 dan huruf beraksen berubah menjadi karakter lain.
         */
        $berhasil = $dokumen->loadHTML(
            '<?xml encoding="UTF-8"?><body>'.$html.'</body>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING,
        );

        libxml_clear_errors();
        libxml_use_internal_errors($sebelumnya);

        return $berhasil ? $dokumen : null;
    }

    /**
     * Menelusuri pohon dan membuang apa pun yang tidak ada di daftar izin.
     *
     * Anak-anaknya disalin lebih dulu ke array: membuang simpul saat menelusuri
     * `childNodes` yang hidup membuat penelusuran melewati simpul berikutnya,
     * dan simpul yang terlewat adalah simpul yang tidak pernah diperiksa.
     */
    private static function sapu(DOMNode $induk): void
    {
        foreach (iterator_to_array($induk->childNodes) as $simpul) {
            if ($simpul instanceof DOMText) {
                continue;
            }

            if (! $simpul instanceof DOMElement) {
                // Komentar, instruksi pemrosesan, CDATA — tidak ada yang punya
                // alasan berada di dalam isian laporan.
                $induk->removeChild($simpul);

                continue;
            }

            $nama = strtolower($simpul->nodeName);

            if (! in_array($nama, self::TAG_DIIZINKAN, true)) {
                /*
                 * Tagnya dibuang, teks di dalamnya dipertahankan — kecuali
                 * pada elemen yang isinya memang bukan teks untuk dibaca.
                 * `<script>alert(1)</script>` yang tagnya saja dibuang akan
                 * menyisakan `alert(1)` sebagai kalimat di tengah laporan.
                 */
                if (in_array($nama, ['script', 'style', 'iframe', 'object', 'embed', 'template'], true)) {
                    $induk->removeChild($simpul);

                    continue;
                }

                self::sapu($simpul);
                self::gantiDenganIsinya($induk, $simpul);

                continue;
            }

            // Tanpa terkecuali: seluruh atribut dibuang, termasuk yang tampak
            // tidak berbahaya. Yang tidak ada tidak perlu dinilai amannya.
            foreach (iterator_to_array($simpul->attributes ?? []) as $atribut) {
                $simpul->removeAttribute($atribut->nodeName);
            }

            self::sapu($simpul);
        }
    }

    private static function gantiDenganIsinya(DOMNode $induk, DOMElement $simpul): void
    {
        while ($simpul->firstChild !== null) {
            $induk->insertBefore($simpul->firstChild, $simpul);
        }

        $induk->removeChild($simpul);
    }
}
