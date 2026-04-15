// Package middleware berisi middleware Gin yang digunakan di semua route.
package middleware

import (
"os"
"strings"
"time"

"github.com/gin-contrib/cors"
"github.com/gin-gonic/gin"
)

// CORSMiddleware mengkonfigurasi Cross-Origin Resource Sharing.
// Ini diperlukan agar React (port 5173) bisa mengakses Gin (port 8080).
//
// Dalam simulasi Request-Response, browser adalah "client" dan Gin adalah "server".
// CORS adalah mekanisme keamanan browser yang harus dikonfigurasi di server side.
func CORSMiddleware() gin.HandlerFunc {
allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
origins := strings.Split(allowedOrigins, ",")
if len(origins) == 0 || origins[0] == "" {
origins = []string{"http://localhost:5173"}
}

return cors.New(cors.Config{
AllowOrigins:     origins,
AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
ExposeHeaders:    []string{"Content-Length"},
AllowCredentials: true,
MaxAge:           12 * time.Hour,
})
}
