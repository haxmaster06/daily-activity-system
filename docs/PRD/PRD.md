# Product Requirement Document (PRD)

# Daily Activity Monitoring System

## 1. Informasi Project

**Nama Project**
Daily Activity Monitoring System

**Jenis Aplikasi**
Web Based Internal Application

**Tujuan Utama**
Membangun aplikasi untuk menggantikan proses Daily Report berbasis Excel/Doc menjadi sistem digital yang terstruktur, mudah digunakan, mudah dipantau, dan memiliki histori aktivitas setiap departemen.

---

# 2. Latar Belakang

Saat ini proses pelaporan aktivitas harian masih menggunakan file spreadsheet dan dokumen terpisah antar departemen.

Contoh kebutuhan yang ditemukan:

* Quality Assurance melakukan pencatatan:

  * Receiving bahan baku
  * Pengujian bahan baku
  * Aktivitas dokumen dan compliance
* Produksi membutuhkan pencatatan:

  * SPK
  * PO
  * Target produksi
  * Quantity selesai
  * Waste
  * Progress produksi
* Departemen lain seperti Finance, Document Control, Maintenance, dan lainnya memiliki format laporan masing-masing.

Referensi kebutuhan produksi mencakup informasi seperti nomor SPK, PO, perusahaan, kode item, quantity kebutuhan, quantity selesai, tanggal produksi, dan keterangan.

Sistem dibuat untuk melakukan standarisasi laporan harian tanpa menghilangkan fleksibilitas tiap departemen.

---

# 3. Objective

## Primary Objective

* Digitalisasi proses Daily Report.
* Mempermudah input aktivitas harian.
* Mempermudah monitoring pekerjaan setiap departemen.
* Menyediakan histori laporan yang dapat dicari kembali.
* Mengurangi ketergantungan terhadap file Excel manual.

## Secondary Objective

* Menyediakan export laporan.
* Menyediakan approval/review sederhana.
* Menyediakan dashboard monitoring aktivitas.

---

# 4. Scope Project

## Included

### User Management

* Login user.
* Role management.
* Hak akses berdasarkan departemen.

Role:

* Administrator
* Manager
* Supervisor
* Staff

### Department Management

Master departemen:

* Produksi
* QA
* QC
* Finance
* HRD
* Purchasing
* Warehouse
* Document Control
* Maintenance
* Departemen lainnya

### Daily Activity Input

User dapat membuat laporan:

* Tanggal laporan
* Departemen
* Aktivitas
* Detail aktivitas
* Target penyelesaian
* Status pekerjaan
* Keterangan
* Attachment (optional)

### Monitoring

Dashboard menampilkan:

* Total laporan hari ini
* Aktivitas belum selesai
* Aktivitas selesai
* Aktivitas berdasarkan departemen
* Riwayat laporan

### Report

Fitur:

* Preview laporan
* Export Excel
* Export PDF
* Print

Export tidak langsung melakukan download. User melihat preview terlebih dahulu kemudian memilih:

* Export Excel
* Export PDF
* Print

---

# 5. Out of Scope

Tidak termasuk:

* ERP.
* Payroll.
* Accounting.
* Inventory management.
* Workflow approval kompleks.
* Artificial Intelligence analysis.
* Microservices architecture.

Project ini fokus pada monitoring aktivitas harian.

---

# 6. Architecture Overview

## Architecture Style

Monolithic Backend dengan Frontend terpisah.

Struktur repository:

```
daily-activity-monitoring-system/

├── backend/
│   └── Laravel Application

├── frontend/
│   └── Next.js Application

└── docker/
    └── Deployment Configuration
```

---

# 7. Technology Stack

## Frontend

Framework:

* Next.js
* React.js
* TypeScript

UI:

* Tailwind CSS
* Component Library modern

Requirement:

* Responsive
* Interactive
* Modern SaaS Style
* Professional Interface
* No AI generated UI pattern
* Konsisten antar halaman

---

## Backend

Framework:

* Laravel

API:

* REST API

Authentication:

* Laravel Sanctum

Documentation:

Menggunakan salah satu:

* Laravel Scramble
  atau
* Swagger/OpenAPI

---

## Database

Database:

* MySQL

---

## Deployment

Production menggunakan:

* Docker
* Docker Compose

Environment:

* Linux Server

---

# 8. Port Configuration

Tidak menggunakan port default.

Seluruh service menggunakan port unik 13xxx.

Contoh:

| Service             | Port  |
| ------------------- | ----- |
| Frontend Next.js    | 13001 |
| Backend Laravel API | 13002 |
| MySQL Database      | 13306 |
| Reverse Proxy       | 13080 |
| HTTPS Gateway       | 13443 |

Port final dapat disesuaikan saat deployment.

---

# 9. Database Design

## users

Menyimpan data pengguna.

Field utama:

* id
* name
* email
* password
* department_id
* role_id
* status

## departments

Master departemen.

Field:

* id
* name
* description

## daily_reports

Header laporan.

Field:

* id
* user_id
* department_id
* report_date
* status
* created_at

## daily_report_items

Detail aktivitas.

Field:

* id
* daily_report_id
* activity
* description
* target_date
* progress_status
* notes

## attachments

File pendukung.

Field:

* id
* daily_report_id
* filename
* path

---

# 10. Functional Requirement

## Authentication

System harus menyediakan:

* Login
* Logout
* Session management
* Password encryption

## Daily Report

User dapat:

* Membuat laporan
* Mengedit laporan sendiri
* Melihat histori laporan
* Melakukan pencarian

## Supervisor Monitoring

Supervisor dapat:

* Melihat laporan anggota departemen
* Filter berdasarkan tanggal
* Filter berdasarkan status

## Export

Support:

* Excel
* PDF
* Print

Flow:

```
User membuka laporan

        ↓

Preview Report

        ↓

Pilih:
- Export Excel
- Export PDF
- Print
```

---

# 11. UI/UX Requirement

Design Principle:

* Modern
* Clean
* Professional
* Efektif
* Mudah dipahami

Requirement:

* Tidak menggunakan sidebar tradisional yang terlalu penuh.
* Navigasi sederhana.
* Layout konsisten.
* Input form tidak terlalu besar.
* Typography jelas.
* Mobile friendly.

---

# 12. Security Requirement

Mitigasi keamanan:

## Authentication

* Password hashing.
* Token authentication.
* Session expiration.

## Authorization

Implementasi:

* Role Based Access Control.
* User hanya dapat mengakses data sesuai permission.

## API Security

* Request validation.
* Rate limiting.
* CORS configuration.
* API authentication.

## Database Security

* Prepared query.
* ORM protection.
* Backup database.

## Application Security

* Protection terhadap:

  * SQL Injection
  * XSS
  * CSRF
  * Unauthorized Access

---

# 13. Consistency Standard

Seluruh aplikasi harus mengikuti standar:

## Coding

* Struktur folder konsisten.
* Naming convention konsisten.
* Reusable component.

## UI

* Warna konsisten.
* Button style konsisten.
* Form style konsisten.
* Table style konsisten.

## API

Format response:

```json
{
    "success": true,
    "message": "",
    "data": {}
}
```

---

# 14. Testing Requirement

Minimal:

## Backend

* Unit Test
* Feature Test

## Frontend

* Component Testing
* Basic Functional Testing

## Security Testing

* Authentication test
* Permission test
* API validation test

---

# 15. Deployment Flow

Development:

```
Developer

↓

Local Environment

↓

Testing

↓

Production Server
```

Production:

```
Docker Compose

↓

Frontend Container

↓

Backend Container

↓

MySQL Container

↓

Reverse Proxy
```

---

# 16. Deliverables

Output project:

1. Source Code Frontend
2. Source Code Backend
3. Database Migration
4. API Documentation
5. Docker Configuration
6. User Manual sederhana
7. Deployment Guide

---

# 17. Success Criteria

Project dianggap berhasil apabila:

* User dapat membuat Daily Report digital.
* Supervisor dapat monitoring aktivitas.
* Data tersimpan terstruktur.
* Export laporan berjalan.
* Sistem dapat berjalan pada server production menggunakan Docker.
* Sistem aman dan mudah dikembangkan.
