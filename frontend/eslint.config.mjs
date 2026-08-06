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
      ],
    },
  },
];

export default eslintConfig;
