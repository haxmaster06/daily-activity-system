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

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

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
