'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { SpectacularButton } from '@/components/ui/spectacular-button';

export function LoginForm({ lanjut }: { lanjut: string }) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [ingat, setIngat] = useState(false);
  const [kataSandiTerlihat, setKataSandiTerlihat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGalat(null);
    setMemproses(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: kataSandi, ingat }),
      });

      const hasil = await response.json();

      if (!response.ok || !hasil.success) {
        setGalat(hasil.message ?? 'Terjadi gangguan saat memproses permintaan.');
        setMemproses(false);
        return;
      }

      router.replace(lanjut);
      router.refresh();
    } catch {
      setGalat('Tidak dapat terhubung ke server. Coba lagi sebentar lagi.');
      setMemproses(false);
    }
  }

  return (
    <form onSubmit={kirim} className="space-y-4" noValidate>
      {galat && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-input border border-danger/25 bg-danger-subtle px-3 py-2 text-body text-danger-text"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{galat}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="field-label">
          Alamat Email
        </label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@hbmcorp.co.id"
            className="field pl-8"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Kata Sandi
        </label>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="password"
            name="password"
            type={kataSandiTerlihat ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            placeholder="••••••••"
            className="field px-8"
          />
          <button
            type="button"
            onClick={() => setKataSandiTerlihat((tampil) => !tampil)}
            aria-label={kataSandiTerlihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-control text-ink-soft transition-colors duration-fast hover:text-ink"
          >
            {kataSandiTerlihat ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-body text-ink-muted">
        <input
          type="checkbox"
          checked={ingat}
          onChange={(e) => setIngat(e.target.checked)}
          className="size-3.5 rounded-sm border-line text-primary focus:ring-primary"
        />
        Ingat saya
      </label>

      {/* Aksi utama halaman — satu-satunya Spectacular Button di sini. */}
      <SpectacularButton type="submit" memproses={memproses} penuh>
        Masuk
      </SpectacularButton>
    </form>
  );
}
