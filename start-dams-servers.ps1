# ====================================================
#  CV HASIL BAROKAH MANDIRI - DAMS LAUNCHER
#  Daily Activity Monitoring System
#  Menjalankan server pengembangan secara native
#  (Windows + Laragon MySQL - tanpa Docker/WSL)
# ====================================================

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

$portFrontend = 13001
$portBackend = 13002
$portMysql = 3306
$portReverb = 13003

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   DAMS - SISTEM MONITORING AKTIVITAS HARIAN" -ForegroundColor Cyan
Write-Host "   CV Hasil Barokah Mandiri" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Validasi struktur project ----
if (-not (Test-Path $backendPath)) {
    Write-Host "[ERROR] Folder 'backend' tidak ditemukan di $projectRoot" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $frontendPath)) {
    Write-Host "[ERROR] Folder 'frontend' tidak ditemukan di $projectRoot" -ForegroundColor Red
    exit 1
}

# ---- Validasi dependency & environment ----
$siap = $true

if (-not (Test-Path (Join-Path $backendPath "vendor\autoload.php"))) {
    Write-Host "[ERROR] Dependency backend belum terpasang." -ForegroundColor Red
    Write-Host "        Jalankan: cd backend; composer install" -ForegroundColor Yellow
    $siap = $false
}

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "[ERROR] Dependency frontend belum terpasang." -ForegroundColor Red
    Write-Host "        Jalankan: cd frontend; npm install" -ForegroundColor Yellow
    $siap = $false
}

$envPath = Join-Path $backendPath ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[ERROR] backend\.env tidak ditemukan." -ForegroundColor Red
    Write-Host "        Jalankan: cd backend; copy .env.example .env; php artisan key:generate" -ForegroundColor Yellow
    $siap = $false
} else {
    $appKey = (Get-Content $envPath | Select-String -Pattern '^APP_KEY=.+$')
    if (-not $appKey) {
        Write-Host "[ERROR] APP_KEY pada backend\.env masih kosong." -ForegroundColor Red
        Write-Host "        Jalankan: cd backend; php artisan key:generate" -ForegroundColor Yellow
        $siap = $false
    }
}

if (-not $siap) {
    Write-Host ""
    Write-Host "Perbaiki hal di atas lalu jalankan ulang." -ForegroundColor Red
    exit 1
}

# ---- Opsi Rebuild Cache (opsional) ----
$rebuildCache = $false
Write-Host "Bangun ulang cache backend? (Perlu bila .env atau config berubah)" -ForegroundColor Cyan
Write-Host ">> Tekan [Y] dalam 3 detik untuk membangun ulang cache..." -ForegroundColor Yellow
Write-Host ">> Diamkan atau tekan tombol lain untuk startup instan..." -ForegroundColor Yellow

$timeout = 3
$startTime = [DateTime]::Now
while (([DateTime]::Now - $startTime).TotalSeconds -lt $timeout) {
    if ([Console]::KeyAvailable) {
        $key = [Console]::ReadKey($true)
        if ($key.Key -eq [ConsoleKey]::Y) { $rebuildCache = $true }
        break
    }
    Start-Sleep -Milliseconds 100
}

if ($rebuildCache) {
    Push-Location $backendPath
    Write-Host "[CACHE] Membersihkan dan membangun ulang cache backend..." -ForegroundColor Yellow
    try {
        php artisan optimize:clear | Out-Null
        php artisan config:cache | Out-Null
        php artisan event:cache | Out-Null
        Write-Host "  [OK] Config & Event ter-cache. (route:cache dilewati agar aman untuk dev)" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Gagal membangun cache otomatis. Melanjutkan tanpa cache." -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "[SKIP] Melewati pembangunan cache untuk startup instan." -ForegroundColor Green
}
Write-Host ""

# ---- Cek MySQL (Laragon) ----
function Test-Port {
    param([int]$Port)
    $klien = New-Object System.Net.Sockets.TcpClient
    try {
        $koneksi = $klien.BeginConnect('127.0.0.1', $Port, $null, $null)
        $berhasil = $koneksi.AsyncWaitHandle.WaitOne(700, $false)
        if ($berhasil) { $klien.EndConnect($koneksi); return $true }
        return $false
    } catch {
        return $false
    } finally {
        $klien.Close()
    }
}

Write-Host "[DB CHECK] Memeriksa MySQL (Laragon) di port $portMysql..." -ForegroundColor Yellow
if (Test-Port -Port $portMysql) {
    Write-Host "  [OK] MySQL aktif di port $portMysql." -ForegroundColor Green
} else {
    Write-Host "  [WARN] MySQL TIDAK terdeteksi di port $portMysql!" -ForegroundColor Red
    Write-Host "         Buka Laragon lalu 'Start All' sebelum backend dapat mengakses database." -ForegroundColor Yellow
}
Write-Host ""

# ---- Port Cleaning: hanya port milik DAMS ----
# Port 3306 sengaja TIDAK disentuh — dipakai bersama project lain.
$ports = @($portFrontend, $portBackend, $portReverb)
Write-Host "[PORT CHECK] Membebaskan port aplikasi ($portFrontend/$portBackend/$portReverb)..." -ForegroundColor Yellow
foreach ($port in $ports) {
    $targetPids = @()
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conns) { $targetPids = $conns | Select-Object -ExpandProperty OwningProcess -Unique }
    } catch {
        $netstat = netstat -ano | Select-String -Pattern ":$port\s+.*LISTENING"
        foreach ($line in $netstat) {
            $parts = $line.ToString().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
            if ($parts.Length -ge 5) {
                $pidStr = $parts[-1].Trim()
                if ($pidStr -match '^\d+$' -and $pidStr -ne '0') { $targetPids += [int]$pidStr }
            }
        }
        $targetPids = $targetPids | Select-Object -Unique
    }

    foreach ($targetPid in $targetPids) {
        if ($targetPid -gt 0) {
            $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  -> Port $port dipakai PID $targetPid ($($proc.Name)). Menghentikan..." -ForegroundColor Yellow
                try {
                    Stop-Process -Id $targetPid -Force -ErrorAction Stop
                    Write-Host "  [OK] PID $targetPid dihentikan." -ForegroundColor Green
                    Start-Sleep -Seconds 1
                } catch {
                    Write-Host "  [ERR] Gagal menghentikan PID $targetPid." -ForegroundColor Red
                }
            }
        }
    }
}
Write-Host "  [OK] Port siap digunakan." -ForegroundColor Green
Write-Host ""

# ---- Deteksi Windows Terminal (wt.exe) ----
$wtPath = "wt.exe"
if (-not (Get-Command wt -ErrorAction SilentlyContinue)) {
    $wtPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe"
}

# ---- Pilih server backend ----
#
# RoadRunner menahan aplikasi tetap hidup di memori dan melayani beberapa
# permintaan sekaligus. Server bawaan PHP mem-boot Laravel dari nol pada setiap
# permintaan dan hanya melayani satu per satu. Terukur di mesin pengembangan:
# endpoint 250-640 ms turun jadi 34-85 ms, halaman penuh 2,5-4,3 dt jadi
# 0,29-0,68 dt.
#
# `octane:start` sengaja tidak dipakai: ia menuntut ext-pcntl yang tidak ada di
# Windows. RoadRunner dijalankan langsung.
$rrPath = Join-Path $backendPath "rr.exe"
if (Test-Path $rrPath) {
    $perintahBackend = "rr.exe serve -c .rr.dev.yaml"
    Write-Host "[INFO] Backend memakai RoadRunner." -ForegroundColor Green
} else {
    $perintahBackend = "php artisan serve --port=$portBackend"
    Write-Host "[WARN] rr.exe belum ada - backend memakai server bawaan PHP (jauh lebih lambat)." -ForegroundColor Yellow
    Write-Host "       Unduh sekali dengan: cd backend; php artisan octane:install --server=roadrunner" -ForegroundColor Yellow
}

Write-Host "[LAUNCH] Menjalankan server..." -ForegroundColor Cyan

# Catatan: `npm run dev` sudah memakai port 13001 dari package.json,
# jadi tidak perlu menambahkan -p di sini.
if (Test-Path $wtPath) {
    Write-Host "[INFO] Windows Terminal terdeteksi. Membuka tab per-service..." -ForegroundColor Green

    # Backend API (Laravel)
    Start-Process $wtPath -ArgumentList "-w 0 nt -d `"$backendPath`" --title `"DAMS-API`" cmd /k `"$perintahBackend`""
    # Queue worker - memproses export Excel/PDF di latar belakang
    Start-Process $wtPath -ArgumentList "-w 0 nt -d `"$backendPath`" --title `"DAMS-QUEUE`" cmd /k `"php artisan queue:listen --tries=3 --timeout=300`""
    # Scheduler - pengingat laporan harian & tugas terjadwal
    Start-Process $wtPath -ArgumentList "-w 0 nt -d `"$backendPath`" --title `"DAMS-SCHEDULER`" cmd /k `"php artisan schedule:work`""
    # Reverb - WebSocket untuk notifikasi seketika
    Start-Process $wtPath -ArgumentList "-w 0 nt -d `"$backendPath`" --title `"DAMS-REVERB`" cmd /k `"php artisan reverb:start`""
    # Frontend (Next.js)
    Start-Process $wtPath -ArgumentList "-w 0 nt -d `"$frontendPath`" --title `"DAMS-FRONTEND`" cmd /k `"npm run dev`""
} else {
    Write-Host "[WARN] Windows Terminal tidak ditemukan. Membuka jendela terpisah..." -ForegroundColor Yellow

    Start-Process cmd -ArgumentList "/k cd /d `"$backendPath`" && $perintahBackend" -WindowStyle Normal
    Start-Process cmd -ArgumentList "/k cd /d `"$backendPath`" && php artisan queue:listen --tries=3 --timeout=300" -WindowStyle Normal
    Start-Process cmd -ArgumentList "/k cd /d `"$backendPath`" && php artisan schedule:work" -WindowStyle Normal
    Start-Process cmd -ArgumentList "/k cd /d `"$backendPath`" && php artisan reverb:start" -WindowStyle Normal
    Start-Process cmd -ArgumentList "/k cd /d `"$frontendPath`" && npm run dev" -WindowStyle Normal
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  DAMS TELAH DIAKTIFKAN!" -ForegroundColor Green
Write-Host "  --------------------------------------------------"
Write-Host "  Aplikasi:     http://localhost:$portFrontend"
Write-Host "  Backend API:  http://localhost:$portBackend/api"
Write-Host "  Health Check: http://localhost:$portBackend/api/health"
Write-Host "  Dokumentasi:  http://localhost:$portBackend/docs/api"
Write-Host "  Database:     MySQL localhost:$portMysql (Laragon) - dams_db"
Write-Host "  --------------------------------------------------"
Write-Host "  Server:       RoadRunner + Next.js dev (native)" -ForegroundColor Cyan
Write-Host "  Queue/Cache:  driver database (Redis dipakai di Docker)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "PENTING - aturan migrasi database:" -ForegroundColor Yellow
Write-Host "  Server MySQL ini menampung banyak database project lain." -ForegroundColor Yellow
Write-Host "  'migrate:fresh', 'migrate:refresh', dan 'db:wipe' DILARANG" -ForegroundColor Yellow
Write-Host "  tanpa izin. Untuk memperbarui skema gunakan:" -ForegroundColor Yellow
Write-Host "      cd backend; php artisan migrate" -ForegroundColor Gray
Write-Host "  Rinciannya di docs\adr\ADR-008-larangan-fresh-migrate.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Penggunaan pertama: 'composer install' di backend, 'npm install'" -ForegroundColor DarkGray
Write-Host "di frontend, lalu 'php artisan migrate --seed'." -ForegroundColor DarkGray
Write-Host ""
