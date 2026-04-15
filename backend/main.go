// main.go — Entry point simulasi Request-Response
//
// Aplikasi ini mensimulasikan model komunikasi Request-Response dalam sistem terdistribusi.
// Komponen sistem:
//   - Client   : Browser + React (port 5173) yang mengirim HTTP request
//   - Server   : Gin (port 8080) yang menerima, memproses, dan merespons
//   - Database : MySQL (sister2) yang menyimpan riwayat request dan response
//
// Alur komunikasi Request-Response:
//
//   [React Client]
//        │
//        │  HTTP Request (GET/POST/PUT/DELETE)
//        ▼
//   [Gin Server]   ←── menerima, validasi, routing
//        │
//        │  GORM query (INSERT sim_requests status=pending)
//        ▼
//   [MySQL DB]
//        │
//        │  Data tersimpan, server memproses (delay simulasi)
//        ▼
//   [Gin Server]   ←── generate response, simpan ke sim_responses
//        │
//        │  HTTP Response (JSON)
//        ▼
//   [React Client] ←── menerima response, update UI
//
// Karakteristik utama model ini:
//   - SINKRON: client memblokir dan menunggu response
//   - POINT-TO-POINT: satu client → satu server → satu response
//   - TIGHT COUPLING: client harus tahu alamat server
package main

import (
"log"
"os"

"github.com/gin-gonic/gin"
"github.com/joho/godotenv"

"sister-tugas2/reqres/config"
"sister-tugas2/reqres/handlers"
"sister-tugas2/reqres/middleware"
"sister-tugas2/reqres/models"
)

func main() {
// Muat konfigurasi dari .env
if err := godotenv.Load(); err != nil {
log.Println("[WARN] File .env tidak ditemukan, menggunakan environment variable")
}

// Koneksi ke MySQL
config.ConnectDatabase()

// Auto-migrate: buat tabel jika belum ada, atau update schema
// GORM akan membuat tabel sim_requests dan sim_responses secara otomatis
if err := config.DB.AutoMigrate(
&models.SimRequest{},
&models.SimResponse{},
); err != nil {
log.Fatalf("[MIGRATE] Gagal auto-migrate: %v", err)
}
log.Println("[MIGRATE] Tabel sim_requests dan sim_responses siap")

// Setup mode Gin
ginMode := os.Getenv("GIN_MODE")
if ginMode == "" {
ginMode = "debug"
}
gin.SetMode(ginMode)

// Inisialisasi router Gin
router := gin.Default()

// Pasang CORS middleware — wajib agar React (port 5173) bisa akses Gin (port 8080)
router.Use(middleware.CORSMiddleware())

// =====================
//  Registrasi Routes
// =====================
api := router.Group("/api")
{
// Health check — cek apakah server dan database aktif
api.GET("/status", handlers.GetStatus)

// Inti simulasi Request-Response
api.POST("/request", handlers.SendRequest)        // Kirim satu request
api.GET("/requests", handlers.GetRequests)        // Riwayat semua request
api.GET("/requests/:id", handlers.GetRequestDetail) // Detail satu siklus
api.DELETE("/requests", handlers.ClearRequests)   // Reset simulasi

// Statistik dan metrik
api.GET("/metrics", handlers.GetMetrics)
}

// Tentukan port server
port := os.Getenv("SERVER_PORT")
if port == "" {
port = "8080"
}

log.Printf("[SERVER] Gin berjalan di http://localhost:%s", port)
log.Printf("[SERVER] Frontend: http://localhost:5173")
log.Println("[SERVER] Model komunikasi: Request-Response")
log.Println("[SERVER] ========================================")
log.Println("[SERVER] Routes:")
log.Println("[SERVER]   GET    /api/status")
log.Println("[SERVER]   POST   /api/request")
log.Println("[SERVER]   GET    /api/requests")
log.Println("[SERVER]   GET    /api/requests/:id")
log.Println("[SERVER]   DELETE /api/requests")
log.Println("[SERVER]   GET    /api/metrics")
log.Println("[SERVER] ========================================")

if err := router.Run(":" + port); err != nil {
log.Fatalf("[SERVER] Gagal menjalankan server: %v", err)
}
}
