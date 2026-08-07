# Image frontend Next.js — build multi-tahap, output standalone.

FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1

# Alamat Reverb yang dipakai PERAMBAN.
#
# `NEXT_PUBLIC_*` ditanam ke dalam bundel JavaScript saat build, bukan dibaca
# saat container berjalan — mengubahnya lewat environment container tidak akan
# berpengaruh sama sekali. Karena itu build arg, bukan ENV runtime.
#
# Nilainya alamat publik (domain atau IP yang diakses pengguna), berbeda dari
# `REVERB_HOST` di backend yang menunjuk ke jaringan internal Docker.
ARG NEXT_PUBLIC_REVERB_KEY
ARG NEXT_PUBLIC_REVERB_HOST
ARG NEXT_PUBLIC_REVERB_PORT=443
ARG NEXT_PUBLIC_REVERB_SCHEME=https

ENV NEXT_PUBLIC_REVERB_KEY=${NEXT_PUBLIC_REVERB_KEY}
ENV NEXT_PUBLIC_REVERB_HOST=${NEXT_PUBLIC_REVERB_HOST}
ENV NEXT_PUBLIC_REVERB_PORT=${NEXT_PUBLIC_REVERB_PORT}
ENV NEXT_PUBLIC_REVERB_SCHEME=${NEXT_PUBLIC_REVERB_SCHEME}

# `public/` belum ada di repositori — aplikasi ini tidak memakai satu pun aset
# statis dari sana. Tahap runtime tetap menyalinnya, dan COPY yang sumbernya
# tidak ada menggagalkan build. Dibuat kosong di sini supaya build tetap jalan
# sekarang, dan berkasnya ikut tersalin dengan sendirinya bila kelak ditambahkan.
RUN mkdir -p public

RUN npm run build

# ---------------------------------------------------------------------------
# Penjagaan: nilai NEXT_PUBLIC_* wajib benar-benar mendarat di bundel
# ---------------------------------------------------------------------------
#
# Menyediakan build arg tidak menjamin nilainya tertanam. Bila kode membaca
# environment lewat pembungkus, webpack tidak punya ekspresi statis untuk
# diganti: build tetap berhasil, image tetap terbentuk, dan barulah di peramban
# pengguna ketahuan bahwa seluruh nilai jatuh ke bawaan pengembangan lokal.
#
# Gagal di sini jauh lebih murah daripada gagal di sana. Dilewati bila arg-nya
# memang tidak diberikan, supaya build lokal tanpa Reverb tetap bisa jalan.
RUN if [ -n "$NEXT_PUBLIC_REVERB_KEY" ]; then \
        grep -rq "$NEXT_PUBLIC_REVERB_KEY" .next/static || { \
            echo '' >&2; \
            echo 'GAGAL: NEXT_PUBLIC_REVERB_KEY diberikan sebagai build arg, tetapi' >&2; \
            echo 'nilainya tidak ditemukan di dalam bundel .next/static.' >&2; \
            echo '' >&2; \
            echo 'Artinya nilai itu tidak tertanam saat build, dan peramban akan' >&2; \
            echo 'memakai nilai bawaan — WebSocket menyambung ke alamat yang salah' >&2; \
            echo 'tanpa satu pun pesan galat.' >&2; \
            echo '' >&2; \
            echo 'Periksa src/lib/echo.ts: NEXT_PUBLIC_* wajib dibaca sebagai' >&2; \
            echo 'process.env.NAMA_PENUH, bukan lewat indeks variabel.' >&2; \
            echo '' >&2; \
            exit 1; \
        }; \
    fi

FROM node:20-alpine AS runtime
WORKDIR /app

# Basis data zona waktu; lihat alasannya di docker/backend.Dockerfile. Node
# memakai data zona bawaan ICU sehingga `Date` dan `Intl` sudah benar tanpa
# paket ini — yang dibetulkan hanyalah `date` dan stempel waktu shell.
RUN apk add --no-cache tzdata

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Halaman masuk, bukan /dashboard: dashboard menuntut sesi dan selalu
# mengalihkan, sehingga sehat atau tidaknya jadi bergantung pada perilaku
# pengalihan wget, bukan pada aplikasinya.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1

CMD ["node", "server.js"]
