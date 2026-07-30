'use client';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export interface OpsiCombobox {
  id: string | number;
  label: string;
  /** Baris kedua pada daftar pilihan, mis. kode atau departemen. */
  keterangan?: string;
}

interface ComboboxProps {
  label: string;
  opsi: OpsiCombobox[];
  nilai: OpsiCombobox | null;
  onUbah: (nilai: OpsiCombobox | null) => void;
  placeholder?: string;
  galat?: string;
  bantuan?: string;
  wajib?: boolean;
  nonaktif?: boolean;
}

/**
 * Pilihan dari master data dengan penyaringan ketik (standar interaksi §1.1).
 *
 * Dipakai untuk daftar panjang — supplier, item, LOT, pengguna. Daftar pendek
 * (≤ 10) cukup memakai `select` biasa.
 *
 * Nilainya selalu terikat master data: mengetik hanya menyaring, tidak membuat
 * data baru.
 */
export function Combobox({
  label,
  opsi,
  nilai,
  onUbah,
  placeholder,
  galat,
  bantuan,
  wajib = false,
  nonaktif = false,
}: ComboboxProps) {
  return (
    <Autocomplete
      options={opsi}
      value={nilai}
      onChange={(_, dipilih) => onUbah(dipilih)}
      disabled={nonaktif}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(o) => o.label}
      noOptionsText="Tidak ada yang cocok"
      openText="Buka daftar"
      closeText="Tutup daftar"
      clearText="Kosongkan"
      renderOption={(props, o) => {
        const { key, ...sisa } = props as typeof props & { key: string };
        return (
          <li key={key} {...sisa}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-lg text-ink">{o.label}</span>
              {o.keterangan && (
                <span className="truncate text-caption text-ink-soft">{o.keterangan}</span>
              )}
            </span>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={wajib}
          error={Boolean(galat)}
          helperText={galat ?? bantuan}
          size="small"
        />
      )}
    />
  );
}
