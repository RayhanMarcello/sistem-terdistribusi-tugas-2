package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	rabbitmqURL  = "amqp://guest:guest@localhost:5672/"
	exchangeName = "ecommerce.exchange"
	exchangeType = "fanout"
)

type Produk struct {
	ID    string
	Nama  string
	Harga int
}

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

// Data Dummy
var produkList = []Produk{
	{ID: "P001", Nama: "Laptop Gaming ASUS", Harga: 12500000},
	{ID: "P002", Nama: "Smartphone Samsung S24", Harga: 8200000},
	{ID: "P003", Nama: "Headphone Sony WH-1000", Harga: 3400000},
	{ID: "P004", Nama: "Kamera Canon EOS R50", Harga: 9800000},
	{ID: "P005", Nama: "Smartwatch Apple Watch", Harga: 5600000},
}

var eventTypes = []string{
	"order.created",
	"payment.success",
	"shipping.started",
	"order.cancelled",
}

// Koneksi RabbitMQ

func connectRabbitMQ() (*amqp.Connection, *amqp.Channel, error) {
	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		return nil, nil, fmt.Errorf("gagal koneksi: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("gagal buka channel: %w", err)
	}

	// fanout = pesan disiarkan ke SEMUA queue yang terikat
	err = ch.ExchangeDeclare(
		exchangeName, // nama exchange
		exchangeType, // tipe: fanout
		true,         // durable: tetap ada saat RabbitMQ restart
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("gagal deklarasi exchange: %w", err)
	}

	fmt.Printf("[Publisher] Terhubung ke RabbitMQ — Exchange: '%s' (fanout)\n", exchangeName)
	return conn, ch, nil
}

//Buat & Kirim Pesan

func buatEvent(eventType, orderID string, produk Produk) OrderEvent {
	return OrderEvent{
		EventType: eventType,
		OrderID:   orderID,
		Timestamp: time.Now().Format("2006-01-02T15:04:05"),
		Payload: OrderPayload{
			ProdukID:   produk.ID,
			NamaProduk: produk.Nama,
			Harga:      produk.Harga,
			Quantity:   rand.Intn(3) + 1,
			Customer:   fmt.Sprintf("customer_%d", rand.Intn(900)+100),
			Alamat:     "Jl. Contoh No.12, Balikpapan, Kalimantan Timur",
		},
	}
}

func publishEvent(ch *amqp.Channel, event OrderEvent) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("gagal marshal JSON: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = ch.PublishWithContext(
		ctx,
		exchangeName, // exchange tujuan
		"",           // routing key (diabaikan pada fanout)
		false,        // mandatory
		false,        // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent, // pesan tidak hilang saat restart
			Body:         body,
		},
	)
	if err != nil {
		return fmt.Errorf("gagal publish: %w", err)
	}

	fmt.Printf("[Publisher] ✔ Dikirim  | event=%-22s | order=%s | produk=%s\n",
		event.EventType, event.OrderID, event.Payload.NamaProduk)
	return nil
}

//Mode Demo Otomatis

func jalankanDemoOtomatis(jumlah int, jeda time.Duration) {
	conn, ch, err := connectRabbitMQ()
	if err != nil {
		log.Fatalf("Koneksi gagal: %v", err)
	}
	defer conn.Close()
	defer ch.Close()

	fmt.Printf("\n[Publisher] Memulai demo — mengirim %d event...\n\n", jumlah)

	for i := 1; i <= jumlah; i++ {
		produk := produkList[rand.Intn(len(produkList))]
		eventType := eventTypes[rand.Intn(len(eventTypes))]
		orderID := fmt.Sprintf("ORD-%s-%03d", time.Now().Format("150405"), i)

		event := buatEvent(eventType, orderID, produk)
		if err := publishEvent(ch, event); err != nil {
			log.Printf("ERROR: %v", err)
		}

		time.Sleep(jeda)
	}

	fmt.Println("\n[Publisher] Semua event telah dikirim. Koneksi ditutup.")
}

//Mode Interaktif

func jalankanInteraktif() {
	conn, ch, err := connectRabbitMQ()
	if err != nil {
		log.Fatalf("Koneksi gagal: %v", err)
	}
	defer conn.Close()
	defer ch.Close()

	scanner := bufio.NewScanner(os.Stdin)
	counter := 1

	for {
		fmt.Println(strings.Repeat("─", 55))
		fmt.Println("Pilih Event Type:")
		for i, et := range eventTypes {
			fmt.Printf("  %d. %s\n", i+1, et)
		}
		fmt.Println("  q. Keluar")
		fmt.Print("Pilihan event (1-4 / q): ")

		scanner.Scan()
		input := strings.TrimSpace(scanner.Text())
		if input == "q" {
			break
		}

		idx, err := strconv.Atoi(input)
		if err != nil || idx < 1 || idx > len(eventTypes) {
			// fmt.Println("Pilihan tidak valid.\n")
			continue
		}
		eventType := eventTypes[idx-1]

		fmt.Println("\nPilih Produk:")
		for i, p := range produkList {
			fmt.Printf("  %d. %s — Rp %s\n", i+1, p.Nama, formatRupiah(p.Harga))
		}
		fmt.Print("Pilihan produk (1-5): ")

		scanner.Scan()
		pIdx, err := strconv.Atoi(strings.TrimSpace(scanner.Text()))
		if err != nil || pIdx < 1 || pIdx > len(produkList) {
			// fmt.Println("Pilihan tidak valid.\n")
			continue
		}

		produk := produkList[pIdx-1]
		orderID := fmt.Sprintf("ORD-%s-%03d", time.Now().Format("150405"), counter)
		counter++

		event := buatEvent(eventType, orderID, produk)
		if err := publishEvent(ch, event); err != nil {
			log.Printf("ERROR: %v", err)
		}
		fmt.Println()
	}

	fmt.Println("[Publisher] Koneksi ditutup.")
}

func formatRupiah(n int) string {
	s := strconv.Itoa(n)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return result
}

func main() {
	rand.Seed(time.Now().UnixNano())

	if len(os.Args) > 1 && os.Args[1] == "--interaktif" {
		jalankanInteraktif()
	} else {
		jalankanDemoOtomatis(10, 1500*time.Millisecond)
	}
}
