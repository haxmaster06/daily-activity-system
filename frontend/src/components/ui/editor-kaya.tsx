'use client';

import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';
import { useEffect } from 'react';

import { cn } from '@/lib/cn';

/**
 * Editor teks kaya untuk isian yang isinya bisa panjang.
 *
 * Formatnya sengaja dibatasi lima: tebal, miring, garis bawah, daftar berpoin,
 * dan daftar bernomor. Batas itu bukan kekurangan fitur melainkan keputusan
 * keamanan — tiap tag yang diizinkan adalah satu lagi bentuk yang harus
 * dijamin aman saat dirender kembali di layar orang lain. Daftar izin di
 * `App\Support\HtmlAman` pada backend mencerminkan lima ini persis.
 *
 * Judul, tautan, tabel, dan gambar dimatikan dengan sadar. Menyalakan salah
 * satunya menuntut penjagaan tersendiri: tautan butuh penyaring skema supaya
 * `javascript:` tidak lolos, gambar butuh jalur unggahan.
 */

const TOMBOL =
    'inline-flex size-7 items-center justify-center rounded-input text-ink-muted ' +
    'transition-colors duration-fast hover:bg-surface-muted hover:text-ink ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25';

const TOMBOL_AKTIF = 'bg-primary/10 text-primary-text';

function Tombol({
    editor,
    aktif,
    aksi,
    label,
    children,
}: {
    editor: Editor;
    aktif: boolean;
    aksi: () => void;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            // Tanpa ini, menekan tombol memindahkan fokus keluar dari editor
            // dan seleksi teks yang sedang diformat hilang lebih dulu.
            onMouseDown={(e) => e.preventDefault()}
            onClick={aksi}
            disabled={!editor.isEditable}
            aria-pressed={aktif}
            aria-label={label}
            title={label}
            className={cn(TOMBOL, aktif && TOMBOL_AKTIF)}
        >
            {children}
        </button>
    );
}

export function EditorKaya({
    id,
    nilai,
    onUbah,
    label,
    placeholder,
    galat = false,
    nonaktif = false,
    tinggiMinimal = '4rem',
}: {
    id?: string;
    /** HTML yang sudah dibersihkan server, atau null bila kosong. */
    nilai: string | null;
    /** Menerima HTML, atau null bila isinya kosong. */
    onUbah: (html: string | null) => void;
    label: string;
    placeholder?: string;
    galat?: boolean;
    nonaktif?: boolean;
    tinggiMinimal?: string;
}) {
    const editor = useEditor({
        // Wajib pada App Router: merender editor saat SSR membuat markup server
        // dan klien berbeda, dan React membuang seluruh pohonnya saat hidrasi.
        immediatelyRender: false,
        editable: !nonaktif,
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                code: false,
                codeBlock: false,
                horizontalRule: false,
                strike: false,
                link: false,
            }),
        ],
        content: nilai ?? '',
        editorProps: {
            attributes: {
                class: 'dams-kaya focus:outline-none',
                'aria-label': label,
                ...(placeholder ? { 'data-placeholder': placeholder } : {}),
            },
        },
        onUpdate: ({ editor: ed }) => {
            // `isEmpty` menangkap paragraf kosong yang tetap ditulis Tiptap
            // sebagai `<p></p>` — tanpa ini kolom yang dikosongkan kembali
            // terhitung terisi.
            onUbah(ed.isEmpty ? null : ed.getHTML());
        },
    });

    /*
     * Menyelaraskan isi ketika nilainya berubah dari luar — misalnya draf yang
     * dipulihkan, atau baris tabel yang berpindah. Dilewati saat isinya sudah
     * sama, sebab `setContent` memindahkan kursor ke akhir dan itu terasa
     * seperti gangguan bila terjadi di tengah pengetikan.
     */
    useEffect(() => {
        if (!editor) return;

        const berjalan = editor.getHTML();
        const seharusnya = nilai ?? '';

        if (berjalan !== seharusnya && !(editor.isEmpty && seharusnya === '')) {
            editor.commands.setContent(seharusnya, { emitUpdate: false });
        }
    }, [editor, nilai]);

    useEffect(() => {
        editor?.setEditable(!nonaktif);
    }, [editor, nonaktif]);

    if (!editor) {
        // Tinggi disamakan dengan editor yang sudah siap supaya tata letak
        // tidak melompat sesaat setelah halaman dimuat.
        return (
            <div
                className="w-full rounded-input border border-line bg-surface"
                style={{ minHeight: `calc(${tinggiMinimal} + 2rem)` }}
                aria-hidden
            />
        );
    }

    return (
        <div
            className={cn(
                'w-full overflow-hidden rounded-input border border-line bg-surface',
                'transition-colors duration-fast',
                'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
                galat && 'border-danger',
                nonaktif && 'opacity-60',
            )}
        >
            <div className="flex items-center gap-0.5 border-b border-line px-1 py-0.5">
                <Tombol
                    editor={editor}
                    aktif={editor.isActive('bold')}
                    aksi={() => editor.chain().focus().toggleBold().run()}
                    label="Tebal"
                >
                    <Bold className="size-3.5" />
                </Tombol>
                <Tombol
                    editor={editor}
                    aktif={editor.isActive('italic')}
                    aksi={() => editor.chain().focus().toggleItalic().run()}
                    label="Miring"
                >
                    <Italic className="size-3.5" />
                </Tombol>
                <Tombol
                    editor={editor}
                    aktif={editor.isActive('underline')}
                    aksi={() => editor.chain().focus().toggleUnderline().run()}
                    label="Garis bawah"
                >
                    <Underline className="size-3.5" />
                </Tombol>

                <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />

                <Tombol
                    editor={editor}
                    aktif={editor.isActive('bulletList')}
                    aksi={() => editor.chain().focus().toggleBulletList().run()}
                    label="Daftar berpoin"
                >
                    <List className="size-3.5" />
                </Tombol>
                <Tombol
                    editor={editor}
                    aktif={editor.isActive('orderedList')}
                    aksi={() => editor.chain().focus().toggleOrderedList().run()}
                    label="Daftar bernomor"
                >
                    <ListOrdered className="size-3.5" />
                </Tombol>
            </div>

            <EditorContent
                editor={editor}
                id={id}
                className="px-2 py-1.5 text-body text-ink"
                style={{ minHeight: tinggiMinimal }}
            />
        </div>
    );
}
