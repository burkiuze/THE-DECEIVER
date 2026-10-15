// The Deceiver masaüstü başlatıcısı.
//
// Oyun dosyaları exe'nin içine gömülüdür. Başlatıcı bunları yalnızca bu bilgisayardan
// erişilebilen küçük bir yerel sunucuyla (127.0.0.1) sunar ve oyunu kendi penceresinde
// açar (Windows'ta WebView2). Pencere kapanınca program da kapanır.
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync/atomic"
	"time"
)

//go:embed all:game
var gameFS embed.FS

const (
	appName   = "The Deceiver"
	fixedPort = 47321 // sabit port: kayıtlar (localStorage) adrese bağlıdır
)

var lastPing atomic.Int64

func main() {
	for ext, typ := range map[string]string{
		".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
		".css": "text/css; charset=utf-8", ".png": "image/png", ".woff2": "font/woff2",
		".txt": "text/plain; charset=utf-8", ".json": "application/json",
	} {
		_ = mime.AddExtensionType(ext, typ)
	}

	sub, err := fs.Sub(gameFS, "game")
	if err != nil {
		fail("Oyun dosyaları okunamadı: " + err.Error())
	}

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", fixedPort))
	if err != nil {
		// Oyun zaten açıksa o pencereyi öne getir.
		if isOurs(fmt.Sprintf("http://127.0.0.1:%d/", fixedPort)) {
			focusExisting()
			return
		}
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			fail("Yerel sunucu başlatılamadı: " + err.Error())
		}
	}
	url := fmt.Sprintf("http://%s/", ln.Addr().String())

	files := http.FileServer(http.FS(sub))
	mux := http.NewServeMux()
	mux.HandleFunc("/__ping", func(w http.ResponseWriter, r *http.Request) {
		lastPing.Store(time.Now().UnixNano())
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-App", "the-deceiver")
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r)
	})
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = srv.Serve(ln) }()

	runWindow(url)
}

func isOurs(url string) bool {
	c := http.Client{Timeout: 2 * time.Second}
	res, err := c.Get(url + "__ping")
	if err != nil {
		return false
	}
	res.Body.Close()
	return res.Header.Get("X-App") == "the-deceiver"
}

func dataDir() string {
	if d := os.Getenv("LocalAppData"); d != "" {
		return filepath.Join(d, "TheDeceiver")
	}
	if d, err := os.UserCacheDir(); err == nil {
		return filepath.Join(d, "TheDeceiver")
	}
	return filepath.Join(os.TempDir(), "TheDeceiver")
}

func fail(msg string) {
	showError(appName, msg)
	os.Exit(1)
}
