'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, type ThreeElement, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
  type RigidBodyProps,
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

export interface Lanyard3DProps {
  nama: string;
  keterangan: string;
  /** URL foto pengguna. Kosong berarti kartu memakai tanda DAMS. */
  fotoUrl?: string;
}

/**
 * Kartu identitas menggantung (React Bits — Lanyard).
 *
 * Struktur fisikanya mengikuti implementasi resmi React Bits: empat rigid body
 * dirangkai rope joint, kartunya digantung dengan spherical joint, dan talinya
 * digambar sebagai meshline yang mengikuti kurva antar sendi.
 *
 * Dua penyimpangan dari sumber aslinya, beserta alasannya:
 *
 * 1. Kartunya bukan model `card.glb`, melainkan kotak membulat dengan muka
 *    bertekstur canvas. Isi kartu berubah mengikuti pengguna — nama dan
 *    keterangannya berbeda tiap orang — sehingga model dengan tekstur terpanggang
 *    tidak dapat dipakai apa adanya.
 * 2. Talinya berwarna polos, bukan bertekstur `lanyard.png`, karena berkas
 *    teksturnya tidak ikut tersedia.
 *
 * Berkas ini **wajib dimuat dinamis tanpa SSR** — three.js menyentuh `window`
 * saat modulnya dibaca. Pembungkusnya ada di `lanyard.tsx`.
 */
export function Lanyard3D({ nama, keterangan, fotoUrl }: Lanyard3DProps) {
  const [layarSempit, setLayarSempit] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const saatUbahUkuran = () => setLayarSempit(window.innerWidth < 768);
    window.addEventListener('resize', saatUbahUkuran);

    return () => window.removeEventListener('resize', saatUbahUkuran);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0.2, 10.9], fov: 22 }}
      dpr={[1, layarSempit ? 1.5 : 2]}
      gl={{ alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={Math.PI} />

      {/*
        Wajib. `Physics` memuat WASM rapier secara asinkron dan menangguhkan
        render sampai selesai. Tanpa batas Suspense, penangguhan itu menahan
        seluruh isi Canvas — bukan hanya bagian fisikanya — sehingga kanvas
        tampil kosong tanpa satu pun pesan galat.
      */}
      <Suspense fallback={null}>


      {/* Gravitasi ditahan di 25; nilai 40 pada contoh aslinya membuat kartu
          berayun terlalu keras di dalam kotak sekecil ini. */}
      <Physics gravity={[0, -25, 0]} timeStep={layarSempit ? 1 / 30 : 1 / 60}>
        <Tali
          layarSempit={layarSempit}
          nama={nama}
          keterangan={keterangan}
          fotoUrl={fotoUrl}
        />
      </Physics>

      <Environment blur={0.75}>
        <Lightformer
          intensity={2}
          color="white"
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={10}
          color="white"
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
      </Suspense>
    </Canvas>
  );
}

type BadanTali = RapierRigidBody & { lerped?: THREE.Vector3 };

function Tali({
  layarSempit = false,
  nama,
  keterangan,
  fotoUrl,
}: Lanyard3DProps & { layarSempit?: boolean }) {
  const pita = useRef<
    THREE.Mesh<InstanceType<typeof MeshLineGeometry>, InstanceType<typeof MeshLineMaterial>>
  >(null!);
  const kait = useRef<RapierRigidBody>(null!);
  const j1 = useRef<BadanTali>(null!);
  const j2 = useRef<BadanTali>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const kartu = useRef<RapierRigidBody>(null!);

  const kerja = useMemo(
    () => ({
      vec: new THREE.Vector3(),
      arah: new THREE.Vector3(),
      putar: new THREE.Vector3(),
      dir: new THREE.Vector3(),
    }),
    [],
  );

  /*
   * `colliders: false` wajib untuk seluruh ruas. Tanpa itu rapier membuat
   * collider sendiri dari tiap mesh anak, dan collider itu bertumpuk dengan
   * collider yang sudah dipasang manual.
   */
  const sifatRuas: RigidBodyProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };

  const ambilLerped = (badan: BadanTali): THREE.Vector3 => {
    badan.lerped ??= new THREE.Vector3().copy(badan.translation());

    return badan.lerped;
  };

  const teksturKartu = useTeksturKartu(nama, keterangan, fotoUrl);

  /*
   * Lima titik, bukan empat seperti contoh aslinya. Titik pertama adalah
   * lubang penjepit di kartu; tanpa itu tali berhenti di sendi terbawah dan
   * terlihat menggantung tanpa menyentuh kartunya.
   */
  const [kurva] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  );
  const [diseret, setDiseret] = useState<false | THREE.Vector3>(false);
  const [disentuh, setDisentuh] = useState(false);

  /*
   * Ruas talinya lebih pendek daripada contoh aslinya (1 per ruas). Dengan
   * tali sepanjang itu kartu menggantung jauh di bawah, tidak sejajar dengan
   * keterangan akun di sebelahnya.
   */
  useRopeJoint(kait, j1, [[0, 0, 0], [0, 0, 0], 1.19]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1.19]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1.19]);
  useSphericalJoint(j3, kartu, [
    [0, 0, 0],
    [0, 1.45, 0],
  ]);

  useEffect(() => {
    if (!disentuh) return;

    document.body.style.cursor = diseret ? 'grabbing' : 'grab';

    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [disentuh, diseret]);

  useFrame((state, delta) => {
    if (diseret && typeof diseret !== 'boolean') {
      kerja.vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      kerja.dir.copy(kerja.vec).sub(state.camera.position).normalize();
      kerja.vec.add(kerja.dir.multiplyScalar(state.camera.position.length()));

      // Seluruh rantai dibangunkan; ruas yang sudah tertidur tidak ikut
      // bergerak saat kartunya ditarik.
      for (const bagian of [kartu, j1, j2, j3, kait]) {
        bagian.current?.wakeUp();
      }

      kartu.current?.setNextKinematicTranslation({
        x: kerja.vec.x - diseret.x,
        y: kerja.vec.y - diseret.y,
        z: kerja.vec.z - diseret.z,
      });
    }

    if (!kait.current) return;

    // Titik kendali dihaluskan supaya tali tidak patah-patah saat frame turun.
    for (const sendi of [j1, j2]) {
      const lerped = ambilLerped(sendi.current);
      const jarak = Math.max(0.1, Math.min(1, lerped.distanceTo(sendi.current.translation())));
      lerped.lerp(sendi.current.translation(), delta * (10 + jarak * 40));
    }

    const posisiKartu = kartu.current.translation();
    kurva.points[0].set(posisiKartu.x, posisiKartu.y + 1.46, posisiKartu.z);
    kurva.points[1].copy(j3.current.translation());
    kurva.points[2].copy(ambilLerped(j2.current));
    kurva.points[3].copy(ambilLerped(j1.current));
    kurva.points[4].copy(kait.current.translation());

    pita.current.geometry.setPoints(kurva.getPoints(layarSempit ? 16 : 32));

    // Kartu diredam agar tidak berputar tanpa henti setelah dilepas.
    kerja.arah.copy(kartu.current.angvel());
    kerja.putar.copy(kartu.current.rotation() as unknown as THREE.Vector3);
    kartu.current.setAngvel(
      { x: kerja.arah.x, y: kerja.arah.y - kerja.putar.y * 0.5, z: kerja.arah.z },
      true,
    );
  });

  kurva.curveType = 'chordal';

  return (
    <>
      <group position={[0, 4.6, 0]}>
        <RigidBody ref={kait} {...sifatRuas} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...sifatRuas}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...sifatRuas}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...sifatRuas}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          position={[2, 0, 0]}
          ref={kartu}
          {...sifatRuas}
          type={diseret ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />

          <group
            onPointerOver={() => setDisentuh(true)}
            onPointerOut={() => setDisentuh(false)}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              (event.target as Element).releasePointerCapture(event.pointerId);
              setDiseret(false);
            }}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              (event.target as Element).setPointerCapture(event.pointerId);
              setDiseret(
                new THREE.Vector3()
                  .copy(event.point)
                  .sub(kerja.vec.copy(kartu.current.translation())),
              );
            }}
          >
            {/*
              Pengganti `card.glb`: badan kartu polos, mukanya bidang datar
              bertekstur canvas. UV milik kotak membulat termakan lengkung
              sudutnya, sehingga gambar tidak dapat dipetakan langsung ke sana.
            */}
            <RoundedBox args={[1.6, 2.25, 0.04]} radius={0.06} smoothness={4}>
              <meshPhysicalMaterial
                color="#FFFFFF"
                clearcoat={layarSempit ? 0 : 0.6}
                clearcoatRoughness={0.2}
                roughness={0.75}
                metalness={0}
              />
            </RoundedBox>

            <mesh position={[0, 0, 0.023]}>
              <planeGeometry args={[1.54, 2.19]} />
              <meshBasicMaterial map={teksturKartu ?? undefined} toneMapped={false} />
            </mesh>

            <mesh position={[0, 0, -0.023]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.54, 2.19]} />
              <meshBasicMaterial color="#E8F0FE" toneMapped={false} />
            </mesh>

            {/*
              Pengait: cincin pada kartu ditambah penjepit logam di atasnya.
              Versi sebelumnya hanya cincin kecil berwarna abu tua, tertutup
              tali dan praktis tidak terlihat.
            */}
            <mesh position={[0, 1.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.12, 0.04, 16, 32]} />
              <meshStandardMaterial color="#C0C6D0" metalness={1} roughness={0.25} />
            </mesh>

            <mesh position={[0, 1.3, 0]}>
              <boxGeometry args={[0.26, 0.22, 0.09]} />
              <meshStandardMaterial color="#AEB5C0" metalness={1} roughness={0.3} />
            </mesh>

            <mesh position={[0, 1.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.11, 0.03, 12, 24]} />
              <meshStandardMaterial color="#AEB5C0" metalness={1} roughness={0.3} />
            </mesh>
          </group>
        </RigidBody>
      </group>

      <mesh ref={pita}>
        <meshLineGeometry />
        {/*
          `resolution` diisi dua kali dengan sengaja: konstruktor
          MeshLineMaterial mewajibkannya lewat `args`, sementara nilai yang
          benar-benar dipakai saat menggambar datang dari prop. Dokumentasi
          React Bits menyiasati ini dengan melonggarkan tipe `meshline`; di
          sini kontraknya dipenuhi apa adanya.
        */}
        {/*
          `depthTest` dibiarkan menyala — berbeda dari contoh aslinya.
          Dimatikan, tali digambar menimpa segalanya dan terlihat melintas di
          atas muka kartu; dinyalakan, kartu menghalanginya seperti tali
          sungguhan yang masuk ke balik penjepit.
        */}
        <meshLineMaterial
          args={[{ resolution: new THREE.Vector2(1000, 1000) }]}
          color="#005BBF"
          resolution={layarSempit ? [1000, 2000] : [1000, 1000]}
          lineWidth={0.6}
        />
      </mesh>
    </>
  );
}

/**
 * Menggambar muka kartu ke canvas, lalu memakainya sebagai tekstur.
 *
 * Digambar sendiri, bukan memuat berkas gambar, karena isinya berubah
 * mengikuti pengguna.
 */
function useTeksturKartu(nama: string, keterangan: string, fotoUrl?: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 728;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    /*
     * Tiga blok bertumpuk, sama persis dengan kartu versi diam pada
     * `lanyard.tsx`. Angkanya ditulis sebagai bagian dari tinggi kartu, bukan
     * piksel lepas: kartu yang berbeda susunannya saat animasi dimatikan
     * terbaca sebagai dua kartu yang berlainan.
     */
    const tinggiFoto = canvas.height * 0.7;
    const tinggiIdentitas = canvas.height * 0.2;
    const pusatX = canvas.width / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Blok 1 — foto. Latar birunya terlihat sampai fotonya selesai dimuat.
    ctx.fillStyle = '#E8F0FE';
    ctx.fillRect(0, 0, canvas.width, tinggiFoto);

    ctx.textAlign = 'center';

    if (!fotoUrl) {
      ctx.strokeStyle = '#005BBF';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pusatX - 58, tinggiFoto / 2 + 6);
      ctx.lineTo(pusatX - 14, tinggiFoto / 2 + 52);
      ctx.lineTo(pusatX + 66, tinggiFoto / 2 - 50);
      ctx.stroke();
    }

    // Blok 2 — nama, peran, departemen.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, tinggiFoto, canvas.width, tinggiIdentitas);

    ctx.strokeStyle = '#D9DDE5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, tinggiFoto);
    ctx.lineTo(canvas.width, tinggiFoto);
    ctx.stroke();

    ctx.fillStyle = '#191C1E';
    ctx.font = 'bold 38px "Plus Jakarta Sans", system-ui, sans-serif';
    potongTeks(ctx, nama, pusatX, tinggiFoto + 58, canvas.width - 56);

    ctx.fillStyle = '#414754';
    ctx.font = '26px Inter, system-ui, sans-serif';
    potongTeks(ctx, keterangan, pusatX, tinggiFoto + 102, canvas.width - 56);

    // Blok 3 — nama perusahaan.
    ctx.fillStyle = '#F2F4F7';
    ctx.fillRect(0, tinggiFoto + tinggiIdentitas, canvas.width, canvas.height);

    ctx.fillStyle = '#727785';
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillText('CV HASIL BAROKAH MANDIRI', pusatX, canvas.height - 26);

    // Tanda DAMS menumpang di sudut blok foto, bukan memakan satu blok sendiri.
    ctx.fillStyle = '#005BBF';
    ctx.fillRect(0, 0, 132, 52);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('DAMS', 66, 36);

    const tekstur = new THREE.CanvasTexture(canvas);
    tekstur.colorSpace = THREE.SRGBColorSpace;
    tekstur.anisotropy = 8;

    /*
     * Fotonya digambar **setelah** teksturnya jadi, dan itu tidak dapat
     * dihindari: memuat gambar bersifat asinkron, sedangkan hook ini harus
     * mengembalikan tekstur seketika agar kartunya langsung tampil.
     *
     * `needsUpdate` yang menyambungkan keduanya — tanpa baris itu kanvasnya
     * memang berubah, tetapi GPU tetap memakai salinan lamanya dan blok fotonya
     * kosong selamanya. Persis itu keadaan sebelumnya: tempat fotonya sudah
     * disediakan, gambarnya tidak pernah digambar.
     */
    if (fotoUrl) {
      const gambar = new Image();

      gambar.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, tinggiFoto);
        ctx.clip();

        /*
         * Menutup bloknya, bukan diregangkan: bagian yang berlebih dipotong.
         * Foto yang berubah proporsi membuat wajah orangnya terlihat salah, dan
         * itu justru satu-satunya isi blok ini.
         */
        const skala = Math.max(canvas.width / gambar.width, tinggiFoto / gambar.height);
        const lebar = gambar.width * skala;
        const tinggi = gambar.height * skala;

        ctx.drawImage(
          gambar,
          (canvas.width - lebar) / 2,
          (tinggiFoto - tinggi) / 2,
          lebar,
          tinggi,
        );
        ctx.restore();

        // Tanda DAMS digambar ulang: fotonya baru saja menimpanya.
        ctx.fillStyle = '#005BBF';
        ctx.fillRect(0, 0, 132, 52);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 30px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DAMS', 66, 36);

        tekstur.needsUpdate = true;
      };

      gambar.src = fotoUrl;
    }

    return tekstur;
  }, [nama, keterangan, fotoUrl]);
}

/** Menuliskan teks, dipotong dengan elipsis bila melewati lebar kartu. */
function potongTeks(
  ctx: CanvasRenderingContext2D,
  teks: string,
  x: number,
  y: number,
  lebarMaksimal: number,
): void {
  let hasil = teks;

  while (ctx.measureText(hasil).width > lebarMaksimal && hasil.length > 3) {
    hasil = hasil.slice(0, -1);
  }

  ctx.fillText(hasil === teks ? teks : `${hasil.trimEnd()}…`, x, y);
}
