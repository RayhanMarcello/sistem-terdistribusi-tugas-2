package models

import "time"

// SimResponse merepresentasikan HTTP response yang dikembalikan server ke client.
// Setiap SimRequest memiliki tepat satu SimResponse (relasi 1-to-1).
//
// Dalam model Request-Response:
//   - Server selesai memproses request
//   - Server membuat response ini dan menyimpannya ke DB
//   - Response dikirimkan kembali ke client yang sama yang mengirim request
//
// Ini berbeda dengan Publish-Subscribe di mana:
//   - Tidak ada "response" langsung ke publisher
//   - Pesan diteruskan ke BANYAK consumer (fanout)
type SimResponse struct {
ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
RequestID        uint      `gorm:"not null;index" json:"request_id"`           // FK ke sim_requests
StatusCode       int       `gorm:"not null" json:"status_code"`                // 200 / 201 / 400 / 404 / 500
Body             string    `gorm:"type:text" json:"body"`                      // JSON response body
ProcessingTimeMS int       `json:"processing_time_ms"`                         // Waktu proses aktual (ms)
CreatedAt        time.Time `json:"created_at"`

// Relasi GORM: preload SimRequest saat query SimResponse
Request SimRequest `gorm:"foreignKey:RequestID" json:"request,omitempty"`
}

// TableName menentukan nama tabel MySQL secara eksplisit.
func (SimResponse) TableName() string {
return "sim_responses"
}
