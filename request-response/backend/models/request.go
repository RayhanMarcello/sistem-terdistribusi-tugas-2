// Package models mendefinisikan struktur data yang dipetakan ke tabel MySQL oleh GORM.
package models

import "time"

// SimRequest merepresentasikan sebuah HTTP request yang dikirimkan dalam simulasi.
// Setiap baris di tabel sim_requests = satu siklus request dari client.
//
// Dalam model Request-Response:
//   - Client mengirim request (baris ini dibuat)
//   - Server memprosesnya
//   - Server mengirim response (lihat SimResponse)
type SimRequest struct {
ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
ClientID  string    `gorm:"type:varchar(50);not null" json:"client_id"`  // Misal: "client-A", "browser-01"
Method    string    `gorm:"type:varchar(10);not null" json:"method"`     // GET / POST / PUT / DELETE
Endpoint  string    `gorm:"type:varchar(100);not null" json:"endpoint"`  // Target endpoint, misal: /api/products
Scenario  string    `gorm:"type:varchar(100)" json:"scenario"`           // Nama skenario simulasi
Payload   string    `gorm:"type:text" json:"payload"`                   // JSON body (kosong jika GET)
Status    string    `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending | success | error
LatencyMS int       `gorm:"default:300" json:"latency_ms"`               // Delay simulasi yang dikonfigurasi (ms)
ErrorRate float64   `gorm:"default:0" json:"error_rate"`                 // Peluang error 0.0 - 1.0
CreatedAt time.Time `json:"created_at"`
}

// TableName menentukan nama tabel MySQL secara eksplisit.
func (SimRequest) TableName() string {
return "sim_requests"
}
