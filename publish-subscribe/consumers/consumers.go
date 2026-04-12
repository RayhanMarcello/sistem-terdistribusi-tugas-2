package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	rabbitmqURL  = "amqp://guest:guest@localhost:5672/"
	exchangeName = "ecommerce.exchange"
	exchangeType = "fanout"
)

type OrderPayload struct {
	ProdukID   string `json:"produk_id"`
	NamaProduk string `json:"nama_produk"`
	Harga      int    `json:"harga"`
	Quantity   int    `json:"quantity"`
	Customer   string `json:"customer"`
	Alamat     string `json:"alamat"`
}

type OrderEvent struct {
	EventType string       `json:"event_type"`
	OrderID   string       `json:"order_id"`
	Timestamp string       `json:"timestamp"`
	Payload   OrderPayload `json:"payload"`
}

type ServiceConfig struct {
	Queue      string
	Label      string
	Warna      string // ANSI color code
	Subscribed []string
}

var services = map[string]ServiceConfig{
	"inventory": {
		Queue:      "inventory.queue",
		Label:      "Inventory Service",
		Warna:      "\033[36m", // cyan
		Subscribed: []string{"order.created", "order.cancelled"},
	},
	"payment": {
		Queue:      "payment.queue",
		Label:      "Payment Service",
		Warna:      "\033[32m", // hijau
		Subscribed: []string{"payment.success", "order.cancelled"},
	},
	"shipping": {
		Queue:      "shipping.queue",
		Label:      "Shipping Service",
		Warna:      "\033[33m", // kuning
		Subscribed: []string{"shipping.started", "order.created"},
	},
	"notification": {
		Queue:      "notification.queue",
		Label:      "Notification Service",
		Warna:      "\033[35m", // magenta
		Subscribed: []string{"order.created", "payment.success", "shipping.started", "order.cancelled"},
	},
}

const reset = "\033[0m"
const bold = "\033[1m"

//Logika Pemrosesan Event

func prosesEvent(serviceID string, event OrderEvent) string {
	p := event.Payload
	total := p.Harga * p.Quantity

	aksiMap := map[string]map[string]string{
		"inventory": {
			"order.created":   fmt.Sprintf("Stok '%s' dikurangi %d unit", p.NamaProduk, p.Quantity),
			"order.cancelled": fmt.Sprintf("Stok '%s' dikembalikan %d unit", p.NamaProduk, p.Quantity),
		},
		"payment": {
			"payment.success": fmt.Sprintf("Transaksi Rp %d dicatat untuk '%s'", total, p.NamaProduk),
			"order.cancelled": fmt.Sprintf("Refund Rp %d diproses", total),
		},
		"shipping": {
			"order.created":    fmt.Sprintf("Alamat pengiriman '%s' disiapkan", p.NamaProduk),
			"shipping.started": fmt.Sprintf("Resi pengiriman '%s' dibuat — %d item", p.NamaProduk, p.Quantity),
		},
		"notification": {
			"order.created":    fmt.Sprintf("Notif 'Pesanan diterima: %s' dikirim ke %s", p.NamaProduk, p.Customer),
			"payment.success":  fmt.Sprintf("Notif 'Pembayaran berhasil: Rp %d' dikirim", p.Harga),
			"shipping.started": "Notif 'Paketmu sedang dikirim!' dikirim ke customer",
			"order.cancelled":  "Notif 'Pesanan dibatalkan' dikirim ke customer",
		},
	}

	if svcMap, ok := aksiMap[serviceID]; ok {
		if aksi, ok := svcMap[event.EventType]; ok {
			return aksi
		}
	}
	return fmt.Sprintf("Event '%s' diterima (tidak ada aksi khusus)", event.EventType)
}

// Cek apakah event di-subscribe

func isSubscribed(cfg ServiceConfig, eventType string) bool {
	for _, et := range cfg.Subscribed {
		if et == eventType {
			return true
		}
	}
	return false
}

// Jalankan Satu Consumer

func jalankanConsumer(serviceID string, done <-chan struct{}) {
	cfg, ok := services[serviceID]
	if !ok {
		log.Fatalf("Service '%s' tidak dikenal. Pilihan: inventory, payment, shipping, notification", serviceID)
	}

	// Koneksi ke RabbitMQ
	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Fatalf("[%s] Gagal koneksi: %v", cfg.Label, err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("[%s] Gagal buka channel: %v", cfg.Label, err)
	}
	defer ch.Close()

	err = ch.ExchangeDeclare(exchangeName, exchangeType, true, false, false, false, nil)
	if err != nil {
		log.Fatalf("[%s] Gagal deklarasi exchange: %v", cfg.Label, err)
	}

	q, err := ch.QueueDeclare(cfg.Queue, true, false, false, false, nil)
	if err != nil {
		log.Fatalf("[%s] Gagal deklarasi queue: %v", cfg.Label, err)
	}

	// Binding: hubungkan queue ke exchange
	// Pada fanout, semua queue yang terikat menerima SALINAN pesan yang sama
	err = ch.QueueBind(q.Name, "", exchangeName, false, nil)
	if err != nil {
		log.Fatalf("[%s] Gagal binding queue: %v", cfg.Label, err)
	}

	// Prefetch: proses 1 pesan per gilir
	ch.Qos(1, 0, false)

	// Mulai consume
	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("[%s] Gagal consume: %v", cfg.Label, err)
	}

	fmt.Printf("%s%s[%s]%s%s Terhubung — Queue: '%s'\n  Subscribe ke: %v\n  Menunggu pesan... (Ctrl+C untuk berhenti)%s\n\n",
		cfg.Warna, bold, cfg.Label, reset, cfg.Warna, cfg.Queue, cfg.Subscribed, reset)

	counter := 0

	for {
		select {
		case <-done:
			fmt.Printf("%s%s[%s]%s%s Dihentikan.%s\n", cfg.Warna, bold, cfg.Label, reset, cfg.Warna, reset)
			return

		case msg, ok := <-msgs:
			if !ok {
				return
			}

			var event OrderEvent
			if err := json.Unmarshal(msg.Body, &event); err != nil {
				fmt.Printf("%s[%s] ERROR: Pesan bukan JSON valid%s\n", cfg.Warna, cfg.Label, reset)
				msg.Ack(false)
				continue
			}

			// Filter: lewati event yang tidak di-subscribe
			if !isSubscribed(cfg, event.EventType) {
				msg.Ack(false)
				continue
			}

			// Simulasi waktu pemrosesan
			time.Sleep(300 * time.Millisecond)

			counter++
			aksi := prosesEvent(serviceID, event)

			fmt.Printf("%s%s[%s]%s%s #%03d | %s | event=%-22s | order=%s\n         → %s%s\n",
				cfg.Warna, bold, cfg.Label, reset, cfg.Warna,
				counter, event.Timestamp, event.EventType, event.OrderID,
				aksi, reset)

			// ACK: beritahu RabbitMQ pesan sudah berhasil diproses
			msg.Ack(false)
		}
	}
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Penggunaan:")
		fmt.Println("  go run consumers.go <service>")
		fmt.Println("  go run consumers.go --semua")
		fmt.Println("\nService tersedia: inventory, payment, shipping, notification")
		os.Exit(0)
	}

	arg := os.Args[1]

	done := make(chan struct{})
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	if arg == "--semua" {
		fmt.Printf("%s[Sistem] Menjalankan semua consumer services...%s\n\n", bold, reset)

		// Jalankan setiap service dalam goroutine terpisah
		for serviceID := range services {
			go jalankanConsumer(serviceID, done)
			time.Sleep(200 * time.Millisecond)
		}

		fmt.Printf("%s[Sistem] Semua service aktif. Tekan Ctrl+C untuk berhenti.%s\n\n", bold, reset)
		<-quit
		close(done)
		time.Sleep(500 * time.Millisecond) // beri waktu goroutine done

	} else {
		go jalankanConsumer(arg, done)
		<-quit
		close(done)
		time.Sleep(300 * time.Millisecond)
	}

	fmt.Printf("\n%s[Sistem] Semua consumer dihentikan.%s\n", bold, reset)
}
