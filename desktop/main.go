// The Deceiver masaüstü başlatıcısı.
//
// Oyun dosyaları exe'nin içine gömülüdür. Başlatıcı bunları yalnızca bu bilgisayardan
// erişilebilen küçük bir yerel sunucuyla (127.0.0.1) sunar ve oyunu Edge/Chrome'un
// "uygulama" penceresinde açar. Pencere kapanınca (ya da oyun sekmesi kalp atışı
// göndermeyi bırakınca) başlatıcı da kapanır.
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync/atomic"
	"time"
)

//go:embed all:game
var gameFS embed.FS

const (
	appName      = "The Deceiver"
	fixedPort    = 47321 // sabit port: kayıtlar (localStorage) adrese bağlıdır
	firstPingMax = 90 * time.Second
	pingTimeout  = 150 * time.Second
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
		// Oyun zaten açıksa yeni pencereyi aynı adrese yönlendir.
		url := fmt.Sprintf("http://127.0.0.1:%d/", fixedPort)
		if isOurs(url) {
			openWindow(url)
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

	started := time.Now()
	windowDone := openWindow(url)

	for {
		time.Sleep(time.Second)
		lp := lastPing.Load()
		if lp == 0 {
			if time.Since(started) > firstPingMax {
				if windowDone == nil {
					fail("Oyun penceresi açılamadı. Tarayıcında şu adresi açmayı dene:\n" + url)
				}
				return
			}
			continue
		}
		// Kendi penceremiz kapandıysa hemen çık; aksi halde kalp atışını bekle.
		if windowDone != nil {
			select {
			case <-windowDone:
				if time.Since(started) > 5*time.Second {
					return
				}
				windowDone = nil // pencere başka bir Edge sürecine devredildi
			default:
			}
		}
		if time.Since(time.Unix(0, lp)) > pingTimeout {
			return
		}
	}
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

// openWindow oyunu uygulama penceresinde açar. Pencere sürecini izleyebiliyorsa
// süreç bitince kapanan bir kanal döndürür; varsayılan tarayıcıya düştüyse nil.
func openWindow(url string) <-chan struct{} {
	if bin := findBrowser(); bin != "" {
		profile := filepath.Join(dataDir(), "browser")
		_ = os.MkdirAll(profile, 0o755)
		cmd := exec.Command(bin,
			"--app="+url,
			"--user-data-dir="+profile,
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-features=Translate,msEdgeSidebarV2,msHubApps",
			"--window-size=1280,800",
		)
		if err := cmd.Start(); err == nil {
			done := make(chan struct{})
			go func() { _ = cmd.Wait(); close(done) }()
			return done
		}
	}
	if err := openDefault(url); err != nil {
		fail("Tarayıcı açılamadı. Şu adresi elle aç:\n" + url)
	}
	return nil
}

func findBrowser() string {
	var cands []string
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LocalAppData"} {
		base := os.Getenv(env)
		if base == "" {
			continue
		}
		cands = append(cands,
			filepath.Join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(base, "Google", "Chrome", "Application", "chrome.exe"),
		)
	}
	if extra := os.Getenv("DECEIVER_BROWSER"); extra != "" {
		cands = append([]string{extra}, cands...)
	}
	for _, c := range cands {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	for _, name := range []string{"msedge", "chrome", "chromium", "google-chrome"} {
		if p, err := exec.LookPath(name); err == nil {
			return p
		}
	}
	return ""
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
