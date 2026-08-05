'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { OpsiCombobox } from '@/components/ui/combobox';
import type { OpsiSelect } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { formatAngka } from '@/lib/format';
import type { KolomPapan, StatusTugas, Tugas } from '@/lib/tugas';
import { geserTugas, hapusTugas } from './actions';
import { AWALAN_KARTU, IsiKartu, KartuTugas } from './kartu-tugas';
import { TugasDialog } from './tugas-dialog';

const AWALAN_KOLOM = 'kolom:';

interface PapanKanbanProps {
  kolomAwal: KolomPapan[];
  bolehKelola: boolean;
  departemen: OpsiSelect[];
  pengguna: OpsiCombobox[];
  laporan: OpsiCombobox[];
  departemenBawaan: number | null;
}

/** Menemukan kartu di kolom mana pun. */
function cariKartu(kolom: KolomPapan[], idKartu: string): Tugas | null {
  for (const satu of kolom) {
    const kartu = satu.kartu.find((t) => `${AWALAN_KARTU}${t.id}` === idKartu);
    if (kartu) return kartu;
  }

  return null;
}

function statusKartu(kolom: KolomPapan[], idKartu: string): StatusTugas | null {
  return kolom.find((satu) => satu.kartu.some((t) => `${AWALAN_KARTU}${t.id}` === idKartu))
    ?.status ?? null;
}

/**
 * Kolom tujuan sebuah sasaran jatuh.
 *
 * Sasarannya dapat berupa kolomnya sendiri — saat kartu dijatuhkan di ruang
 * kosong — atau kartu lain di dalamnya.
 */
function statusTujuan(kolom: KolomPapan[], idSasaran: string): StatusTugas | null {
  if (idSasaran.startsWith(AWALAN_KOLOM)) {
    return idSasaran.slice(AWALAN_KOLOM.length) as StatusTugas;
  }

  return statusKartu(kolom, idSasaran);
}

/**
 * Susunan papan setelah satu kartu dipindahkan.
 *
 * Mengembalikan juga posisi akhirnya, karena itulah angka yang dikirim ke
 * server. Menghitungnya ulang di pemanggil berarti aturan yang sama ditulis
 * dua kali, dan dua tulisan itu pasti berbeda pada suatu saat.
 */
function susunUlang(
  kolom: KolomPapan[],
  idKartu: string,
  tujuan: StatusTugas,
  idSasaran: string,
): { kolom: KolomPapan[]; urutan: number } | null {
  const kartu = cariKartu(kolom, idKartu);
  if (kartu === null) return null;

  const tanpaKartu = kolom.map((satu) => ({
    ...satu,
    kartu: satu.kartu.filter((t) => `${AWALAN_KARTU}${t.id}` !== idKartu),
  }));

  const target = tanpaKartu.find((satu) => satu.status === tujuan);
  if (target === undefined) return null;

  let urutan = target.kartu.length;

  if (idSasaran.startsWith(AWALAN_KARTU)) {
    const posisi = target.kartu.findIndex((t) => `${AWALAN_KARTU}${t.id}` === idSasaran);
    if (posisi >= 0) urutan = posisi;
  }

  target.kartu = [
    ...target.kartu.slice(0, urutan),
    { ...kartu, status: tujuan },
    ...target.kartu.slice(urutan),
  ];

  return { kolom: tanpaKartu, urutan };
}

/**
 * Papan progres harian.
 *
 * Tarik-lepas memakai `@dnd-kit`, bukan `useDragAndDrop` milik React Aria yang
 * sudah terpasang. Alasannya satu dan menentukan: React Aria mengumumkan
 * seluruh petunjuk papan ketik lewat wilayah `aria-live` miliknya sendiri, dan
 * kamusnya **tidak memuat Bahasa Indonesia** — 34 locale, tanpa `id-ID`.
 * Pengguna pembaca layar akan mendengar "Press Enter to start dragging",
 * padahal seluruh teks DAMS wajib Bahasa Indonesia (CLAUDE.md). React Aria
 * tidak menyediakan jalan publik untuk mengganti kamus internalnya. `@dnd-kit`
 * menyerahkan seluruh kalimatnya kepada kita lewat `announcements` dan
 * `screenReaderInstructions` di bawah. Dicatat di
 * `docs/standar-library-ui.md` §9.
 */
export function PapanKanban({
  kolomAwal,
  bolehKelola,
  departemen,
  pengguna,
  laporan,
  departemenBawaan,
}: PapanKanbanProps) {
  const router = useRouter();

  const [kolom, setKolom] = useState<KolomPapan[]>(kolomAwal);
  const [diseret, setDiseret] = useState<Tugas | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Tugas | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<Tugas | null>(null);

  // Papan dimuat ulang dari server setelah kartu ditambah, diubah, atau
  // dihapus. Menggeser sengaja tidak memuat ulang — lihat `geserTugas`.
  useEffect(() => setKolom(kolomAwal), [kolomAwal]);

  /*
   * Pengumuman pembaca layar dibaca saat kejadian berlangsung, sedangkan
   * `kolom` di dalam closure-nya membeku pada render tempat ia dibuat. Ref ini
   * menjaga pengumumannya menyebut kolom yang benar-benar sedang tampil.
   */
  const kolomTerkini = useRef(kolom);
  kolomTerkini.current = kolom;

  const sensors = useSensors(
    /*
     * Jarak 6px sebelum seretan dimulai. Tanpa itu, menekan menu di kartu
     * terbaca sebagai awal seretan dan menunya tidak pernah terbuka.
     */
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const judulKartu = useCallback(
    (id: string) => cariKartu(kolomTerkini.current, id)?.judul ?? 'kartu',
    [],
  );

  const namaSasaran = useCallback((id: string) => {
    const status = statusTujuan(kolomTerkini.current, id);

    return kolomTerkini.current.find((satu) => satu.status === status)?.label ?? 'papan';
  }, []);

  const instruksi: ScreenReaderInstructions = useMemo(
    () => ({
      draggable:
        'Tekan spasi untuk mulai memindahkan kartu. Selagi dipindahkan, pakai tombol panah ' +
        'untuk memilih kolom dan posisinya. Tekan spasi lagi untuk menjatuhkan, atau Escape ' +
        'untuk membatalkan. Kartu juga dapat dipindahkan lewat menu Kelola kartu tanpa ' +
        'menyeretnya sama sekali.',
    }),
    [],
  );

  const pengumuman: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) => `Mengangkat kartu ${judulKartu(String(active.id))}.`,
      onDragOver: ({ active, over }) =>
        over
          ? `Kartu ${judulKartu(String(active.id))} berada di kolom ${namaSasaran(String(over.id))}.`
          : `Kartu ${judulKartu(String(active.id))} berada di luar papan.`,
      onDragEnd: ({ active, over }) =>
        over
          ? `Kartu ${judulKartu(String(active.id))} dipindahkan ke kolom ${namaSasaran(String(over.id))}.`
          : `Kartu ${judulKartu(String(active.id))} dikembalikan ke tempat semula.`,
      onDragCancel: ({ active }) =>
        `Perpindahan kartu ${judulKartu(String(active.id))} dibatalkan.`,
    }),
    [judulKartu, namaSasaran],
  );

  /**
   * Menyimpan perpindahan, dan mengembalikan kartu bila server menolak.
   *
   * Kartu yang tetap berada di kolom barunya padahal servernya menolak adalah
   * kebohongan yang paling mahal di papan ini: pengisinya mengira pekerjaan
   * itu sudah tercatat selesai.
   */
  async function simpanGeseran(
    semula: KolomPapan[],
    kartu: Tugas,
    tujuan: StatusTugas,
    urutan: number,
  ) {
    setGalat(null);

    const hasil = await geserTugas(kartu.id, tujuan, urutan);

    if (!hasil.berhasil) {
      setKolom(semula);
      setGalat(hasil.pesan);
    }
  }

  function saatMulai(event: DragStartEvent) {
    setDiseret(cariKartu(kolom, String(event.active.id)));
  }

  function saatSelesai(event: DragEndEvent) {
    setDiseret(null);

    const { active, over } = event;
    if (over === null) return;

    const idKartu = String(active.id);
    const idSasaran = String(over.id);
    const tujuan = statusTujuan(kolom, idSasaran);
    if (tujuan === null) return;

    const hasil = susunUlang(kolom, idKartu, tujuan, idSasaran);
    if (hasil === null) return;

    const kartu = cariKartu(kolom, idKartu);
    if (kartu === null) return;

    // Dijatuhkan tepat di tempatnya semula: tidak ada yang perlu disimpan.
    if (kartu.status === tujuan && kartu.urutan === hasil.urutan) return;

    const semula = kolom;
    setKolom(hasil.kolom);
    void simpanGeseran(semula, kartu, tujuan, hasil.urutan);
  }

  /** Perpindahan lewat menu kartu — jalur tanpa seret. */
  function pindahLewatMenu(kartu: Tugas, tujuan: StatusTugas) {
    const hasil = susunUlang(
      kolom,
      `${AWALAN_KARTU}${kartu.id}`,
      tujuan,
      `${AWALAN_KOLOM}${tujuan}`,
    );
    if (hasil === null) return;

    const semula = kolom;
    setKolom(hasil.kolom);
    void simpanGeseran(semula, kartu, tujuan, hasil.urutan);
  }

  async function jalankanHapus() {
    if (konfirmasiHapus === null) return;

    const hasil = await hapusTugas(konfirmasiHapus.id);
    setKonfirmasiHapus(null);

    if (hasil.berhasil) {
      router.refresh();
    } else {
      setGalat(hasil.pesan);
    }
  }

  return (
    <>
      {bolehKelola && (
        <div className="mb-3 flex justify-end">
          <Button
            ukuran="sm"
            onClick={() => {
              setSedangDiubah(null);
              setDialogTerbuka(true);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            Tambah Tugas
          </Button>
        </div>
      )}

      {galat && <Alert jenis="galat" pesan={galat} className="mb-3" />}

      <DndContext
        /*
         * Id wajib diisi sendiri, tidak boleh diserahkan ke `@dnd-kit`.
         *
         * Tanpa ini, `useUniqueId` memakai penghitung tingkat modul untuk
         * menyusun `aria-describedby` tiap pegangan seret. Penghitung itu mulai
         * dari nol pada render server dan meneruskan hitungan yang sudah ada di
         * peramban, sehingga React melaporkan ketidakcocokan hidrasi pada tiap
         * pemuatan halaman — persis cacat yang sama bentuknya dengan `<tr>`
         * bersarang yang pernah ditemukan di tabel master data.
         */
        id="papan-progres"
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements: pengumuman, screenReaderInstructions: instruksi }}
        onDragStart={saatMulai}
        onDragEnd={saatSelesai}
        onDragCancel={() => setDiseret(null)}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {kolom.map((satu) => (
            <Kolom
              key={satu.status}
              kolom={satu}
              kolomLain={kolom
                .filter((lain) => lain.status !== satu.status)
                .map((lain) => ({ status: lain.status, label: lain.label }))}
              bolehKelola={bolehKelola}
              onPindah={pindahLewatMenu}
              onUbah={(kartu) => {
                setSedangDiubah(kartu);
                setDialogTerbuka(true);
              }}
              onHapus={setKonfirmasiHapus}
            />
          ))}
        </div>

        {/*
          Bayangan kartu mengikuti kursor. Tanpa ini, yang bergerak adalah kartu
          aslinya di dalam kolom, dan ia terpotong begitu melewati tepi kolom.
        */}
        <DragOverlay>
          {diseret && <IsiKartu tugas={diseret} className="rotate-1 shadow-modal" />}
        </DragOverlay>
      </DndContext>

      {bolehKelola && (
        <TugasDialog
          terbuka={dialogTerbuka}
          onTutup={() => setDialogTerbuka(false)}
          tugas={sedangDiubah}
          departemen={departemen}
          pengguna={pengguna}
          laporan={laporan}
          departemenBawaan={departemenBawaan}
          onSelesai={() => {
            setDialogTerbuka(false);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        terbuka={konfirmasiHapus !== null}
        onTutup={() => setKonfirmasiHapus(null)}
        onSetuju={jalankanHapus}
        judul="Hapus Tugas"
        pesan={
          konfirmasiHapus
            ? `Tugas "${konfirmasiHapus.judul}" akan hilang dari papan. Laporan yang tertaut kepadanya tetap tersimpan.`
            : ''
        }
        labelAksi="Hapus"
        berisiko
      />
    </>
  );
}

function Kolom({
  kolom,
  kolomLain,
  bolehKelola,
  onPindah,
  onUbah,
  onHapus,
}: {
  kolom: KolomPapan;
  kolomLain: { status: StatusTugas; label: string }[];
  bolehKelola: boolean;
  onPindah: (kartu: Tugas, tujuan: StatusTugas) => void;
  onUbah: (kartu: Tugas) => void;
  onHapus: (kartu: Tugas) => void;
}) {
  /*
   * Kolomnya sendiri menjadi sasaran jatuh, bukan hanya kartu di dalamnya.
   * Tanpa ini, kolom kosong tidak dapat menerima kartu sama sekali — dan
   * "Selesai" memang kosong di pagi hari.
   */
  const { setNodeRef, isOver } = useDroppable({ id: `${AWALAN_KOLOM}${kolom.status}` });

  const idKartu = kolom.kartu.map((satu) => `${AWALAN_KARTU}${satu.id}`);

  return (
    <section
      aria-label={`${kolom.label}, ${formatAngka(kolom.kartu.length)} kartu`}
      className="flex min-w-0 flex-col rounded-card border border-line bg-surface-muted/50"
    >
      <h2 className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-body-lg font-medium text-ink">{kolom.label}</span>
        <span className="rounded-control bg-surface px-1.5 py-0.5 text-caption text-ink-muted">
          {formatAngka(kolom.kartu.length)}
        </span>
      </h2>

      <SortableContext items={idKartu} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn(
            // Tinggi minimum menjaga kolom kosong tetap dapat dijatuhi.
            'flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors duration-fast',
            isOver && 'bg-primary-subtle/60',
          )}
        >
          {kolom.kartu.map((kartu) => (
            <KartuTugas
              key={kartu.id}
              tugas={kartu}
              kolomLain={kolomLain}
              bolehKelola={bolehKelola}
              onPindah={(tujuan) => onPindah(kartu, tujuan)}
              onUbah={() => onUbah(kartu)}
              onHapus={() => onHapus(kartu)}
            />
          ))}

          {kolom.kartu.length === 0 && (
            <p className="px-1 py-3 text-center text-body text-ink-soft">
              Belum ada tugas di kolom ini.
            </p>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
