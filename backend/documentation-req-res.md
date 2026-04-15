# Dokumentasi Simulasi Request-Response
## Tugas 2 — Sistem Terdistribusi | Model: Request-Response
### Golang + Gin + MySQL + React

---

## 1. Tujuan Simulasi

Simulasi ini bertujuan untuk memperlihatkan secara interaktif bagaimana **model komunikasi Request-Response** bekerja dalam sistem terdistribusi.

Model Request-Response adalah salah satu pola komunikasi paling fundamental di mana:
- **Client** mengirimkan permintaan (request) ke server
- **Server** memproses permintaan tersebut
- **Server** mengembalikan hasil pemrosesan (response) ke client yang sama
- Client **menunggu** (blocking) hingga response diterima

Skenario yang disimulasikan adalah sistem **e-commerce** yang mencakup:
- Mengambil daftar produk (GET)
- Membuat pesanan baru (POST)
- Memeriksa status pesanan (GET)
- Memperbarui status pesanan (PUT)
- Membatalkan pesanan (DELETE)
- Memeriksa status pembayaran (GET)

---

## 2. Model Komunikasi yang Dipilih: Request-Response

### Karakteristik Utama

| Karakteristik | Penjelasan |
|---|---|
| **Pola** | Sinkron — Client memblokir hingga response tiba |
| **Relasi** | Point-to-point: 1 client → 1 server → 1 response |
| **Coupling** | Tight coupling — client harus tahu alamat server |
| **Transparansi** | Client tahu persis server mana yang merespons |
| **Keandalan** | Jika server down, request langsung gagal |

### Alur Komunikasi

```
[React Client — port 5173]
       │
       │  1. HTTP Request (method: GET/POST/PUT/DELETE)
       │     Header: Content-Type: application/json
       │     Body: JSON payload (untuk POST/PUT/DELETE)
       ▼
[Gin Server — port 8080]
       │
       │  2. Routing: cocokkan URL ke handler yang sesuai
       │  3. Validasi request body (binding)
       │  4. Buat record SimRequest, simpan ke MySQL (status: pending)
       │  5. Simulasi processing delay (sleep sesuai konfigurasi)
       │  6. Tentukan apakah sukses atau error (berdasarkan error rate)
       │  7. Generate response body sesuai skenario
       │  8. Buat record SimResponse, simpan ke MySQL
       │  9. Update status SimRequest ke 'success' atau 'error'
       ▼
[MySQL Database — sister2]
       │
       │  Data tersimpan di:
       │    - Tabel sim_requests (riwayat request)
       │    - Tabel sim_responses (riwayat response)
       ▼
[Gin Server]
       │
       │  10. Format JSON response
       │  11. Set HTTP status code yang sesuai
       ▼
[React Client]
       12. Terima response, update UI, tampilkan di ResponsePanel
       13. Animasi FlowDiagram selesai
       14. Log ditambahkan ke LogPanel
       15. Metrics diperbarui dari database
```

---

## 3. Komponen Sistem

### 3.1 Client — React + Vite (port 5173)

**File-file:**
- `src/App.jsx` — Layout utama, state management, API calls
- `src/components/RequestPanel.jsx` — Kontrol pengiriman request
- `src/components/FlowDiagram.jsx` — Diagram animasi SVG alur komunikasi
- `src/components/ResponsePanel.jsx` — Tampilan response server
- `src/components/LogPanel.jsx` — Log real-time semua request
- `src/components/MetricsPanel.jsx` — Dashboard statistik
- `src/components/ComparisonPanel.jsx` — Perbandingan dengan Pub-Sub
- `src/index.css` — Design system dark mode

**Teknologi:**
- React 18 dengan Hooks (useState, useEffect, useCallback)
- Vite sebagai bundler
- SVG animasi native (tanpa library eksternal)
- Fetch API untuk HTTP communication

### 3.2 Server — Golang + Gin (port 8080)

**File-file:**
- `main.go` — Entry point, router setup, auto-migrate
- `config/database.go` — Koneksi GORM ke MySQL
- `models/request.go` — Struct SimRequest
- `models/response.go` — Struct SimResponse
- `handlers/simulation.go` — 6 handler API
- `middleware/cors.go` — CORS configuration

**Route yang tersedia:**
```
GET    /api/status        — Health check server dan database
POST   /api/request       — Kirim dan proses satu request simulasi
GET    /api/requests      — Riwayat semua request (limit: 50)
GET    /api/requests/:id  — Detail satu siklus request+response
DELETE /api/requests      — Hapus semua data simulasi
GET    /api/metrics       — Statistik agregat dari database
```

### 3.3 Database — MySQL (sister2)

**Tabel sim_requests:**
```sql
CREATE TABLE sim_requests (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id  VARCHAR(50)  NOT NULL,
  method     VARCHAR(10)  NOT NULL,   -- GET/POST/PUT/DELETE
  endpoint   VARCHAR(100) NOT NULL,
  scenario   VARCHAR(100),
  payload    TEXT,                    -- JSON body request
  status     VARCHAR(20) DEFAULT 'pending',  -- pending/success/error
  latency_ms INT DEFAULT 300,         -- delay simulasi (ms)
  error_rate DOUBLE DEFAULT 0,        -- 0.0 - 1.0
  created_at DATETIME(3)
);
```

**Tabel sim_responses:**
```sql
CREATE TABLE sim_responses (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id          BIGINT UNSIGNED NOT NULL,  -- FK ke sim_requests
  status_code         INT NOT NULL,              -- 200/201/400/500 dll
  body                TEXT,                      -- JSON response body
  processing_time_ms  INT,                       -- waktu proses aktual (ms)
  created_at          DATETIME(3),
  FOREIGN KEY (request_id) REFERENCES sim_requests(id)
);
```

---

## 4. Logika Simulasi

### 4.1 Simulasi Latency
```go
// Handler mensimulasikan delay pemrosesan
time.Sleep(time.Duration(body.LatencyMS) * time.Millisecond)
```
Nilai dapat dikonfigurasi dari UI: 100ms hingga 3000ms.

### 4.2 Simulasi Error Rate
```go
// Menentukan apakah request gagal berdasarkan probabilitas
isError := rand.Float64() < body.ErrorRate
```
Error rate dapat dikonfigurasi dari UI: 0% hingga 30%.

### 4.3 Respons per Skenario
Server memiliki template response untuk 6 skenario:
- `GET /products` → daftar 3 produk e-commerce
- `POST /order` → konfirmasi pembuatan order dengan ID unik
- `GET /order/status` → status dan nomor resi
- `PUT /order/update` → konfirmasi perubahan status
- `DELETE /order/cancel` → konfirmasi pembatalan dan refund
- `GET /payment/status` → detail status pembayaran

---

## 5. Cara Menjalankan

### Backend
```bash
cd backend
# Pastikan MySQL aktif dan database 'sister2' tersedia
# Edit .env sesuai konfigurasi
go run main.go
# Server berjalan di http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Buka http://localhost:5173
```

### Verifikasi
1. Buka browser ke http://localhost:5173
2. Header menampilkan status "Gin: :8080 online" (hijau)
3. Kirim satu request — amati animasi diagram
4. Periksa tab "Response" untuk melihat data dari server
5. Periksa tab "Perbandingan" untuk melihat perbedaan dengan Pub-Sub

---

## 6. Interpretasi Hasil

### Warna di Flow Diagram
| Warna | Arti |
|---|---|
| Abu-abu | Idle — belum ada aktivitas |
| Biru | Pengiriman request dari client ke server |
| Ungu | Request diterima dan diproses server |
| Kuning | Server sedang memproses (fase terlama) |
| Cyan | Interaksi dengan database MySQL |
| Hijau | Response berhasil dikembalikan ke client |
| Merah | Terjadi error (sesuai error rate) |

### Kode HTTP yang Muncul
| Kode | Makna |
|---|---|
| 200 OK | Request sukses (GET, PUT, DELETE) |
| 201 Created | Resource baru dibuat sukses (POST /order) |
| 408 Timeout | Server tidak merespons dalam batas waktu |
| 429 Too Many | Rate limit terlampaui |
| 500 Internal | Error internal server |
| 503 Unavailable | Service tidak tersedia sementara |

---

## 7. Perbedaan dengan Publish-Subscribe

| Aspek | Request-Response (proyek ini) | Pub-Sub (sister2) |
|---|---|---|
| Komunikasi | Sinkron, client menunggu | Asinkron, publisher tidak menunggu |
| Penerima | 1 server tertentu | Banyak consumer (fanout) |
| Coupling | Tight — client tahu server | Loose — publisher tidak tahu consumer |
| Message Broker | Tidak ada (HTTP langsung) | RabbitMQ sebagai perantara |
| Fault Tolerance | Rendah | Tinggi (message queue) |
| Use Case | Transaksi, query data | Event, notifikasi, streaming |

---

*Dokumentasi ini merupakan bagian dari Tugas 2 Sistem Terdistribusi.*
