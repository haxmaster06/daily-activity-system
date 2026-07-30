'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, type ThreeElement } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
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
 * Kartu identitas menggantung dengan fisika sungguhan (React Bits — Lanyard).
 *
 * Tali disusun dari empat rigid body yang dirangkai rope joint, dan kartunya
 * digantung dengan spherical joint. Kartu dapat diseret; saat dilepas ia
 * berayun sendiri sampai berhenti.
 *
 * Berkas ini **wajib dimuat secara dinamis tanpa SSR** — three.js menyentuh
 * `window` saat modulnya dibaca. Pembungkusnya ada di `lanyard.tsx`.
 */
export function Lanyard3D({ nama, keterangan, fotoUrl }: Lanyard3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 24 }}
      gl={{ alpha: true, antialias: true }}
      // Dibatasi 2 agar layar ber-DPI tinggi tidak memaksa render 3x lipat.
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={Math.PI} />

      <Physics gravity={[0, -22, 0]} timeStep={1 / 60}>
        <Tali nama={nama} keterangan={keterangan} fotoUrl={fotoUrl} />
      </Physics>

      <Environment blur={0.75}>
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[-1, -1, 1]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={10} color="white" position={[-10, 0, 14]} scale={[100, 10, 1]} />
      </Environment>
    </Canvas>
  );
}

/**
 * Ref rigid body untuk hook sendi rapier.
 *
 * `useRef<T>(null)` pada React 19 menghasilkan `RefObject<T | null>`,
 * sementara `useRopeJoint` menuntut `RefObject<T>`. Hook-nya sendiri sudah
 * menangani ref yang masih kosong saat render pertama, jadi yang berbeda hanya
 * tipenya. Dibungkus di satu tempat supaya tidak ada cast yang tersebar.
 */
function useRefBadan() {
  return useRef<RapierRigidBody>(null) as React.RefObject<RapierRigidBody>;
}

function Tali({ nama, keterangan, fotoUrl }: Lanyard3DProps) {
  const kait = useRefBadan();
  const j1 = useRefBadan();
  const j2 = useRefBadan();
  const j3 = useRefBadan();
  const kartu = useRefBadan();

  const garis = useRef<MeshLineGeometry>(null);

  const [diseret, setDiseret] = useState<THREE.Vector3 | false>(false);
  const [disentuh, setDisentuh] = useState(false);

  // Vektor kerja dibuat sekali, bukan tiap frame — useFrame berjalan 60x
  // per detik dan alokasi di dalamnya membebani pengumpul sampah.
  const kerja = useMemo(
    () => ({
      vec: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      rot: new THREE.Vector3(),
      arah: new THREE.Vector3(),
    }),
    [],
  );

  const kurva = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
    [],
  );

  const teksturKartu = useTeksturKartu(nama, keterangan, fotoUrl);

  useRopeJoint(kait, j1, [[0, 0, 0], [0, 0, 0], 0.7]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.7]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 0.7]);
  useSphericalJoint(j3, kartu, [[0, 0, 0], [0, 1.45, 0]]);

  useEffect(() => {
    if (!disentuh && !diseret) return;

    document.body.style.cursor = diseret ? 'grabbing' : 'grab';

    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [disentuh, diseret]);

  useFrame((state, delta) => {
    if (diseret && kartu.current) {
      kerja.vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      kerja.dir.copy(kerja.vec).sub(state.camera.position).normalize();
      kerja.vec.add(kerja.dir.multiplyScalar(state.camera.position.length()));

      // Seluruh rantai dibangunkan; tanpa ini bagian tali yang sudah tertidur
      // tidak ikut bergerak saat kartunya ditarik.
      for (const bagian of [kait, j1, j2, j3, kartu]) {
        bagian.current?.wakeUp();
      }

      kartu.current.setNextKinematicTranslation({
        x: kerja.vec.x - diseret.x,
        y: kerja.vec.y - diseret.y,
        z: kerja.vec.z - diseret.z,
      });
    }

    if (!j1.current || !j2.current || !j3.current || !garis.current) {
      return;
    }

    // Titik kendali dihaluskan supaya talinya tidak patah-patah saat
    // frame rate turun.
    for (const sendi of [j1, j2]) {
      const badan = sendi.current!;
      const data = badan as RapierRigidBody & { lerped?: THREE.Vector3 };

      data.lerped ??= new THREE.Vector3().copy(badan.translation());

      const jarak = Math.max(0.1, Math.min(1, data.lerped.distanceTo(badan.translation())));
      data.lerped.lerp(badan.translation(), delta * (10 + jarak * 40));
    }

    const l1 = (j1.current as RapierRigidBody & { lerped?: THREE.Vector3 }).lerped;
    const l2 = (j2.current as RapierRigidBody & { lerped?: THREE.Vector3 }).lerped;

    kurva.points[0].copy(j3.current.translation());
    kurva.points[1].copy(l2 ?? j2.current.translation());
    kurva.points[2].copy(l1 ?? j1.current.translation());
    kurva.points[3].copy(kait.current!.translation());

    garis.current.setPoints(kurva.getPoints(32));

    // Kartu diredam agar tidak berputar tanpa henti setelah dilepas.
    if (kartu.current) {
      kerja.arah.copy(kartu.current.angvel());
      kerja.rot.copy(kartu.current.rotation() as unknown as THREE.Vector3);
      kartu.current.setAngvel(
        { x: kerja.arah.x, y: kerja.arah.y - kerja.rot.y * 0.6, z: kerja.arah.z },
        true,
      );
    }
  });

  return (
    <>
      {/*
        Rantai disusun sudah menggantung lurus ke bawah. Versi React Bits
        aslinya menaruhnya mendatar, sehingga kartu jatuh dan berayun keras
        saat halaman dibuka — pada kotak sesempit ini gerakan itu terasa
        berlebihan.
      */}
      <group position={[0, 3.2, 0]}>
        <RigidBody ref={kait} type="fixed" />
        <RigidBody ref={j1} position={[0, -0.7, 0]} angularDamping={4} linearDamping={4}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody ref={j2} position={[0, -1.4, 0]} angularDamping={4} linearDamping={4}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody ref={j3} position={[0, -2.1, 0]} angularDamping={4} linearDamping={4}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          ref={kartu}
          position={[0, -3.6, 0]}
          angularDamping={5}
          linearDamping={4}
          // Saat diseret, kartu dikendalikan langsung; fisika mengambil alih
          // lagi begitu dilepas.
          type={diseret ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.15, 0.01]} />

          <group
            onPointerOver={() => setDisentuh(true)}
            onPointerOut={() => setDisentuh(false)}
            onPointerUp={(event) => {
              (event.target as Element).releasePointerCapture(event.pointerId);
              setDiseret(false);
            }}
            onPointerDown={(event) => {
              (event.target as Element).setPointerCapture(event.pointerId);
              setDiseret(
                new THREE.Vector3()
                  .copy(event.point)
                  .sub(kerja.vec.copy(kartu.current!.translation())),
              );
            }}
          >
            <RoundedBox args={[1.6, 2.3, 0.04]} radius={0.08} smoothness={4}>
              <meshPhysicalMaterial
                map={teksturKartu}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.4}
                metalness={0.1}
              />
            </RoundedBox>

            {/* Lubang penjepit */}
            <mesh position={[0, 1.02, 0.03]}>
              <torusGeometry args={[0.11, 0.03, 12, 24]} />
              <meshStandardMaterial color="#9aa3b2" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        </RigidBody>
      </group>

      <mesh>
        <meshLineGeometry ref={garis} />
        {/*
          `resolution` wajib ada pada konstruktor MeshLineMaterial — dipakai
          menghitung ketebalan garis dalam satuan layar.
        */}
        <meshLineMaterial
          args={[{ resolution: new THREE.Vector2(1000, 1000) }]}
          color="#005BBF"
          depthTest={false}
          lineWidth={0.5}
          transparent
        />
      </mesh>
    </>
  );
}

/**
 * Menggambar muka kartu ke sebuah canvas, lalu memakainya sebagai tekstur.
 *
 * Digambar sendiri, bukan memuat berkas gambar, karena isinya berubah
 * mengikuti pengguna — nama dan keterangannya berbeda tiap orang.
 */
function useTeksturKartu(nama: string, keterangan: string, fotoUrl?: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    // Kelipatan dua agar mipmap-nya tajam.
    canvas.width = 512;
    canvas.height = 736;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pita atas
    ctx.fillStyle = '#005BBF';
    ctx.fillRect(0, 0, canvas.width, 96);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAMS', canvas.width / 2, 62);

    // Lingkaran foto
    const pusatX = canvas.width / 2;
    const pusatY = 300;
    const jari = 110;

    ctx.beginPath();
    ctx.arc(pusatX, pusatY, jari, 0, Math.PI * 2);
    ctx.fillStyle = '#E8F0FE';
    ctx.fill();

    if (!fotoUrl) {
      // Tanda bawaan: centang, sejalan dengan DamsMark.
      ctx.strokeStyle = '#005BBF';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pusatX - 46, pusatY + 4);
      ctx.lineTo(pusatX - 12, pusatY + 40);
      ctx.lineTo(pusatX + 50, pusatY - 38);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#191C1E';
    ctx.font = 'bold 38px "Plus Jakarta Sans", system-ui, sans-serif';
    potongTeks(ctx, nama, pusatX, 470, canvas.width - 60);

    ctx.fillStyle = '#414754';
    ctx.font = '28px Inter, system-ui, sans-serif';
    potongTeks(ctx, keterangan, pusatX, 516, canvas.width - 60);

    // Garis pemisah
    ctx.strokeStyle = '#D9DDE5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 596);
    ctx.lineTo(canvas.width - 50, 596);
    ctx.stroke();

    ctx.fillStyle = '#727785';
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillText('CV HASIL BAROKAH MANDIRI', pusatX, 646);

    const tekstur = new THREE.CanvasTexture(canvas);
    tekstur.colorSpace = THREE.SRGBColorSpace;
    tekstur.anisotropy = 8;

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
