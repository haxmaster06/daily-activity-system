import { cn } from '@/lib/cn';

/**
 * Menampilkan isi yang diketik lewat editor teks kaya.
 *
 * ## Dua keadaan yang harus dibedakan
 *
 * Isi yang tersimpan sebelum editor dipakai berupa **teks polos**. Merender-nya
 * sebagai HTML akan menghilangkan baris barunya, dan tanda `<` yang kebetulan
 * diketik pengguna — "suhu < 10 derajat" — akan ditelan sebagai tag. Karena itu
 * isi yang tidak memuat satu pun tag dikenali dan ditampilkan sebagai teks apa
 * adanya, dengan baris baru dipertahankan.
 *
 * ## Mengapa masih diperiksa di sini
 *
 * Backend sudah membersihkan isian pada saat disimpan (`App\Support\HtmlAman`),
 * sehingga yang ada di basis data semestinya sudah aman. "Semestinya" itulah
 * alasan pemeriksaan ini ada: data bisa masuk lewat jalur yang belum terpikir —
 * import, seeder, perbaikan manual lewat SQL — dan yang menanggung akibatnya
 * adalah peramban orang lain yang membuka laporan itu.
 *
 * Pemeriksaannya menolak, bukan memperbaiki. Isi yang memuat apa pun di luar
 * daftar izin ditampilkan sebagai teks biasa — tagnya terlihat sebagai tulisan,
 * jelek tetapi jujur, dan tidak ada yang dieksekusi. Membersihkan diam-diam di
 * sisi tampilan justru menyembunyikan bahwa ada data kotor yang masuk.
 *
 * ## Mengapa bukan DOMPurify
 *
 * Pembersihan yang sesungguhnya memang memakai pengurai sungguhan — tetapi di
 * backend, lewat DOMDocument. Di sini yang dibutuhkan bukan pembersih melainkan
 * **gerbang**: ia hanya menjawab boleh atau tidak, dan menjawab "tidak" selalu
 * aman karena akibatnya isi ditampilkan sebagai teks.
 *
 * Gerbang berupa pemeriksaan string juga berjalan sama persis di server dan di
 * peramban. DOMPurify menuntut DOM, sehingga pada komponen server ia menyeret
 * jsdom — dependensi berat demi lapisan ketiga, sementara lapisan pertama
 * (backend) sudah memakai pengurai betulan dan lapisan kedua ini menolak apa
 * pun yang meragukan.
 */

const TAG_DIIZINKAN = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'];

/** Menangkap tiap tag beserta bagian atributnya. */
const POLA_TAG = /<\s*\/?\s*([a-z][a-z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;

/** Isi memuat setidaknya satu tag pemformatan yang dikenal. */
export function berupaHtml(isi: string): boolean {
    return new RegExp(`<(${TAG_DIIZINKAN.join('|')})\\b[^>]*>`, 'i').test(isi);
}

/**
 * Benar hanya bila seluruh tag ada di daftar izin DAN tidak satu pun membawa
 * atribut. Tanpa atribut, `onerror`, `onclick`, dan `href="javascript:"` tidak
 * punya tempat untuk ditulis.
 */
export function hanyaTagAman(html: string): boolean {
    POLA_TAG.lastIndex = 0;

    let cocok: RegExpExecArray | null;

    while ((cocok = POLA_TAG.exec(html)) !== null) {
        const nama = cocok[1].toLowerCase();
        const atribut = (cocok[2] ?? '').replace(/\/\s*$/, '').trim();

        // Atribut ditolak seluruhnya, bukan disaring. Yang tidak boleh ada
        // tidak perlu dinilai satu per satu amannya.
        if (!TAG_DIIZINKAN.includes(nama) || atribut !== '') {
            return false;
        }
    }

    /*
     * Sesudah seluruh tag yang dikenali dibuang, tidak boleh tersisa satu pun
     * `<`. Yang tersisa berarti tanda kurung yang tidak membentuk tag utuh —
     * markup terpotong, atau muatan yang sengaja dicacatkan supaya luput dari
     * pemeriksaan tetapi tetap dirapikan peramban saat dirender.
     *
     * Isi yang sah tidak pernah sampai ke sini membawa `<` telanjang: editor
     * menuliskannya sebagai `&lt;`.
     */
    return !html.replace(POLA_TAG, '').includes('<');
}

export function TampilKaya({
    isi,
    className,
    kosong = '—',
}: {
    isi: string | null | undefined;
    className?: string;
    /** Ditampilkan bila isinya kosong. */
    kosong?: string;
}) {
    const teks = (isi ?? '').trim();

    if (teks === '') {
        return <span className={cn('text-ink-soft', className)}>{kosong}</span>;
    }

    if (berupaHtml(teks) && hanyaTagAman(teks)) {
        return (
            <div
                className={cn('dams-kaya-baca', className)}
                // Aman: seluruh tag sudah diperiksa ada di daftar izin dan tanpa
                // satu pun atribut, di atas pembersihan yang sudah dilakukan
                // backend saat menyimpan.
                dangerouslySetInnerHTML={{ __html: teks }}
            />
        );
    }

    // Teks polos, atau HTML yang tidak lolos pemeriksaan. React meng-escape
    // isinya, jadi tag apa pun tampil sebagai tulisan dan tidak dieksekusi.
    return <span className={cn('block whitespace-pre-line break-words', className)}>{teks}</span>;
}
