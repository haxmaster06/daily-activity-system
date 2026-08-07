<?php

use App\Support\HtmlAman;

/*
 * Kelas ini yang berdiri di antara isian pengguna dan peramban orang lain.
 * Testnya karena itu memuat muatan serangan yang sesungguhnya, bukan sekadar
 * contoh yang rapi.
 */

it('mempertahankan tag pemformatan yang diizinkan', function (): void {
    expect(HtmlAman::bersihkan('<p>Suhu <strong>naik</strong> dan <em>stabil</em></p>'))
        ->toBe('<p>Suhu <strong>naik</strong> dan <em>stabil</em></p>');
});

it('mempertahankan daftar berpoin dan bernomor', function (): void {
    expect(HtmlAman::bersihkan('<ul><li>Cek suhu</li><li>Cek tekanan</li></ul>'))
        ->toBe('<ul><li>Cek suhu</li><li>Cek tekanan</li></ul>');
});

it('membuang seluruh atribut, termasuk yang tampak tidak berbahaya', function (): void {
    expect(HtmlAman::bersihkan('<p class="x" style="color:red" data-a="1">Isi</p>'))
        ->toBe('<p>Isi</p>');
});

it('membuang script beserta isinya', function (): void {
    $hasil = HtmlAman::bersihkan('<p>Catatan</p><script>alert(1)</script>');

    expect($hasil)->toBe('<p>Catatan</p>')
        ->and($hasil)->not->toContain('alert');
});

it('menutup penangan kejadian pada tag yang diizinkan', function (): void {
    $hasil = HtmlAman::bersihkan('<p onmouseover="alert(1)">Isi</p>');

    expect($hasil)->toBe('<p>Isi</p>')
        ->and($hasil)->not->toContain('onmouseover');
});

it('membuang img beserta onerror-nya', function (): void {
    $hasil = HtmlAman::bersihkan('<p>a</p><img src=x onerror=alert(1)>');

    expect($hasil)->not->toContain('img')
        ->and($hasil)->not->toContain('onerror');
});

it('membuang tautan javascript', function (): void {
    $hasil = HtmlAman::bersihkan('<p><a href="javascript:alert(1)">klik</a></p>');

    expect($hasil)->not->toContain('javascript')
        ->and($hasil)->not->toContain('<a')
        // Tagnya dibuang, tulisannya tetap: yang berbahaya atributnya.
        ->and($hasil)->toContain('klik');
});

it('tidak tertipu tag yang disisipkan di tengah tag lain', function (): void {
    /*
     * Muatan yang biasanya menang melawan regex, kalah melawan pengurai
     * sungguhan.
     *
     * Yang dituntut di sini adalah tidak adanya markup yang dapat dieksekusi.
     * Sisa potongan kata boleh saja bertahan sebagai teks — teks di dalam
     * paragraf hanya tampil sebagai tulisan, dan tulisan tidak menjalankan
     * apa pun. Menuntut hilangnya string `alert(1)` berarti menguji kerapian,
     * bukan keamanan.
     */
    $hasil = HtmlAman::bersihkan('<p>a<scr<script>ipt>alert(1)</scr</script>ipt></p>');

    expect($hasil)->not->toContain('<script')
        ->and($hasil)->not->toContain('<scr')
        // Tanda kurung sudut yang tersisa sudah menjadi entitas, bukan tag.
        ->and(preg_match('/<(?!\/?(p|br|strong|em|u|ul|ol|li)\b)/i', (string) $hasil))->toBe(0);
});

it('membuang iframe dan svg', function (): void {
    $hasil = HtmlAman::bersihkan('<iframe src="//jahat"></iframe><svg onload=alert(1)></svg><p>ok</p>');

    expect($hasil)->toBe('<p>ok</p>');
});

it('membuang komentar HTML', function (): void {
    expect(HtmlAman::bersihkan('<p>a</p><!-- rahasia -->'))->toBe('<p>a</p>');
});

it('menjaga huruf beraksen tetap utuh', function (): void {
    expect(HtmlAman::bersihkan('<p>Perubahan suhu café naik 3°C</p>'))
        ->toContain('café')
        ->and(HtmlAman::bersihkan('<p>Perubahan suhu café naik 3°C</p>'))
        ->toContain('3°C');
});

it('menganggap isian tanpa teks sebagai kosong', function (): void {
    expect(HtmlAman::bersihkan('<p></p>'))->toBeNull()
        ->and(HtmlAman::bersihkan('<p><br></p>'))->toBeNull()
        ->and(HtmlAman::bersihkan('<ul><li></li></ul>'))->toBeNull()
        ->and(HtmlAman::bersihkan(''))->toBeNull()
        ->and(HtmlAman::bersihkan(null))->toBeNull();
});

/*
 * Gerbang keluar. Tag yang lolos ke sini akan tertulis apa adanya ke dalam
 * berkas Excel dan PDF yang dibuka orang lain.
 */

it('mengubah HTML menjadi teks polos untuk export', function (): void {
    expect(HtmlAman::keTeks('<p>Suhu <strong>naik</strong></p>'))
        ->toBe('Suhu naik');
});

it('memberi penanda pada tiap butir daftar', function (): void {
    expect(HtmlAman::keTeks('<ul><li>Cek suhu</li><li>Cek tekanan</li></ul>'))
        ->toBe("• Cek suhu\n• Cek tekanan");
});

it('mengubah br dan paragraf menjadi baris baru', function (): void {
    expect(HtmlAman::keTeks('<p>Baris satu<br>Baris dua</p><p>Baris tiga</p>'))
        ->toBe("Baris satu\nBaris dua\nBaris tiga");
});

it('tidak menyisakan satu pun tanda kurung sudut', function (): void {
    expect(HtmlAman::keTeks('<p>a</p><ul><li>b</li></ul>'))
        ->not->toContain('<')
        ->and(HtmlAman::keTeks('<p>a</p><ul><li>b</li></ul>'))->not->toContain('>');
});

it('memulihkan entitas menjadi karakter aslinya', function (): void {
    expect(HtmlAman::keTeks('<p>5 &lt; 10 &amp; 20 &gt; 15</p>'))
        ->toBe('5 < 10 & 20 > 15');
});

/*
 * Data lama tersimpan sebagai teks polos. Merender-nya sebagai HTML akan
 * menghilangkan baris barunya.
 */

it('mengenali isi yang sudah berupa HTML', function (): void {
    expect(HtmlAman::berupaHtml('<p>a</p>'))->toBeTrue()
        ->and(HtmlAman::berupaHtml('<ul><li>a</li></ul>'))->toBeTrue();
});

it('mengenali isi lama yang masih teks polos', function (): void {
    expect(HtmlAman::berupaHtml("Baris satu\nBaris dua"))->toBeFalse()
        ->and(HtmlAman::berupaHtml('Suhu 5 < 10 derajat'))->toBeFalse()
        ->and(HtmlAman::berupaHtml(null))->toBeFalse();
});
