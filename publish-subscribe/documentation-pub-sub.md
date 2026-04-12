# Simulasi Publish-Subscribe dengan RabbitMQ 
## Tugas 2 — Sistem Terdistribusi | Skenario: E-commerce

---

## Gambaran Umum

```
[publisher.go]  ──publish──►  [RabbitMQ Exchange: fanout]
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼             ▼
             [inventory.queue]  [payment.queue]  [shipping.queue]  [notification.queue]
                    │                   │                   │             │
             [Inventory Svc]    [Payment Svc]    [Shipping Svc]  [Notification Svc]
                                  (consumers.go — goroutine per service)
```

### Konsep Golang yang Dimanfaatkan

| Fitur Golang    | Digunakan untuk                                         |
|-----------------|---------------------------------------------------------|
| `goroutine`     | Menjalankan banyak consumer service secara paralel      |
| `channel`       | Sinyal berhenti antar goroutine (`done <-chan struct{}`) |
| `select`        | Memilih antara pesan masuk atau sinyal shutdown         |
| `json.Marshal`  | Serialize struct ke JSON sebelum dikirim                |
| `json.Unmarshal`| Deserialize JSON dari RabbitMQ ke struct Go             |

---

## Cara Install & Menjalankan

### 1. Install RabbitMQ

**Windows:**
```
https://www.rabbitmq.com/install-windows.html
(install Erlang dulu, lalu RabbitMQ)
```

**macOS:**
```bash
brew install rabbitmq
brew services start rabbitmq
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
```

### 2. Jalankan Simulasi

Buka **2 terminal terpisah**:

**Terminal 1 — Jalankan semua Consumer:**
```bash
go run consumers.go --semua
```

Atau jalankan masing-masing di terminal berbeda:
```bash
go run consumers.go inventory
go run consumers.go payment
go run consumers.go shipping
go run consumers.go notification
```

**Terminal 2 — Jalankan Publisher:**
```bash
go run publisher.go              # demo otomatis 10 event
go run publisher.go --interaktif # pilih event sendiri
```

### Build binary (opsional)

```bash
go build -o publisher publisher.go
go build -o consumers consumers.go

./consumers --semua   # terminal 1
./publisher           # terminal 2
```

---

## Event Types & Siapa yang Menerimanya

| Event              | Inventory | Payment | Shipping | Notification |
|--------------------|:---------:|:-------:|:--------:|:------------:|
| order.created      |     ✔     |         |    ✔     |      ✔       |
| payment.success    |           |    ✔    |          |      ✔       |
| shipping.started   |           |         |    ✔     |      ✔       |
| order.cancelled    |     ✔     |    ✔    |          |      ✔       |

---

## Contoh Output

**publisher.go:**
```
[Publisher] Terhubung ke RabbitMQ — Exchange: 'ecommerce.exchange' (fanout)

[Publisher] ✔ Dikirim  | event=order.created        | order=ORD-142301-001 | produk=Laptop Gaming ASUS
[Publisher] ✔ Dikirim  | event=payment.success      | order=ORD-142303-002 | produk=Smartphone Samsung S24
```

**consumers.go (--semua):**
```
[Inventory Service]    #001 | 2025-04-12 14:23:01 | event=order.created   | order=ORD-142301-001
         → Stok 'Laptop Gaming ASUS' dikurangi 2 unit

[Notification Service] #001 | 2025-04-12 14:23:01 | event=order.created   | order=ORD-142301-001
         → Notif 'Pesanan diterima: Laptop Gaming ASUS' dikirim ke customer_421

[Payment Service]      #001 | 2025-04-12 14:23:03 | event=payment.success | order=ORD-142303-002
         → Transaksi Rp 8200000 dicatat untuk 'Smartphone Samsung S24'
```