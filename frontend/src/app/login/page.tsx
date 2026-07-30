import { DamsMark } from '@/components/brand/dams-mark';
import { LoginForm } from './login-form';

export const metadata = { title: 'Masuk — DAMS' };

/** Halaman masuk tidak menampilkan navigasi utama (standar §2.3). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const { lanjut } = await searchParams;

  // Hanya menerima path internal, agar parameter URL tidak dapat dipakai
  // mengarahkan pengguna ke situs luar setelah masuk (open redirect).
  const tujuan = lanjut?.startsWith('/') && !lanjut.startsWith('//') ? lanjut : '/dashboard';

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Panel identitas */}
      <section className="relative hidden bg-primary-text px-8 py-12 text-white md:flex md:w-1/2 md:flex-col md:items-center md:justify-center">
        <DamsMark className="size-20 text-white" />
        <p className="mt-5 font-heading text-[2rem] font-bold leading-none">DAMS</p>
        <p className="mt-2 max-w-xs text-center text-body-lg text-white/85">
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
            <DamsMark className="size-12 text-primary-text" />
            <p className="mt-2 font-heading text-page-title font-bold text-primary-text">DAMS</p>
          </div>

          <h1 className="text-page-title text-ink">Selamat Datang</h1>
          <p className="mb-5 mt-0.5 text-body-lg text-ink-muted">Silakan masuk ke akun Anda.</p>

          <LoginForm lanjut={tujuan} />
        </div>
      </section>
    </main>
  );
}
