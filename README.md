# Simulasi Model Komunikasi - Sistem Terdistribusi

Repository ini berisi simulasi interaktif dari dua model komunikasi fundamental dalam sistem terdistribusi: **Request-Response** dan **Publish-Subscribe**. Proyek ini dibuat sebagai pemenuhan untuk **Tugas 2 mata kuliah Sistem Terdistribusi**.

---

## 1. Model Request-Response

Model **Request-Response** mendemonstrasikan pola komunikasi **sinkron, point-to-point**, dan berpautan erat (_tightly coupled_). Pada model ini, *client* memulai komunikasi dengan secara langsung memanggil *server*, dan harus menunggu (memblokir eksekusi) sampai *server* mengembalikan respon atau mengalami *timeout/error*.

### 💻 Arsitektur (Direktori: `backend` & `frontend`)
- **Backend (Server):** Ditulis dalam **Golang** menggunakan framework **Gin**. Menjalankan server HTTP di port `:8081` dan mengakses database.
- **Frontend (Client):** Ditulis menggunakan **React + Vite**. Menampilkan antarmuka interaktif dan diagram animasi aliran data (*flow*) secara _real-time_.
- **Database:** Memanfaatkan **MySQL** (lewat GORM) yang menyimpan log *Request* serta respons yang diberikan dalam simulasi ini (tabel `sim_requests` & `sim_responses`).

### ⚙️ Fitur Utama Simulasi
- Visualisasi Diagram Animasi aliran *request-response* dari Client -> Server -> Database -> Server -> Client.
- Konfigurasi nilai *Latency Simulator* secara live (100ms - 3000ms).
- Konfigurasi *Error Rate* (0% - 30%) yang menunjukkan toleransi kegagalan (*fault tolerance*) rendah khas sistem *Request-Response*.
- Pengujian API transaksi (GET endpoint, POST data order, PUT update data, dll).
- Metrik analitik (Jumlah Request, Rata-rata *Latency*, % Sukses, dll.) hasil tangkapan dari log interaksi di MySQL.

### 🚀 Cara Menjalankan
1. Pastikan dependensi Go, Node, dan MySQL berjalan (`DB_NAME=sister2`).
2. Masuk ke direktori `backend` dan jalankan: `go run main.go`
3. Buka terminal baru, masuk ke direktori `frontend`, jalankan: `npm run dev`
4. Buka `http://localhost:5173` di browser.

---

## 2. Model Publish-Subscribe (Pub-Sub)

Model **Publish-Subscribe** mendemonstrasikan pola komunikasi **asinkron, fanout (1-to-many)**, dan berpautan longgar (_loosely coupled_). Pada model ini, pengirim pesan (*Publisher*) tidak peduli siapa yang menerima pesannya, ia hanya menyiarkan pesannya (*event*) ke dalam sebuah saluran (*Message Broker*). *Subscriber* (Consumer) yang berlangganan pada saluran tersebut akan otomatis menerima *event* dan memprosesnya secara paralel.

### 💻 Arsitektur (Direktori: `publish-subscribe`)
- **Bahasa Pemrograman:** Golang murni.
- **Message Broker:** Memanfaatkan **RabbitMQ** dengan konfigurasi tipe *Exchange Fanout* (`ecommerce_events`).
- **Publisher:** Mengemisikan *event* e-commerce (mis: `order.created`, `payment.success`).
- **Consumers (Subscribers):** Tersedia 4 layanan simulasi (*Microservices*) yang dijalankan via *Goroutines*:
  1. `InventoryService`: bereaksi mengatur ketersediaan stok.
  2. `PaymentService`: bereaksi memastikan pembayaran terdata.
  3. `ShippingService`: bereaksi mendelegasikan alamat logistik.
  4. `NotificationService`: bereaksi mengirim e-mail pelanggan.

### ⚙️ Fitur Utama Simulasi
- Menampilkan jalannya komunikasi **asinkron** dan independensinya (tidak ada konsumen yang saling menunggu, Publisher tidak *blocking* menunggu balasan).
- Menggarisbawahi kegunaan arsitektur penanganan *Event-Driven* pada E-Commerce.
- Jika satu *consumer* sibuk/mengalami kegagalan lokal, itu tidak akan membuat seluruh alur Publisher tertunda / *crash* (High *Fault-Tolerance* & *Buffering*).

### 🚀 Cara Menjalankan
1. Pastikan *server* atau wadah sistem RabbitMQ lokal Anda aktif pada port `:5672`.
2. Masuk ke direktori `publish-subscribe`, jalankan *consumers* terlebih dahulu:
   `go run consumers/consumers.go --semua`
3. Buka terminal baru dan jalankan simulasi pengiriman pesan oleh *Publisher*:
   `go run publisher/publisher.go`
4. Amati output paralel dari 4 service yang mengolah *event* e-commerce secara langsung di Terminal consumer Anda.

---

## Kesimpulan: Perbandingan Singkat

| Aspek | Request-Response | Publish-Subscribe |
|---|---|---|
| **Pola Relasi** | Sinkron, Meminta & Menunggu Eksekusi (1:1) | Asinkron, Siaran & Penangkapan (1:Many) |
| **Ketergantungan Alamat**| *Tightly Coupled* (harus tau IP tujuan) | *Loosely Coupled* (hanya butuh tau Broker channel)|
| **Kelebihan** | Sederhana, Laporan Transaksional Sukses/Gagal Jelas seketika | Skalabilitas parallel Tinggi, Kuat menahan kegagalan sementara (*Buffering*) |
| **Digunakan Saat...** | Menggambil data CRUD, interaksi *Database*, Konfirmasi Final | Notifikasi Beragam Layanan, Sinkronisasi *Microservice*, *Webhooks* Latar Belakang |

_Tugas 2 Sistem Terdistribusi - Rayhan Marcello_
