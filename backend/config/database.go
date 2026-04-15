// Package config menyediakan koneksi database menggunakan GORM dan MySQL.
// Konfigurasi dibaca dari file .env menggunakan godotenv.
package config

import (
"fmt"
"log"
"os"

"gorm.io/driver/mysql"
"gorm.io/gorm"
"gorm.io/gorm/logger"
)

// DB adalah instance global GORM yang digunakan di seluruh aplikasi.
var DB *gorm.DB

// ConnectDatabase membuka koneksi ke MySQL menggunakan variabel dari .env.
// DSN (Data Source Name) dibentuk dari: user:pass@tcp(host:port)/dbname
func ConnectDatabase() {
user := os.Getenv("DB_USER")
pass := os.Getenv("DB_PASSWORD")
host := os.Getenv("DB_HOST")
port := os.Getenv("DB_PORT")
name := os.Getenv("DB_NAME")

if user == "" || host == "" || name == "" {
log.Fatal("[DB] Konfigurasi database tidak lengkap. Periksa file .env")
}

// Format DSN standar MySQL untuk GORM
// parseTime=True: agar GORM bisa memetakan DATETIME ke time.Time
// charset=utf8mb4: mendukung emoji dan karakter unicode penuh
dsn := fmt.Sprintf(
"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
user, pass, host, port, name,
)

db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
// Tampilkan query SQL di log (hanya mode debug)
Logger: logger.Default.LogMode(logger.Info),
})
if err != nil {
log.Fatalf("[DB] Gagal koneksi ke MySQL: %v\nDSN: %s", err, dsn)
}

log.Printf("[DB] Terhubung ke MySQL — database: %s @ %s:%s", name, host, port)
DB = db
}
