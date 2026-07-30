# 1. NON-FUNCTIONAL REQUIREMENTS

Non-functional requirements menjadi standar wajib pengembangan Daily Activity Monitoring System (DAMS).

Setiap fitur baru harus mempertimbangkan:

* Security
* Performance
* Reliability
* Maintainability
* Testing
* Observability
* Backup & Recovery

---

# 2. SECURITY REQUIREMENTS

## 2.1 Security by Design

Keamanan harus dirancang sejak awal pengembangan, bukan ditambahkan setelah sistem selesai.

Setiap fitur harus dianalisis terhadap:

* Authentication
* Authorization
* Data access
* Input validation
* Sensitive data
* File upload
* Audit trail

---

## 2.2 Authentication

Sistem wajib mendukung:

* Secure login
* Password hashing (bcrypt)
* Session management (Laravel Sanctum)
* Logout
* Session expiration
* Password reset

Password tidak boleh disimpan dalam bentuk plaintext.

---

## 2.3 Authorization

Seluruh akses data harus menggunakan prinsip:

> **Deny by Default**

User hanya dapat:

* Melihat data yang diizinkan
* Membuat data sesuai permission
* Mengubah data sesuai permission
* Menghapus data sesuai permission

Authorization diterapkan pada:

```text
User
  ↓
Role (Administrator / Manager / Supervisor / Staff)
  ↓
Permission
  ↓
Action
  ↓
Data Scope (Departemen)
```

Contoh:

```text
User A
  ↓
Role: Supervisor Produksi
  ↓
Permission: Lihat Laporan Tim
  ↓
Scope: Departemen Produksi
```

---

## 2.4 Data-Level Authorization

Permission tidak hanya berlaku pada level menu.

Contoh data scope:

* Data milik sendiri (Staff melihat laporan sendiri)
* Data departemen (Supervisor melihat laporan tim)
* Semua data (Administrator melihat semua departemen)

---

# 3. INPUT SECURITY

Seluruh input dari user harus dianggap tidak terpercaya.

Wajib dilakukan:

* Server-side validation
* Request validation (Laravel Form Request)
* Type validation
* Length validation
* Format validation
* Business rule validation

Frontend validation hanya berfungsi sebagai:

> **User Experience Layer**

Validasi utama tetap dilakukan di backend.

---

# 4. SQL INJECTION PREVENTION

Sistem wajib menggunakan:

* Eloquent ORM
* Parameterized Query
* Query Builder yang aman

Dilarang menyusun query dari input user secara langsung.

---

# 5. XSS PREVENTION

Data yang berasal dari user harus di-sanitize dan di-escape sesuai kebutuhan.

Perhatian khusus pada:

* Keterangan aktivitas
* Nama user
* Deskripsi departemen
* File metadata
* Nama attachment

HTML mentah tidak boleh dirender tanpa sanitization.

---

# 6. CSRF & API SECURITY

API wajib menggunakan Laravel Sanctum untuk authentication.

Setiap endpoint harus memiliki:

* Authentication requirement
* Authorization requirement
* Input validation
* Rate limiting jika diperlukan

Contoh:

```text
POST /api/daily-reports
```

Membutuhkan:

```text
Authenticated User (Sanctum Token)
        ↓
Permission Check (Role-based)
        ↓
Validation (Form Request)
        ↓
Business Rule
        ↓
Store to Database
```

---

# 7. RATE LIMITING

Rate limiting diterapkan untuk mencegah:

* Brute force login
* Abuse
* Request flooding

Endpoint prioritas:

* Login
* Password reset
* File upload
* API endpoint yang mahal (export)

---

# 8. FILE UPLOAD SECURITY

File upload (attachment laporan) wajib memiliki:

* Validasi extension (JPG, PNG, PDF)
* Validasi MIME type
* Batas ukuran (10MB per file)
* Randomized filename
* Storage isolation
* Access control (hanya pemilik laporan dan supervisor)

File tidak boleh langsung dipercaya hanya berdasarkan extension.

---

# 9. SENSITIVE DATA

Data sensitif harus diklasifikasikan.

Contoh dalam DAMS:

* Password user
* Token authentication
* Email karyawan
* Data aktivitas departemen

Data sensitif tidak boleh:

* Ditampilkan ke user yang tidak berwenang
* Dicatat ke log secara sembarangan
* Dikirim ke client tanpa kebutuhan
* Disimpan dalam plaintext jika membutuhkan encryption

---

# 10. SECRET MANAGEMENT

Credential tidak boleh disimpan di source code.

Dilarang:

```text
DB_PASSWORD=secret
SANCTUM_SECRET=abc123
```

di-commit ke repository.

Gunakan:

* Environment variable (.env)
* Docker secrets
* CI/CD secret management

---

# 11. AUDIT TRAIL

Aktivitas penting harus dicatat.

Minimal:

```text
User
Action
Module
Record
Timestamp
IP Address
Changes
```

Contoh:

```text
Ahmad Fauzi
Membuat Laporan Harian
Tanggal: 30 Juli 2026
Departemen: Produksi
5 aktivitas
```

Audit trail harus bersifat:

> **Append-only untuk histori aktivitas penting.**

---

# 12. SECURITY LOGGING

Log teknis harus membantu investigasi tanpa membocorkan data sensitif.

Dilarang mencatat:

* Password
* Token
* Secret
* Full credential

---

# 13. OWASP SECURITY BASELINE

Pengembangan harus mempertimbangkan risiko umum:

* Broken Access Control
* Cryptographic Failures
* Injection
* Insecure Design
* Security Misconfiguration
* Vulnerable Components
* Authentication Failures
* Logging Failures

Security review dilakukan pada fitur yang memiliki risiko tinggi.

---

# 14. SCALABILITY REQUIREMENTS

DAMS dirancang untuk skala internal perusahaan.

Target:

```text
Phase 1
   ↓
Puluhan User (satu pabrik)

Phase 2
   ↓
Ratusan User (jika berkembang)
```

Arsitektur:

> **Monolithic Backend (Laravel) + Frontend Terpisah (Next.js)**

Tidak menggunakan microservices.

---

# 15. SCALABILITY PRINCIPLES

## 15.1 Stateless API

Backend API tidak bergantung pada state lokal server.

Hal ini memungkinkan horizontal scaling di masa depan jika diperlukan.

---

## 15.2 Database Scalability

Wajib memperhatikan:

* Index pada kolom yang sering dicari (tanggal, departemen, status)
* Query performance
* Foreign key
* Pagination
* Proper data type
* Avoid N+1 query

---

## 15.3 Pagination

Data dalam jumlah besar tidak boleh di-load seluruhnya.

Gunakan server-side pagination:

```text
Request
  ↓
Pagination (25 data per halaman)
  ↓
Response dengan metadata halaman
```

---

## 15.4 Query Optimization

Setiap query besar harus memperhatikan:

* Index
* Execution plan
* Query count
* Join complexity
* Eager loading

---

## 15.5 Background Processing

Proses berat tidak boleh menghambat request utama.

Contoh dalam DAMS:

* Export Excel (laporan besar)
* Export PDF
* Generate report gabungan

Flow:

```text
User Request Export
     ↓
Create Job (Queue)
     ↓
Return Response "Sedang diproses"
     ↓
Queue Worker
     ↓
File siap diunduh
```

---

# 16. CACHING STRATEGY

Cache digunakan untuk data yang:

* Sering dibaca
* Jarang berubah
* Mahal untuk dihitung

Contoh dalam DAMS:

* Daftar departemen (master data)
* Daftar role
* Statistik dashboard (cache pendek, beberapa menit)

Cache tidak boleh digunakan tanpa strategi invalidation yang jelas.

---

# 17. PERFORMANCE TARGET

Target:

| Area                  |            Target |
| --------------------- | ----------------: |
| Initial UI Load       |         < 3 detik |
| Standard API          |          < 500 ms |
| Simple Database Query |          < 200 ms |
| UI Interaction        | < 100 ms feedback |
| Heavy Process (Export) |   Background Job |

Target dapat disesuaikan berdasarkan hasil monitoring production.

---

# 18. TESTING STRATEGY

Testing menjadi bagian wajib dari development lifecycle.

```text
Code
  ↓
Unit Test
  ↓
Feature Test
  ↓
Integration Test
  ↓
Deployment
```

---

# 19. UNIT TEST

Unit test digunakan untuk menguji bagian kecil dari sistem secara terisolasi.

Contoh dalam DAMS:

* Status transition (Draft → Terkirim → Selesai)
* Permission logic (Staff hanya lihat data sendiri)
* Date formatting
* Report number generation

Unit test harus:

* Cepat
* Terisolasi
* Deterministic

---

# 20. FEATURE TEST

Feature test menguji fitur dari perspektif aplikasi.

Contoh:

```text
User
  ↓
Login
  ↓
Buat Laporan Harian
  ↓
Tambah Aktivitas
  ↓
Kirim Laporan
```

Yang diuji:

* Request
* Validation
* Authorization
* Database
* Response

---

# 21. INTEGRATION TEST

Integration test digunakan untuk memastikan beberapa komponen bekerja bersama.

Contoh:

```text
Buat Laporan
  ↓
Upload Attachment
  ↓
Kirim Laporan
  ↓
Supervisor Melihat di Monitoring
```

Test memastikan integrasi antar fitur berjalan sesuai requirement.

---

# 22. TEST COVERAGE

Coverage tidak boleh menjadi satu-satunya target kualitas.

Fokus utama:

> **Critical business logic harus memiliki test yang memadai.**

Prioritas tinggi:

* Authorization (role-based access)
* Status transition laporan
* Data scope (user hanya lihat data sendiri)
* Export report generation
* File upload validation

---

# 23. TESTING PYRAMID

```text
          E2E
         /   \
      Feature
       /     \
  Integration
      /       \
    Unit Tests
```

Jumlah test ideal:

```text
Banyak Unit Test
      ↓
Cukup Feature Test
      ↓
Sedikit Integration Test
```

---

# 24. QUALITY GATE

Pull Request tidak boleh di-merge jika:

* Test gagal
* Build gagal
* Lint gagal
* Critical security issue ditemukan

Minimum pipeline:

```text
Pull Request
      ↓
Backend Test (PHPUnit/Pest)
      ↓
Frontend Test
      ↓
Lint
      ↓
Build
      ↓
Code Review
```

---

# 25. DEPENDENCY SECURITY

Dependency harus diperiksa secara berkala.

Meliputi:

* PHP dependency (Composer)
* NPM dependency
* Docker image
* Operating system package

Dependency yang memiliki vulnerability kritis harus segera dievaluasi.

---

# 26. OBSERVABILITY

Sistem production harus dapat dipantau.

Minimal:

```text
Application
    ↓
Logs
    ↓
Errors
    ↓
Performance
```

Yang perlu dipantau:

* Error rate
* API response time
* Database performance
* Queue status
* Server resource
* Storage
* Failed jobs

---

# 27. ERROR TRACKING

Error teknis harus dapat dilacak tanpa menampilkan detail teknis kepada user.

Flow:

```text
User
  ↓
Pesan Ramah: "Terjadi gangguan saat memproses permintaan."

System
  ↓
Error ID
  ↓
Technical Log
  ↓
Monitoring
```

Contoh pesan user:

```text
Terjadi gangguan saat memproses permintaan.

Kode referensi: ERR-20260730-001
```

---

# 28. BACKUP STRATEGY

Database wajib memiliki backup terjadwal.

Strategi minimum:

```text
MySQL Database
    ↓
Daily Backup
    ↓
Retention Policy (min. 7 hari)
    ↓
Separate Storage
```

Backup harus:

* Terjadwal
* Terverifikasi
* Tidak hanya disimpan di server utama
* Dapat dipulihkan

---

# 29. DISASTER RECOVERY

Harus terdapat prosedur untuk:

* Database failure
* Server failure
* Storage failure
* Deployment failure
* Data corruption

Target recovery harus didefinisikan:

## RPO (Recovery Point Objective)

Berapa banyak data maksimal yang dapat hilang.

## RTO (Recovery Time Objective)

Berapa lama sistem maksimal boleh tidak tersedia.

---

# 30. DEPLOYMENT SAFETY

Deployment production harus memiliki:

* Database backup sebelum migration
* Migration review
* Rollback strategy
* Health check
* Deployment log

Flow:

```text
Build (Docker)
  ↓
Test
  ↓
Backup
  ↓
Deploy (Docker Compose)
  ↓
Migration
  ↓
Health Check
  ↓
Verify
```

---

# 31. DATABASE MIGRATION SAFETY

Migration harus:

* Versioned
* Reviewable
* Reversible jika memungkinkan
* Tidak menyebabkan downtime besar tanpa perencanaan

---

# 32. MAINTAINABILITY

Codebase harus mudah dipahami developer lain.

Wajib memiliki:

* Naming convention konsisten
* Coding standard
* Documentation
* Test
* Consistent architecture

---

# 33. ARCHITECTURE DECISION RECORD

Keputusan arsitektur penting harus dicatat.

Contoh:

```text
ADR-001
Menggunakan Monolithic Backend (Laravel)

ADR-002
Frontend menggunakan Next.js (terpisah)

ADR-003
Tidak menggunakan permanent sidebar

ADR-004
Menggunakan MySQL

ADR-005
Menggunakan Laravel Sanctum untuk authentication

ADR-006
Export menggunakan flow preview-first

ADR-007
Deployment menggunakan Docker Compose
```

Format:

```text
Context
Decision
Alternatives
Consequences
```

---

# 34. SECURITY & PERFORMANCE CHECKLIST

Setiap fitur baru harus memenuhi:

## Security

* [ ] Authentication
* [ ] Authorization (role-based)
* [ ] Data scope (departemen)
* [ ] Input validation
* [ ] Rate limiting jika diperlukan
* [ ] Audit trail
* [ ] File upload security jika ada attachment

## Performance

* [ ] Query sudah dioptimalkan
* [ ] Tidak ada N+1 query
* [ ] Pagination tersedia
* [ ] Heavy process menggunakan queue
* [ ] Cache digunakan jika relevan

## Testing

* [ ] Unit test
* [ ] Feature test
* [ ] Integration test jika diperlukan

## Operations

* [ ] Logging
* [ ] Error tracking
* [ ] Monitoring
* [ ] Backup impact review
* [ ] Deployment impact review

---

# 35. DEFINITION OF DONE

Sebuah fitur dianggap selesai apabila:

### Product

* [ ] Requirement sesuai PRD
* [ ] Business flow sudah disetujui
* [ ] UI/UX sesuai mockup dan design standard
* [ ] Bahasa Indonesia sudah konsisten

### Development

* [ ] Backend selesai
* [ ] Frontend selesai
* [ ] API contract sesuai
* [ ] Authorization diterapkan

### Quality

* [ ] Test tersedia
* [ ] Test berhasil
* [ ] Tidak ada critical bug
* [ ] Tidak ada technical error di user interface

### Security

* [ ] Permission sudah diuji
* [ ] Input validation tersedia
* [ ] Sensitive data sudah direview

### Performance

* [ ] Query direview
* [ ] Pagination diterapkan jika diperlukan
* [ ] Background job digunakan untuk proses berat

### Deployment

* [ ] CI berhasil
* [ ] Build berhasil
* [ ] Docker container berjalan
* [ ] Rollback strategy tersedia jika diperlukan

---

# 36. FINAL NON-FUNCTIONAL PRINCIPLES

Daily Activity Monitoring System harus:

> **Secure by Design**

> **Testable by Default**

> **Observable in Production**

> **Recoverable When Failure Happens**

> **Maintainable by Other Developers**

> **User-Friendly by Language and Experience**

---

# 37. ENGINEERING STANDARD

```text
Requirement (PRD)
    ↓
Mockup (Stitch)
    ↓
Architecture Review
    ↓
Security Review
    ↓
Implementation
    ↓
Unit Test
    ↓
Feature Test
    ↓
Code Review
    ↓
CI/CD
    ↓
Staging / Testing
    ↓
Production (Docker)
    ↓
Monitoring
```

Tidak ada fitur penting yang langsung lompat dari:

```text
"User minta fitur"
        ↓
"Langsung coding"
```

Itu bukan development workflow. Itu ritual pemanggilan bug.
