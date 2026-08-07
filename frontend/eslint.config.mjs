import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      // Keluaran build produksi saat diuji berdampingan dengan dev server
      // (NEXT_DIST_DIR, lihat next.config.ts).
      ".next-prod/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      /*
       * Nilai environment wajib dibaca sebagai `process.env.NAMA_PENUH`.
       *
       * Next.js menanamkan NEXT_PUBLIC_* saat build dengan mengganti teks
       * ekspresi itu satu per satu — bukan dengan menyediakan objek
       * `process.env` di peramban. Dibaca lewat indeks variabel, webpack tidak
       * punya apa pun untuk diganti: tidak ada nilai yang tertanam, dan seluruh
       * pembacaan diam-diam jatuh ke nilai bawaannya.
       *
       * Kegagalannya tidak terlihat di mesin pengembang karena nilai bawaan
       * biasanya memang alamat lokal. Di server, sambungan WebSocket tiap
       * pengguna menuju 127.0.0.1 miliknya sendiri dan lonceng notifikasi diam
       * selamanya tanpa satu pun pesan galat.
       */
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'MemberExpression[computed=true][object.object.name="process"][object.property.name="env"]',
          message:
            "Tulis process.env.NAMA_PENUH. Membaca env lewat indeks variabel membuat NEXT_PUBLIC_* tidak tertanam saat build, dan nilainya diam-diam jatuh ke bawaan.",
        },
        /*
         * Tanggal dan jam wajib lewat `@/lib/format`.
         *
         * Dua pola di bawah membaca zona waktu tempat kode itu kebetulan
         * berjalan. Ada tiga tempat yang berbeda-beda: peramban pengguna
         * (biasanya WIB), server Next.js (UTC), dan test (isi TZ saat itu).
         *
         * `.toISOString().slice(0, 10)` mengambil tanggal UTC. Antara 00.00
         * dan 07.00 WIB itu tanggal KEMARIN — dan pola itu sempat dipakai
         * sebagai nilai awal sekaligus batas atas isian tanggal laporan,
         * sehingga laporan pagi hari terisi tanggal kemarin lalu tanggal hari
         * ini ditolak sebagai "belum terjadi".
         *
         * Pakai `hariIniApi`, `geserHariApi`, `awalBulanApi`, `toApiDate`, atau
         * `formatTanggal` dan kerabatnya — seluruhnya dipatok ke Asia/Jakarta.
         */
        {
          selector:
            'CallExpression[callee.property.name="slice"][callee.object.callee.property.name="toISOString"]',
          message:
            "Memotong toISOString() menghasilkan tanggal UTC, yang antara 00.00-07.00 WIB masih tanggal kemarin. Pakai hariIniApi/geserHariApi/toApiDate dari @/lib/format.",
        },
        {
          selector:
            'MemberExpression[property.name=/^(getDate|getMonth|getFullYear|getDay|getHours|getMinutes)$/]',
          message:
            "Pembaca tanggal ini memakai zona waktu runtime — UTC di server Next.js. Pakai helper dari @/lib/format, yang dipatok ke Asia/Jakarta.",
        },
      ],
    },
  },
  {
    // Satu-satunya tempat yang boleh membaca bagian tanggal secara langsung:
    // di sinilah zona waktunya dipatok untuk seluruh aplikasi.
    files: ["src/lib/format.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
];

export default eslintConfig;
