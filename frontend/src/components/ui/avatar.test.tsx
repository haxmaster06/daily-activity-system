import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, inisial } from './avatar';

/**
 * Inisial dipakai sebagai pengganti foto, bukan siluet orang generik: siluet
 * yang sama pada seluruh daftar tidak membedakan siapa pun.
 */
describe('inisial nama', () => {
  /*
   * Diambil dari kata pertama dan terakhir, bukan dua kata pertama. Nama depan
   * pada banyak nama Indonesia dipakai bersama-sama, dan dua huruf pertamanya
   * membuat separuh daftar terlihat sama.
   */
  it('memakai kata pertama dan terakhir', () => {
    expect(inisial('Muhammad Rizky Pratama')).toBe('MP');
  });

  it('memakai dua huruf pertama bila namanya satu kata', () => {
    expect(inisial('Sukarno')).toBe('SU');
  });

  it('tidak jatuh pada nama berspasi ganda', () => {
    expect(inisial('  Ahmad   Fauzi  ')).toBe('AF');
  });

  it('tidak jatuh pada nama kosong', () => {
    expect(inisial('   ')).toBe('?');
  });
});

describe('Avatar', () => {
  it('menampilkan inisial saat belum ada foto', () => {
    render(<Avatar nama="Ahmad Fauzi" foto={null} />);

    expect(screen.getByText('AF')).toBeInTheDocument();
  });

  it('menampilkan fotonya saat ada', () => {
    const { container } = render(<Avatar nama="Ahmad Fauzi" foto="/api/foto/7" />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/foto/7');
  });

  /*
   * Nama orangnya selalu tertulis di sebelah avatar. Mengulanginya pada `alt`
   * membuat pembaca layar menyebut nama yang sama dua kali berturut-turut.
   */
  it('tidak mengulang nama pada teks alternatif gambarnya', () => {
    const { container } = render(<Avatar nama="Ahmad Fauzi" foto="/api/foto/7" />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  /*
   * Foto dapat hilang dari penyimpanan, atau sesinya berakhir tepat saat
   * gambarnya diambil. Ikon gambar rusak pada bilah navigasi terlihat seperti
   * aplikasinya yang rusak.
   */
  it('kembali ke inisial saat fotonya gagal dimuat', () => {
    const { container } = render(<Avatar nama="Ahmad Fauzi" foto="/api/foto/7" />);

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(screen.getByText('AF')).toBeInTheDocument();
  });
});
