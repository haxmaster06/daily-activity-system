import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TampilKaya, berupaHtml, hanyaTagAman } from './tampil-kaya';

/*
 * Gerbang di depan dangerouslySetInnerHTML. Yang dituntut bukan kerapian
 * keluaran, melainkan bahwa tidak ada satu pun muatan berbahaya yang
 * dinyatakan "aman dirender".
 */

describe('hanyaTagAman', () => {
    it('meloloskan tag pemformatan tanpa atribut', () => {
        expect(hanyaTagAman('<p>Suhu <strong>naik</strong></p>')).toBe(true);
        expect(hanyaTagAman('<ul><li>a</li><li>b</li></ul>')).toBe(true);
        expect(hanyaTagAman('<p>satu<br>dua</p>')).toBe(true);
        expect(hanyaTagAman('<p>satu<br />dua</p>')).toBe(true);
    });

    it('menolak tag di luar daftar izin', () => {
        expect(hanyaTagAman('<script>alert(1)</script>')).toBe(false);
        expect(hanyaTagAman('<p>a</p><iframe></iframe>')).toBe(false);
        expect(hanyaTagAman('<svg></svg>')).toBe(false);
        expect(hanyaTagAman('<a href="/x">tautan</a>')).toBe(false);
        expect(hanyaTagAman('<h1>Judul</h1>')).toBe(false);
    });

    it('menolak atribut apa pun, termasuk yang tidak berbahaya', () => {
        expect(hanyaTagAman('<p class="x">a</p>')).toBe(false);
        expect(hanyaTagAman('<p style="color:red">a</p>')).toBe(false);
        expect(hanyaTagAman('<p onmouseover="alert(1)">a</p>')).toBe(false);
        expect(hanyaTagAman('<strong data-x="1">a</strong>')).toBe(false);
    });

    it('menolak atribut yang ditempel tanpa spasi pada nama tag', () => {
        // Peramban memperlakukan `/` sebagai pemisah nama tag dan atribut.
        expect(hanyaTagAman('<p/onmouseover=alert(1)>a</p>')).toBe(false);
    });

    it('menolak markup terpotong yang menyisakan kurung telanjang', () => {
        expect(hanyaTagAman('<p>a</p><scr')).toBe(false);
        expect(hanyaTagAman('<p>a < b</p>')).toBe(false);
    });

    it('meloloskan kurung yang sudah menjadi entitas', () => {
        expect(hanyaTagAman('<p>5 &lt; 10 dan 20 &gt; 15</p>')).toBe(true);
    });
});

describe('berupaHtml', () => {
    it('mengenali isi berformat', () => {
        expect(berupaHtml('<p>a</p>')).toBe(true);
        expect(berupaHtml('<ul><li>a</li></ul>')).toBe(true);
    });

    it('mengenali isi lama yang masih teks polos', () => {
        expect(berupaHtml('Baris satu\nBaris dua')).toBe(false);
        expect(berupaHtml('Suhu 5 < 10 derajat')).toBe(false);
    });
});

describe('TampilKaya', () => {
    it('merender isi berformat sebagai HTML', () => {
        const { container } = render(<TampilKaya isi="<p>Suhu <strong>naik</strong></p>" />);

        expect(container.querySelector('strong')?.textContent).toBe('naik');
    });

    it('merender daftar sebagai daftar sungguhan', () => {
        const { container } = render(<TampilKaya isi="<ul><li>Cek suhu</li><li>Cek tekanan</li></ul>" />);

        expect(container.querySelectorAll('li')).toHaveLength(2);
    });

    it('menampilkan isi lama yang teks polos apa adanya', () => {
        const { container } = render(<TampilKaya isi={'Baris satu\nBaris dua'} />);

        expect(container.querySelector('p')).toBeNull();
        expect(screen.getByText(/Baris satu/)).toBeInTheDocument();
    });

    it('tidak pernah merender muatan berbahaya sebagai HTML', () => {
        const { container } = render(
            <TampilKaya isi='<p>a</p><img src=x onerror="alert(1)">' />,
        );

        expect(container.querySelector('img')).toBeNull();
        // Ditampilkan sebagai tulisan, bukan sebagai markup.
        expect(container.textContent).toContain('<img');
    });

    it('tidak merender script walau dibungkus tag yang diizinkan', () => {
        const { container } = render(
            <TampilKaya isi="<p>a</p><script>alert(1)</script>" />,
        );

        expect(container.querySelector('script')).toBeNull();
    });

    it('menampilkan penanda kosong bila tidak ada isi', () => {
        render(<TampilKaya isi={null} />);

        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
