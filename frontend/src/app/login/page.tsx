import { LogoDams } from '@/components/brand/logo-dams';
import { Alert } from '@/components/ui/alert';
import { LoginForm } from './login-form';

export const metadata = { title: 'Masuk — DAMS' };

/** Halaman masuk tidak menampilkan navigasi utama (standar §2.3). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; sesi?: string }>;
}) {
  const { lanjut, sesi } = await searchParams;

  // Hanya menerima path internal, agar parameter URL tidak dapat dipakai
  // mengarahkan pengguna ke situs luar setelah masuk (open redirect).
  const tujuan = lanjut?.startsWith('/') && !lanjut.startsWith('//') ? lanjut : '/dashboard';

  return (
    <main className="flex min-h-dvh flex-col md:flex-row">
      {/* Panel identitas */}
      <section className="relative hidden bg-primary-text px-8 py-12 text-white md:flex md:w-1/2 md:flex-col md:items-center md:justify-center">
        {/* Varian putih: panel ini berlatar gelap. */}
        <LogoDams varian="putih" className="w-64" prioritas />
        <p className="mt-4 max-w-xs text-center text-body-lg text-white/85">
          Pantau aktivitas harian setiap departemen dalam satu tempat.
        </p>
        <p className="absolute bottom-6 text-caption text-white/60">
          CV Hasil Barokah Mandiri
        </p>
      </section>

      {/* Panel formulir */}
      <section className="flex w-full items-center justify-center bg-surface px-4 py-10 md:w-1/2 md:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center md:hidden">
            <LogoDams className="w-44" prioritas />
          </div>

          <h1 className="text-page-title text-ink">Selamat Datang</h1>
          <p className="mb-5 mt-0.5 text-body-lg text-ink-muted">Silakan masuk ke akun Anda.</p>

          {/*
            Penyebabnya disebutkan supaya pengguna tidak menduga aplikasinya
            rusak. Sesi berakhir bila aplikasi lama tidak dipakai, atau akun
            dipakai di lebih banyak perangkat daripada yang diizinkan.
          */}
          {sesi === 'berakhir' && (
            <Alert
              jenis="galat"
              pesan="Sesi Anda sudah berakhir. Ini terjadi bila aplikasi tidak dipakai lebih dari 12 jam, atau akun Anda dipakai masuk di terlalu banyak perangkat. Silakan masuk kembali."
              className="mb-4"
            />
          )}

          <LoginForm lanjut={tujuan} />
        </div>
      </section>
    </main>
  );
}
