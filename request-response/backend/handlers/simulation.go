// Package handlers berisi semua handler HTTP untuk simulasi Request-Response.
//
// Model Komunikasi Request-Response:
//   - Client (browser/React) mengirim HTTP request ke server
//   - Server (Gin) menerimanya, memprosesnya, dan mengembalikan response
//   - Komunikasi bersifat SINKRON: client MENUNGGU hingga response diterima
//   - Setiap request memiliki tepat SATU response (1-to-1)
//
// Ini berbeda fundamental dengan Publish-Subscribe:
//   - Pub-Sub: publisher tidak tahu siapa yang menerima pesannya
//   - Req-Res: client tahu persis server mana yang merespons
package handlers

import (
"encoding/json"
"fmt"
"math/rand"
"net/http"
"strconv"
"time"

"github.com/gin-gonic/gin"
"gorm.io/gorm"

"sister-tugas2/reqres/config"
"sister-tugas2/reqres/models"
)

// ---- Struktur Request Body ----

// SendRequestBody adalah payload JSON yang dikirim client ke POST /api/request
type SendRequestBody struct {
ClientID  string  `json:"client_id"`            // ID client pengirim
Method    string  `json:"method" binding:"required"` // GET/POST/PUT/DELETE
Endpoint  string  `json:"endpoint" binding:"required"` // Target endpoint simulasi
Scenario  string  `json:"scenario"`             // Nama skenario simulasi
Payload   string  `json:"payload"`              // JSON body (opsional, untuk POST/PUT)
LatencyMS int     `json:"latency_ms"`           // Delay simulasi 100-3000ms
ErrorRate float64 `json:"error_rate"`           // Peluang error 0.0-0.30
}

// ---- Skenario Simulasi ----

// scenarioResponses mendefinisikan response template untuk setiap kombinasi
// method + endpoint dalam skenario e-commerce.
//
// Skenario dipilih agar relevan dengan dunia nyata:
// - Sistem order produk
// - Cek status pembayaran
// - Update status pengiriman
// - Hapus/cancel order
var scenarioResponses = map[string]map[string]interface{}{
"GET /products": {
"status":  "success",
"message": "Data produk berhasil diambil",
"data": []map[string]interface{}{
{"id": "P001", "nama": "Laptop Gaming ASUS", "harga": 12500000, "stok": 15},
{"id": "P002", "nama": "Smartphone Samsung S24", "harga": 8200000, "stok": 30},
{"id": "P003", "nama": "Headphone Sony WH-1000", "harga": 3400000, "stok": 50},
},
"total": 3,
},
"POST /order": {
"status":   "created",
"message":  "Order berhasil dibuat",
"order_id": "",
"data": map[string]interface{}{
"status":   "pending_payment",
"estimasi": "2-3 hari kerja",
},
},
"GET /order/status": {
"status":  "success",
"message": "Status order ditemukan",
"data": map[string]interface{}{
"order_status": "shipping",
"resi":         "JNE123456789ID",
"estimasi":     "Besok tiba",
},
},
"PUT /order/update": {
"status":  "updated",
"message": "Status order berhasil diperbarui",
"data": map[string]interface{}{
"order_status_lama": "pending_payment",
"order_status_baru": "paid",
},
},
"DELETE /order/cancel": {
"status":  "cancelled",
"message": "Order berhasil dibatalkan",
"data": map[string]interface{}{
"refund_status": "akan diproses dalam 3-5 hari kerja",
},
},
"GET /payment/status": {
"status":  "success",
"message": "Status pembayaran ditemukan",
"data": map[string]interface{}{
"payment_status": "paid",
"metode":         "transfer bank",
"jumlah":         8200000,
},
},
}

// ---- Handler: POST /api/request ----

// SendRequest memproses sebuah request simulasi Request-Response secara penuh:
//  1. Validasi input dari client
//  2. Simpan request ke database (status: pending)
//  3. Simulasikan delay pemrosesan (sesuai LatencyMS)
//  4. Tentukan apakah request berhasil atau error (sesuai ErrorRate)
//  5. Generate response body berdasarkan skenario
//  6. Simpan response ke database
//  7. Update status request (success/error)
//  8. Kembalikan response ke client
//
// Inilah inti dari model Request-Response:
// Client MENUNGGU selama langkah 2-7 selesai, baru menerima hasilnya.
func SendRequest(c *gin.Context) {
var body SendRequestBody
if err := c.ShouldBindJSON(&body); err != nil {
c.JSON(http.StatusBadRequest, gin.H{
"error":   "Request body tidak valid",
"detail":  err.Error(),
"hint":    "Pastikan method dan endpoint terisi",
})
return
}

// Default nilai jika tidak diisi
if body.ClientID == "" {
body.ClientID = fmt.Sprintf("client-%03d", rand.Intn(999)+1)
}
if body.LatencyMS < 100 {
body.LatencyMS = 300
}
if body.LatencyMS > 5000 {
body.LatencyMS = 5000
}
if body.Scenario == "" {
body.Scenario = body.Method + " " + body.Endpoint
}

// LANGKAH 1: Simpan request ke database dengan status "pending"
// Ini mencatat bahwa client telah mengirim request dan server telah menerima
req := models.SimRequest{
ClientID:  body.ClientID,
Method:    body.Method,
Endpoint:  body.Endpoint,
Scenario:  body.Scenario,
Payload:   body.Payload,
Status:    "pending",
LatencyMS: body.LatencyMS,
ErrorRate: body.ErrorRate,
}
if err := config.DB.Create(&req).Error; err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan request: " + err.Error()})
return
}

// LANGKAH 2: Simulasi processing delay
// Ini merepresentasikan waktu server memproses request:
// - Query database internal
// - Kalkulasi bisnis
// - Validasi data
startTime := time.Now()
time.Sleep(time.Duration(body.LatencyMS) * time.Millisecond)
processingTime := int(time.Since(startTime).Milliseconds())

// LANGKAH 3: Tentukan apakah terjadi error berdasarkan error rate
isError := rand.Float64() < body.ErrorRate

var statusCode int
var responseBody map[string]interface{}

if isError {
// Simulasi berbagai jenis error server
errorCodes := []int{500, 503, 408, 429}
errorMessages := []string{
"Internal Server Error: layanan sementara tidak tersedia",
"Service Unavailable: server sedang overload",
"Request Timeout: server tidak merespons dalam batas waktu",
"Too Many Requests: rate limit terlampaui",
}
idx := rand.Intn(len(errorCodes))
statusCode = errorCodes[idx]
responseBody = map[string]interface{}{
"status":    "error",
"message":   errorMessages[idx],
"request_id": req.ID,
"timestamp": time.Now().Format(time.RFC3339),
}
} else {
// LANGKAH 4: Generate response sukses berdasarkan skenario
statusCode = determineStatusCode(body.Method)
scenarioKey := body.Method + " " + body.Endpoint

if template, ok := scenarioResponses[scenarioKey]; ok {
responseBody = cloneMap(template)
// Tambahkan data dinamis
if body.Method == "POST" {
responseBody["order_id"] = fmt.Sprintf("ORD-%s-%04d", time.Now().Format("150405"), req.ID)
}
} else {
responseBody = map[string]interface{}{
"status":  "success",
"message": fmt.Sprintf("Request %s %s berhasil diproses", body.Method, body.Endpoint),
}
}
responseBody["request_id"] = req.ID
responseBody["timestamp"] = time.Now().Format(time.RFC3339)
responseBody["server"] = "Gin v1 — Golang"
}

// LANGKAH 5: Simpan response ke database
bodyJSON, _ := json.Marshal(responseBody)
resp := models.SimResponse{
RequestID:        req.ID,
StatusCode:       statusCode,
Body:             string(bodyJSON),
ProcessingTimeMS: processingTime,
}
config.DB.Create(&resp)

// LANGKAH 6: Update status request dari "pending" ke "success" atau "error"
finalStatus := "success"
if isError {
finalStatus = "error"
}
config.DB.Model(&req).Update("status", finalStatus)

// LANGKAH 7: Kembalikan response ke client
// Ini adalah akhir dari siklus Request-Response
c.JSON(statusCode, gin.H{
"request": gin.H{
"id":        req.ID,
"client_id": req.ClientID,
"method":    req.Method,
"endpoint":  req.Endpoint,
"scenario":  req.Scenario,
"status":    finalStatus,
"latency_ms_configured": body.LatencyMS,
},
"response": gin.H{
"id":                resp.ID,
"status_code":       statusCode,
"processing_time_ms": processingTime,
"body":              responseBody,
},
"flow_steps": []string{
"1. Client mengirim " + body.Method + " request",
"2. Gin menerima dan memvalidasi request",
"3. Request disimpan ke MySQL (sim_requests)",
"4. Server memproses selama " + strconv.Itoa(processingTime) + "ms",
"5. Response dibuat dan disimpan ke MySQL (sim_responses)",
"6. Status request diperbarui ke: " + finalStatus,
"7. Response dikirim kembali ke client",
},
})
}

// ---- Handler: GET /api/requests ----

// GetRequests mengambil semua riwayat request dari database.
// Diurutkan dari terbaru, dengan pagination.
func GetRequests(c *gin.Context) {
limitStr := c.DefaultQuery("limit", "50")
limit, _ := strconv.Atoi(limitStr)
if limit <= 0 || limit > 100 {
limit = 50
}

var requests []models.SimRequest
result := config.DB.
Order("created_at DESC").
Limit(limit).
Find(&requests)

if result.Error != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
return
}

c.JSON(http.StatusOK, gin.H{
"data":  requests,
"count": len(requests),
})
}

// ---- Handler: GET /api/requests/:id ----

// GetRequestDetail mengambil detail satu request beserta response-nya.
// Ini menampilkan siklus lengkap satu Request-Response.
func GetRequestDetail(c *gin.Context) {
id := c.Param("id")

var req models.SimRequest
if err := config.DB.First(&req, id).Error; err != nil {
if err == gorm.ErrRecordNotFound {
c.JSON(http.StatusNotFound, gin.H{"error": "Request tidak ditemukan"})
} else {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
return
}

var resp models.SimResponse
config.DB.Where("request_id = ?", req.ID).First(&resp)

c.JSON(http.StatusOK, gin.H{
"request":  req,
"response": resp,
})
}

// ---- Handler: DELETE /api/requests ----

// ClearRequests menghapus semua data simulasi dari kedua tabel.
// Berguna untuk reset simulasi dan memulai dari awal.
func ClearRequests(c *gin.Context) {
// Hapus responses dulu (karena ada FK constraint ke requests)
config.DB.Exec("DELETE FROM sim_responses")
config.DB.Exec("DELETE FROM sim_requests")
// Reset auto-increment
config.DB.Exec("ALTER TABLE sim_responses AUTO_INCREMENT = 1")
config.DB.Exec("ALTER TABLE sim_requests AUTO_INCREMENT = 1")

c.JSON(http.StatusOK, gin.H{
"message": "Semua data simulasi berhasil dihapus",
"tables_cleared": []string{"sim_requests", "sim_responses"},
})
}

// ---- Handler: GET /api/metrics ----

// GetMetrics mengembalikan statistik agregat dari semua request yang tersimpan.
// Digunakan oleh MetricsPanel di frontend untuk menampilkan dashboard.
func GetMetrics(c *gin.Context) {
var totalRequests int64
var successRequests int64
var errorRequests int64
var pendingRequests int64

config.DB.Model(&models.SimRequest{}).Count(&totalRequests)
config.DB.Model(&models.SimRequest{}).Where("status = ?", "success").Count(&successRequests)
config.DB.Model(&models.SimRequest{}).Where("status = ?", "error").Count(&errorRequests)
config.DB.Model(&models.SimRequest{}).Where("status = ?", "pending").Count(&pendingRequests)

// Rata-rata latency dari semua response
var avgLatency float64
config.DB.Model(&models.SimResponse{}).Select("COALESCE(AVG(processing_time_ms), 0)").Scan(&avgLatency)

// Min dan max latency
var minLatency, maxLatency int
config.DB.Model(&models.SimResponse{}).Select("COALESCE(MIN(processing_time_ms), 0)").Scan(&minLatency)
config.DB.Model(&models.SimResponse{}).Select("COALESCE(MAX(processing_time_ms), 0)").Scan(&maxLatency)

// Breakdown per HTTP method
type MethodCount struct {
Method string
Count  int64
}
var methodBreakdown []MethodCount
config.DB.Model(&models.SimRequest{}).
Select("method, COUNT(*) as count").
Group("method").
Scan(&methodBreakdown)

// Hitung success rate
successRate := 0.0
if totalRequests > 0 {
successRate = float64(successRequests) / float64(totalRequests) * 100
}

// Ambil 10 request terakhir untuk chart throughput
var recentRequests []models.SimRequest
config.DB.Order("created_at DESC").Limit(10).Find(&recentRequests)

c.JSON(http.StatusOK, gin.H{
"total_requests":   totalRequests,
"success_requests": successRequests,
"error_requests":   errorRequests,
"pending_requests": pendingRequests,
"success_rate_pct": fmt.Sprintf("%.1f", successRate),
"avg_latency_ms":   fmt.Sprintf("%.0f", avgLatency),
"min_latency_ms":   minLatency,
"max_latency_ms":   maxLatency,
"method_breakdown": methodBreakdown,
"recent_requests":  recentRequests,
})
}

// ---- Handler: GET /api/status ----

// GetStatus adalah endpoint health check server.
// Client dapat menggunakan ini untuk memverifikasi server aktif sebelum simulasi.
func GetStatus(c *gin.Context) {
// Cek koneksi database
var dbStatus string
sqlDB, err := config.DB.DB()
if err != nil || sqlDB.Ping() != nil {
dbStatus = "disconnected"
} else {
dbStatus = "connected"
}

c.JSON(http.StatusOK, gin.H{
"server":    "online",
"database":  dbStatus,
"timestamp": time.Now().Format(time.RFC3339),
"model":     "Request-Response",
"tech_stack": gin.H{
"backend":  "Golang + Gin Framework",
"database": "MySQL + GORM",
"frontend": "React + Vite",
},
})
}

// ---- Fungsi Helper ----

// determineStatusCode menentukan HTTP status code yang sesuai berdasarkan method.
func determineStatusCode(method string) int {
switch method {
case "POST":
return http.StatusCreated // 201
case "DELETE":
return http.StatusOK // 200
default:
return http.StatusOK // 200
}
}

// cloneMap membuat salinan dangkal (shallow copy) dari map untuk menghindari
// modifikasi pada template yang bersifat global.
func cloneMap(src map[string]interface{}) map[string]interface{} {
dst := make(map[string]interface{})
for k, v := range src {
dst[k] = v
}
return dst
}
